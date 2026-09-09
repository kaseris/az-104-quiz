import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { uptime } from 'node:os';
import { questions } from '../content/questions.js';
import { blueprint, domains, objectives, skills, mappingVersion } from '../content/catalog.js';
import { mapping } from '../content/mappings.js';
import { migrate, schemaVersion } from './migrations.js';
import { learning } from './learning.js';
import { select, examSelect, schedulerVersion, examWeights, random } from './scheduler.js';
import {
  ensure,
  validateBank,
  validateSelection,
  sameSelection,
  validateDuration,
} from './validation.js';
const json = JSON.stringify;
const confidenceValues = [null, 'unsure', 'somewhat-sure', 'confident'];
export class StudyStore {
  constructor(
    filename,
    bank = questions,
    clock = {
      wall: () => Date.now(),
      mono: () => performance.now(),
      uptime: () => uptime() * 1000,
    },
  ) {
    validateBank(bank);
    this.bank = bank.map((q) => ({ ...q, ...mapping(q) }));
    this.clock = clock;
    this.anchors = new Map();
    this.db = new DatabaseSync(filename);
    try {
      ensure(
        this.db.prepare('PRAGMA user_version').get().user_version <= schemaVersion,
        'This database was created by a newer app. Reopen it with that version; your profile was not changed.',
      );
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      migrate(this.db, filename);
      this.publicBank = this.bank;
      this.refreshBank();
      this.reconcileCorrections();
      this.enforceTime();
    } catch (e) {
      this.db.close();
      throw e;
    }
  }
  refreshBank() {
    this.bank = [
      ...this.publicBank,
      ...this.db
        .prepare(
          'SELECT data FROM generated_questions UNION ALL SELECT data FROM portable_questions',
        )
        .all()
        .map((r) => JSON.parse(r.data)),
    ];
  }
  close() {
    this.trackExamDuration();
    this.db.close();
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const v = fn();
      this.db.exec('COMMIT');
      return v;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  now() {
    return new Date(this.clock.wall()).toISOString();
  }
  setting(key) {
    const r = this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);
    return r ? JSON.parse(r.value) : null;
  }
  setSetting(key, value) {
    this.db
      .prepare(
        'INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, json(value));
  }
  activeId() {
    return this.db.prepare('SELECT id FROM sessions WHERE completed_at IS NULL').get()?.id ?? null;
  }
  excluded(q, selection = false) {
    if (
      this.bank.some(
        (current) => current.id === q.id && current.correctsVersions?.includes(q.version),
      )
    )
      return true;
    return !!this.db
      .prepare(
        "SELECT 1 FROM issues WHERE question_id=? AND (status='retired' OR (version=? AND status='corrected') OR (status='pending' AND (version=? OR ?=1))) LIMIT 1",
      )
      .get(q.id, q.version, q.version, Number(selection));
  }
  eligible() {
    return this.bank.filter((q) => !this.excluded(q, true));
  }
  evidence() {
    return this.db
      .prepare(
        'SELECT i.*,s.mode FROM session_items i JOIN sessions s ON s.id=i.session_id WHERE submitted_at IS NOT NULL ORDER BY submitted_at,session_id,position',
      )
      .all()
      .map((i) => {
        const q = JSON.parse(i.snapshot);
        return {
          ...mapping(q),
          questionId: q.id,
          version: q.version,
          domainId: q.domainId,
          objectiveId: q.objectiveId,
          key: `${i.session_id}:${i.position}`,
          at: i.submitted_at,
          correct: !!i.correct,
          confidence: i.confidence,
          assistance: i.assistance,
          priorExposure: i.prior_exposure === null ? null : !!i.prior_exposure,
          durationMs: i.duration_ms,
          mode: i.mode,
          excluded: this.excluded(q),
        };
      });
  }
  progress() {
    this.enforceTime();
    const result = learning(this.evidence(), this.eligible(), this.clock.wall());
    const { families: _families, ...publicResult } = result;
    return {
      ...publicResult,
      coverage: {
        groups: objectives.length,
        skills: skills.length,
        missingSkills: result.skills.filter((s) => !s.bankCount),
      },
      unknownMappings: this.evidence().filter((e) => !e.primarySkillId).length,
    };
  }
  state() {
    this.enforceTime();
    const sessions = this.db
      .prepare(
        `SELECT s.*,count(i.position) AS total,count(i.submitted_at) AS answered,coalesce(sum(i.correct),0) AS correct FROM sessions s JOIN session_items i ON i.session_id=s.id GROUP BY s.id ORDER BY s.started_at DESC`,
      )
      .all()
      .map((s) => ({
        id: s.id,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        domainId: s.domain_id,
        mode: s.mode,
        timingStatus: s.timing_status,
        total: s.total,
        answered: s.answered,
        correct: s.mode === 'exam' && !s.completed_at ? null : s.correct,
        priorExposureCount: this.db
          .prepare(
            'SELECT count(*) AS n FROM session_items WHERE session_id=? AND prior_exposure=1',
          )
          .get(s.id).n,
        comparisonKey:
          s.mode === 'exam' && s.timing_status !== 'invalid'
            ? json([
                s.blueprint_version,
                JSON.parse(s.config).allocation,
                s.total,
                s.scoring_version,
                s.timing_status,
                JSON.parse(s.config).durationMinutes,
              ])
            : null,
      }));
    const bank = this.eligible(),
      covered = new Set(bank.map((q) => q.objectiveId));
    return {
      onboarded: this.setting('onboarded') === true,
      blueprint,
      totalQuestions: bank.length,
      activeId: this.activeId(),
      sessions,
      domains: domains.map((d) => ({
        ...d,
        count: bank.filter((q) => q.domainId === d.id).length,
      })),
      coverage: {
        covered: covered.size,
        total: objectives.length,
        missing: objectives.filter((o) => !covered.has(o.id)),
      },
      examContentReady: this.contentReady(),
      objectives,
      skills,
    };
  }
  contentReady() {
    const bank = this.publicBank;
    return (
      bank.length >= 100 &&
      objectives.every((o) => bank.some((q) => q.objectiveId === o.id)) &&
      !examSelect(bank, 50, 'gate').shortages.length
    );
  }
  config(input = {}) {
    ensure(
      input && typeof input === 'object' && !Array.isArray(input),
      'Invalid session settings.',
    );
    ensure(
      input.includeGenerated === undefined || typeof input.includeGenerated === 'boolean',
      'Invalid generated-content setting.',
    );
    const mode = input.mode ?? 'study';
    ensure(['study', 'adaptive', 'exam'].includes(mode), 'Unknown session mode.');
    const count = input.count ?? 10;
    ensure(
      Number.isInteger(count) && count >= 1 && count <= 50,
      'Choose a supported session length.',
    );
    if (mode === 'study')
      ensure([4, 5, 10, 20].includes(count), 'Choose a supported session length.');
    if (mode === 'exam') ensure([10, 20, 50].includes(count), 'Choose a supported exam length.');
    const domainIds =
      mode === 'exam'
        ? domains.map((d) => d.id)
        : (input.domainIds ??
          (input.domainId && input.domainId !== 'all'
            ? [input.domainId]
            : domains.map((d) => d.id)));
    ensure(
      Array.isArray(domainIds) &&
        domainIds.length > 0 &&
        new Set(domainIds).size === domainIds.length &&
        domainIds.every((id) => domains.some((d) => d.id === id)),
      'Unknown study domain.',
    );
    const objectiveId = input.objectiveId ?? null,
      skillId = input.skillId ?? null;
    ensure(
      !objectiveId ||
        objectives.some((o) => o.id === objectiveId && domainIds.includes(o.domainId)),
      'Unknown objective.',
    );
    ensure(
      !skillId ||
        skills.some(
          (s) =>
            s.id === skillId &&
            domainIds.includes(s.domainId) &&
            (!objectiveId || s.objectiveId === objectiveId),
        ),
      'Unknown skill.',
    );
    ensure(mode !== 'exam' || (!objectiveId && !skillId), 'Exam sessions use all domains.');
    const cooldownHours = input.cooldownHours ?? 24;
    ensure(
      Number.isFinite(cooldownHours) && cooldownHours >= 0 && cooldownHours <= 720,
      'Cooldown must be 0–720 hours.',
    );
    ensure(
      input.repeatHeavy === undefined || typeof input.repeatHeavy === 'boolean',
      'Invalid repeat setting.',
    );
    ensure(input.timed === undefined || typeof input.timed === 'boolean', 'Invalid timer setting.');
    const durationMinutes = input.durationMinutes ?? count * 2;
    ensure(
      Number.isInteger(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 240,
      'Duration must be 1–240 minutes.',
    );
    return {
      mode,
      count,
      domainIds,
      objectiveId,
      skillId,
      cooldownHours,
      includeGenerated:
        input.includeGenerated === undefined
          ? mode !== 'exam' && this.setting('includeGenerated') !== false
          : input.includeGenerated === true,
      repeatHeavy: input.repeatHeavy ?? false,
      timed: mode === 'exam' && !!input.timed,
      durationMinutes,
    };
  }
  plan(input, seed = randomUUID()) {
    const config = this.config(input),
      now = this.clock.wall();
    const bank = this.eligible().filter(
      (q) =>
        (config.includeGenerated || q.source.kind !== 'ai-generated') &&
        config.domainIds.includes(q.domainId) &&
        (!config.objectiveId || q.objectiveId === config.objectiveId) &&
        (!config.skillId || q.primarySkillId === config.skillId),
    );
    const stats = learning(this.evidence(), bank, now);
    stats.exposedFamilies = this.db
      .prepare('SELECT family_id FROM exposures')
      .all()
      .map((x) => x.family_id);
    let result;
    if (config.mode === 'exam') result = examSelect(bank, config.count, seed);
    else if (config.mode === 'adaptive') result = select({ bank, stats, config, seed, now });
    else {
      const rng = random(seed),
        buckets = config.domainIds.map((id) =>
          bank
            .filter((q) => q.domainId === id)
            .map((q) => ({ q, tie: rng() }))
            .sort((a, b) => a.tie - b.tie),
        ),
        chosen = [],
        used = new Set();
      while (chosen.length < config.count && buckets.some((b) => b.length))
        for (const bucket of buckets) {
          const q = bucket.pop()?.q;
          if (q && !used.has(q.familyId) && chosen.length < config.count) {
            used.add(q.familyId);
            chosen.push({ question: q, reason: 'Broad study practice' });
          }
        }
      result = { chosen };
    }
    const blocked = config.mode === 'exam' && (!this.contentReady() || result.shortages.length > 0);
    return { config, seed, now, result, stats, bank, blocked };
  }
  preview(input) {
    this.enforceTime();
    const p = this.plan(input);
    return {
      requested: p.config.count,
      available: p.result.chosen.length,
      blocked: p.blocked,
      contentReady: this.contentReady(),
      shortages: p.result.shortages ?? [],
      missingDomains: p.result.missingDomains ?? [],
      allocation: p.result.allocation ?? null,
      limited: p.result.chosen.length < p.config.count,
    };
  }
  start(input = {}) {
    this.enforceTime();
    if (this.activeId()) return this.session(this.activeId());
    const p = this.plan(input);
    ensure(
      !p.blocked,
      'Exam content gate is not met or this size lacks eligible items in one or more domains.',
    );
    ensure(
      p.result.chosen.length > 0,
      'No eligible questions. Try a different focus or explicit repeat-heavy review.',
    );
    ensure(
      p.config.mode !== 'adaptive' ||
        p.result.chosen.length === p.config.count ||
        input.acceptShorter === true,
      'The bank supports a shorter session. Preview and accept the shorter length, or choose repeat-heavy review.',
    );
    const id = randomUUID(),
      rng = random(p.seed + 'options'),
      config = {
        ...p.config,
        allocation: p.result.allocation ?? null,
        examWeights: p.config.mode === 'exam' ? examWeights : null,
        mappingVersion,
        schedulerVersion: p.config.mode === 'adaptive' ? schedulerVersion : null,
        seed: p.seed,
        selection:
          p.config.mode === 'adaptive'
            ? {
                now: p.now,
                candidates: p.bank.map((q) => ({
                  id: q.id,
                  version: q.version,
                  familyId: q.familyId,
                  primarySkillId: q.primarySkillId,
                  domainId: q.domainId,
                })),
                stats: p.stats,
                decisions: p.result.chosen.map((x) => ({
                  id: x.question.id,
                  pool: x.pool,
                  fallback: x.fallback,
                  reason: x.reason,
                })),
              }
            : null,
      };
    this.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO sessions (id,started_at,domain_id,blueprint_version,mode,config,deadline,timing_status,clock) VALUES (?,?,?,?,?,?,?,?,?)',
        )
        .run(
          id,
          this.now(),
          p.config.domainIds.length === 1 ? p.config.domainIds[0] : 'all',
          blueprint.version,
          p.config.mode,
          json(config),
          p.config.timed ? p.now + p.config.durationMinutes * 60000 : null,
          p.config.timed ? 'timed' : 'untimed',
          p.config.timed ? json(this.checkpoint(p.config.durationMinutes * 60000)) : null,
        );
      const insert = this.db.prepare(
        "INSERT INTO session_items (session_id,position,question_id,snapshot,assistance,prior_exposure,reason) VALUES (?,?,?,?,'none',?,?)",
      );
      p.result.chosen.forEach((x, i) => {
        const q = x.question;
        const prior =
          this.db.prepare('SELECT 1 FROM exposures WHERE family_id=?').get(q.familyId) ||
          p.stats.families[q.familyId];
        insert.run(
          id,
          i,
          q.id,
          json({
            ...q,
            options: q.options
              .map((o) => ({ o, tie: rng() }))
              .sort((a, b) => a.tie - b.tie)
              .map((x) => x.o),
          }),
          Number(!!prior),
          x.reason,
        );
      });
    });
    return this.session(id);
  }
  checkpoint(remaining) {
    return { wall: this.clock.wall(), uptime: this.clock.uptime(), remaining };
  }
  trackExamDuration() {
    const active = this.db
      .prepare("SELECT id,cursor FROM sessions WHERE mode='exam' AND completed_at IS NULL")
      .get();
    const previous = this.durationAnchor;
    const mono = this.clock.mono();
    if (previous && active?.id === previous.id) {
      const elapsed = Math.max(0, Math.round(mono - previous.mono));
      if (elapsed)
        this.db
          .prepare(
            'UPDATE session_items SET duration_ms=min(604800000,duration_ms+?) WHERE session_id=? AND position=? AND submitted_at IS NULL',
          )
          .run(elapsed, previous.id, previous.position);
    }
    this.durationAnchor = active ? { id: active.id, position: active.cursor, mono } : null;
  }
  enforceTime() {
    this.trackExamDuration();
    const s = this.db
      .prepare("SELECT * FROM sessions WHERE completed_at IS NULL AND timing_status='timed'")
      .get();
    if (!s) return;
    const previous = JSON.parse(s.clock),
      wall = this.clock.wall(),
      up = this.clock.uptime();
    let anchor = this.anchors.get(s.id);
    if (!anchor) {
      // Same-boot continuity must agree with wall elapsed within two seconds. Otherwise timing is unverifiable.
      const wallDelta = wall - previous.wall,
        upDelta = up - previous.uptime;
      if (wallDelta < 0 || upDelta < 0 || Math.abs(wallDelta - upDelta) > 2000) {
        this.db.prepare("UPDATE sessions SET timing_status='invalid' WHERE id=?").run(s.id);
        return;
      }
      anchor = {
        wall,
        mono: this.clock.mono(),
        remaining: Math.min(
          s.deadline - wall,
          (previous.remaining ?? s.deadline - previous.wall) - upDelta,
        ),
      };
      this.anchors.set(s.id, anchor);
    }
    const elapsed = this.clock.mono() - anchor.mono;
    if (wall < previous.wall || wall < anchor.wall + elapsed - 2000) {
      this.db.prepare("UPDATE sessions SET timing_status='invalid' WHERE id=?").run(s.id);
      return;
    }
    if (wall >= s.deadline || elapsed >= anchor.remaining) {
      this.finalizeInternal(s.id);
      return;
    }
    this.db
      .prepare('UPDATE sessions SET clock=? WHERE id=?')
      .run(json(this.checkpoint(Math.max(0, anchor.remaining - elapsed))), s.id);
  }
  session(id) {
    this.enforceTime();
    ensure(typeof id === 'string', 'Invalid session ID.');
    const row = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(id);
    ensure(row, 'This session could not be found.');
    const hidden = row.mode === 'exam' && !row.completed_at;
    const items = this.db
      .prepare('SELECT * FROM session_items WHERE session_id=? ORDER BY position')
      .all(id)
      .map((item) => {
        const q = JSON.parse(item.snapshot),
          { correctOptionIds, explanation, references, source, options, ...rest } = q;
        if (item.submitted_at && !hidden) {
          this.db
            .prepare('INSERT OR IGNORE INTO exposures VALUES (?,?)')
            .run(mapping(q).familyId, this.now());
          for (const draft of this.db
            .prepare(
              'SELECT session_id,position,snapshot FROM session_items WHERE submitted_at IS NULL',
            )
            .all())
            if (mapping(JSON.parse(draft.snapshot)).familyId === mapping(q).familyId)
              this.db
                .prepare(
                  "UPDATE session_items SET assistance='seen' WHERE session_id=? AND position=? AND assistance!='unknown'",
                )
                .run(draft.session_id, draft.position);
        }
        return {
          question: {
            ...rest,
            selectionCount: correctOptionIds.length,
            options: options.map(({ id, text }) => ({ id, text })),
          },
          selectedOptionIds: JSON.parse(item.selected),
          submittedAt: hidden ? null : item.submitted_at,
          correct: hidden || item.correct === null ? null : !!item.correct,
          durationMs: item.duration_ms,
          confidence: item.confidence,
          revision: item.revision,
          flagged: !!item.flagged,
          reason: item.reason,
          priorExposure: item.prior_exposure === null ? null : !!item.prior_exposure,
          ...(item.submitted_at && !hidden
            ? { review: { correctOptionIds, explanation, references, source, options } }
            : {}),
        };
      });
    return {
      id: row.id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      domainId: row.domain_id,
      blueprintVersion: row.blueprint_version,
      mode: row.mode,
      scoringVersion: row.scoring_version,
      cursor: row.cursor,
      deadline: row.deadline,
      timingStatus: row.timing_status,
      remainingMs:
        row.timing_status === 'timed' && !row.completed_at ? JSON.parse(row.clock).remaining : null,
      items,
      correct: hidden ? null : items.filter((i) => i.correct).length,
      answered: hidden
        ? items.filter((i) => i.selectedOptionIds.length).length
        : items.filter((i) => i.submittedAt).length,
    };
  }
  current(sessionId, questionId) {
    ensure(
      typeof sessionId === 'string' && typeof questionId === 'string',
      'Invalid answer request.',
    );
    const s = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(sessionId);
    ensure(s && !s.completed_at, 'This session is not active.');
    const item = this.db
      .prepare('SELECT * FROM session_items WHERE session_id=? AND position=?')
      .get(sessionId, s.cursor);
    ensure(item?.question_id === questionId, 'This question is no longer the current question.');
    return { ...item, mode: s.mode };
  }
  checkRevision(item, payload) {
    if (payload.revision !== undefined)
      ensure(
        Number.isInteger(payload.revision) && payload.revision === item.revision,
        'This answer changed. Reopen the session before saving again.',
      );
  }
  draft(payload) {
    this.enforceTime();
    const { sessionId, questionId, selectedOptionIds, durationMs } = payload;
    const item = this.current(sessionId, questionId);
    ensure(!item.submitted_at, 'This answer is already submitted.');
    this.checkRevision(item, payload);
    validateSelection(JSON.parse(item.snapshot), selectedOptionIds, true);
    validateDuration(durationMs);
    const confidence = payload.confidence === undefined ? item.confidence : payload.confidence;
    ensure(confidenceValues.includes(confidence), 'Invalid confidence.');
    this.db
      .prepare(
        'UPDATE session_items SET selected=?,duration_ms=?,confidence=?,revision=revision+1 WHERE session_id=? AND position=?',
      )
      .run(
        json(selectedOptionIds),
        Math.max(item.duration_ms, durationMs),
        confidence,
        sessionId,
        item.position,
      );
    return this.session(sessionId);
  }
  submit(payload) {
    this.enforceTime();
    const { sessionId, questionId, selectedOptionIds, durationMs } = payload;
    this.transaction(() => {
      const item = this.current(sessionId, questionId);
      ensure(item.mode !== 'exam', 'Finalize the exam to grade answers.');
      const q = JSON.parse(item.snapshot);
      validateSelection(q, selectedOptionIds);
      validateDuration(durationMs);
      if (item.submitted_at) {
        ensure(
          sameSelection(JSON.parse(item.selected), selectedOptionIds),
          'A submitted answer cannot be changed.',
        );
        return;
      }
      this.checkRevision(item, payload);
      const confidence = payload.confidence === undefined ? item.confidence : payload.confidence;
      ensure(confidenceValues.includes(confidence), 'Invalid confidence.');
      this.db
        .prepare(
          'UPDATE session_items SET selected=?,duration_ms=?,submitted_at=?,correct=?,confidence=?,assistance=?,revision=revision+1 WHERE session_id=? AND position=?',
        )
        .run(
          json(selectedOptionIds),
          Math.max(item.duration_ms, durationMs),
          this.now(),
          Number(sameSelection(q.correctOptionIds, selectedOptionIds)),
          confidence,
          item.assistance,
          sessionId,
          item.position,
        );
    });
    return this.session(sessionId);
  }
  advance({ sessionId, questionId }) {
    this.enforceTime();
    this.transaction(() => {
      const item = this.current(sessionId, questionId);
      ensure(item.mode !== 'exam', 'Use exam navigation.');
      ensure(item.submitted_at, 'Submit an answer before continuing.');
      const total = this.db
        .prepare('SELECT count(*) AS n FROM session_items WHERE session_id=?')
        .get(sessionId).n;
      if (item.position === total - 1)
        this.db.prepare('UPDATE sessions SET completed_at=? WHERE id=?').run(this.now(), sessionId);
      else this.db.prepare('UPDATE sessions SET cursor=cursor+1 WHERE id=?').run(sessionId);
    });
    return this.session(sessionId);
  }
  navigate({ sessionId, position }) {
    this.enforceTime();
    const s = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(sessionId);
    ensure(s && s.mode === 'exam' && !s.completed_at, 'This exam is not active.');
    ensure(
      Number.isInteger(position) &&
        this.db
          .prepare('SELECT 1 FROM session_items WHERE session_id=? AND position=?')
          .get(sessionId, position),
      'Unknown question position.',
    );
    this.db.prepare('UPDATE sessions SET cursor=? WHERE id=?').run(position, sessionId);
    return this.session(sessionId);
  }
  flag({ sessionId, questionId, flagged, revision }) {
    this.enforceTime();
    const item = this.current(sessionId, questionId);
    ensure(item.mode === 'exam' && typeof flagged === 'boolean', 'Invalid flag request.');
    this.checkRevision(item, { revision });
    this.db
      .prepare(
        'UPDATE session_items SET flagged=?,revision=revision+1 WHERE session_id=? AND position=?',
      )
      .run(Number(flagged), sessionId, item.position);
    return this.session(sessionId);
  }
  finalizeInternal(id) {
    this.transaction(() => {
      const s = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(id);
      ensure(s?.mode === 'exam', 'Unknown exam.');
      if (s.completed_at) return;
      const at = this.now();
      for (const i of this.db.prepare('SELECT * FROM session_items WHERE session_id=?').all(id)) {
        const q = JSON.parse(i.snapshot);
        this.db
          .prepare(
            'UPDATE session_items SET submitted_at=?,correct=?,revision=revision+1 WHERE session_id=? AND position=?',
          )
          .run(
            at,
            Number(sameSelection(q.correctOptionIds, JSON.parse(i.selected))),
            id,
            i.position,
          );
      }
      this.db.prepare('UPDATE sessions SET completed_at=? WHERE id=?').run(at, id);
    });
  }
  finalize({ sessionId, confirmUnanswered = false }) {
    this.enforceTime();
    const s = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(sessionId);
    ensure(s?.mode === 'exam', 'Unknown exam.');
    if (!s.completed_at) {
      const unanswered = this.db
        .prepare("SELECT count(*) AS n FROM session_items WHERE session_id=? AND selected='[]'")
        .get(sessionId).n;
      ensure(
        !unanswered || confirmUnanswered === true,
        'Confirm submission with unanswered questions.',
      );
      this.finalizeInternal(sessionId);
    }
    return this.session(sessionId);
  }
  issues() {
    return this.db
      .prepare('SELECT * FROM issues ORDER BY created_at DESC')
      .all()
      .map((i) => ({
        ...i,
        events: this.db
          .prepare('SELECT status,note,created_at FROM issue_events WHERE issue_id=? ORDER BY id')
          .all(i.id),
      }));
  }
  report({ questionId, version, category, note = '' }) {
    ensure(
      ['ambiguity', 'incorrect-answer', 'outdated-content', 'broken-reference'].includes(category),
      'Unknown issue category.',
    );
    ensure(
      typeof note === 'string' && note.length <= 2000,
      'Issue notes must be at most 2000 characters.',
    );
    ensure(
      Number.isInteger(version) && typeof questionId === 'string',
      'Invalid question version.',
    );
    const exists =
      this.bank.some((q) => q.id === questionId && q.version === version) ||
      this.db
        .prepare('SELECT snapshot FROM session_items WHERE question_id=?')
        .all(questionId)
        .some((i) => JSON.parse(i.snapshot).version === version);
    ensure(exists, 'Unknown question version.');
    const id = randomUUID();
    this.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO issues (id,question_id,version,category,note,status,created_at) VALUES (?,?,?,?,?,'pending',?)",
        )
        .run(id, questionId, version, category, note, this.now());
      this.db
        .prepare(
          "INSERT INTO issue_events (issue_id,status,note,created_at) VALUES (?,'pending',?,?)",
        )
        .run(id, note, this.now());
    });
    return this.issues();
  }
  resolve({ id, status, note }) {
    ensure(
      ['dismissed', 'retired'].includes(status),
      'Corrections must arrive through a reviewed bank update.',
    );
    ensure(
      typeof note === 'string' && note.trim().length > 0 && note.length <= 2000,
      'Explain the resolution.',
    );
    const issue = this.db.prepare('SELECT * FROM issues WHERE id=?').get(id);
    ensure(issue?.status === 'pending', 'Only pending issues can be resolved.');
    this.transaction(() => {
      this.db
        .prepare('UPDATE issues SET status=?,resolution=? WHERE id=?')
        .run(status, note.trim(), id);
      this.db
        .prepare('INSERT INTO issue_events (issue_id,status,note,created_at) VALUES (?,?,?,?)')
        .run(id, status, note.trim(), this.now());
    });
    return this.issues();
  }
  reconcileCorrections() {
    for (const q of this.bank) {
      if (!q.correctsVersions?.length) continue;
      for (const version of q.correctsVersions) {
        for (const issue of this.db
          .prepare("SELECT * FROM issues WHERE question_id=? AND version=? AND status='pending'")
          .all(q.id, version)) {
          this.transaction(() => {
            const note = `Reviewed content version ${q.version}: ${q.source.changes}`;
            this.db
              .prepare(
                "UPDATE issues SET status='corrected',resolution=?,replacement_version=? WHERE id=?",
              )
              .run(note, q.version, issue.id);
            this.db
              .prepare(
                "INSERT INTO issue_events (issue_id,status,note,created_at) VALUES (?,'corrected',?,?)",
              )
              .run(issue.id, note, this.now());
          });
        }
      }
    }
  }
}
