import { LabAdaptations, adaptationSchemas, adaptationInstructions } from './lab-adaptations.js';
import { randomUUID } from 'node:crypto';
import { setImmediate as yieldLoop } from 'node:timers/promises';
import { documents, registryVersion, sectionMappings } from '../content/documents.js';
import { blueprint, skills, mappingVersion } from '../content/catalog.js';
import { mapping } from '../content/mappings.js';
import { ensure, validateBank, sameSelection } from './validation.js';
import { models, pricingVersion } from './provider.js';
import {
  schemas,
  instructions,
  safety,
  checkSchema,
  normalizeQuestion,
  similarity,
  sourceChunks,
} from './generation-contract.js';
const json = JSON.stringify;
const phases = ['analysis', 'generation', 'solve', 'review'];
const terminal = (s) => ['completed', 'cancelled', 'failed'].includes(s);
const now = () => new Date().toISOString();
class Pause extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}
export class Generation {
  constructor(store, reader, provider, { autoStart = true } = {}) {
    this.store = store;
    this.db = store.db;
    this.reader = reader;
    this.provider = provider;
    this.labAdaptations = new LabAdaptations(this);
    this.running = false;
    this.volatileFailures = new Map();
    this.closed = false;
    this.config = store.setting('generation') || {
      automatic: false,
      automationLimit: null,
      enabledAt: null,
    };
    // Holds cover future local work only. Requests retain their own unknown-usage reservations.
    this.db.exec('DELETE FROM generation_holds');
    for (const job of this.jobs()) {
      if (!terminal(job.status) && job.status !== 'paused')
        this.save(
          job.id,
          {
            reason: 'reactivation',
            message: 'Recovered checkpoints. Activate AI before continuing.',
          },
          'paused',
        );
    }
    if (autoStart) {
      this.timer = setInterval(() => {
        this.tick().catch(() => {});
      }, 500);
      this.timer.unref();
    }
  }
  jobs() {
    return this.db
      .prepare('SELECT * FROM generation_jobs ORDER BY created_at DESC,rowid DESC')
      .all()
      .map((r) => ({
        ...JSON.parse(r.data),
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        ...(this.volatileFailures.get(r.id) || {}),
      }));
  }
  job(id) {
    ensure(typeof id === 'string' && id.length <= 100, 'Invalid job ID.');
    const r = this.db.prepare('SELECT * FROM generation_jobs WHERE id=?').get(id);
    ensure(r, 'Unknown generation job.');
    return {
      ...JSON.parse(r.data),
      id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      ...(this.volatileFailures.get(id) || {}),
    };
  }
  save(id, patch, status) {
    const j = this.job(id);
    const data = { ...j, ...patch };
    const next = status || j.status;
    this.db
      .prepare('UPDATE generation_jobs SET data=?,status=?,updated_at=? WHERE id=?')
      .run(json(data), next, now(), id);
    if (status || patch.message)
      this.db
        .prepare('INSERT INTO generation_events(job_id,status,message,created_at) VALUES(?,?,?,?)')
        .run(id, next, patch.message || next, now());
    this.volatileFailures.delete(id);
    return this.job(id);
  }
  list() {
    return {
      settings: {
        ...this.config,
        includeGenerated: this.store.setting('includeGenerated') !== false,
      },
      provider: this.provider.status(),
      jobs: this.jobs()
        .filter((j) => j.kind !== 'lab-adaptation')
        .map((j) => ({
          id: j.id,
          status: j.status,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
          phase: j.phase,
          count: j.count,
          reason: j.reason,
          message: j.message,
          nextRetryAt: j.nextRetryAt,
          pauseRequested: j.pauseRequested,
          counts: this.counts(j.id),
        })),
    };
  }
  counts(id) {
    return Object.fromEntries(
      this.db
        .prepare(
          'SELECT status,COUNT(*) AS n FROM generation_candidates WHERE job_id=? GROUP BY status',
        )
        .all(id)
        .map((r) => [r.status, r.n]),
    );
  }
  read({ id } = {}) {
    const job = this.job(id);
    return {
      ...job,
      counts: this.counts(id),
      candidates: this.candidates(id),
      events: this.db
        .prepare(
          'SELECT status,message,created_at FROM generation_events WHERE job_id=? ORDER BY id',
        )
        .all(id),
      requests: this.db
        .prepare(
          'SELECT id,operation,status,model,cost,reserved,input_tokens,output_tokens,error,provider_id,provider_request_id FROM ai_requests WHERE job_id=? ORDER BY created_at,rowid',
        )
        .all(id),
    };
  }
  settings(p = {}) {
    for (const k of ['automatic', 'includeGenerated'])
      ensure(p[k] === undefined || typeof p[k] === 'boolean', 'Invalid generation setting.');
    const config = { ...this.config };
    if (p.automationLimit !== undefined) {
      ensure(
        Number.isFinite(p.automationLimit) &&
          p.automationLimit > 0 &&
          p.automationLimit <= this.provider.config.dailyLimit,
        'Automation allowance must be positive and within the daily app limit.',
      );
      config.automationLimit = p.automationLimit;
    }
    if (p.automatic !== undefined) {
      if (p.automatic)
        ensure(
          config.automationLimit > 0 && config.automationLimit <= this.provider.config.dailyLimit,
          'Set an automation allowance within the daily app limit first.',
        );
      if (p.automatic && !config.automatic) config.enabledAt = now();
      config.automatic = p.automatic;
    }
    this.config = config;
    this.store.setSetting('generation', config);
    if (p.includeGenerated !== undefined)
      this.store.setSetting('includeGenerated', p.includeGenerated);
    if (p.automatic === false)
      for (const j of this.jobs()) if (j.automatic && !terminal(j.status)) this.pause({ id: j.id });
    return this.list();
  }
  evidence({ sessionId, objectiveId } = {}) {
    if (sessionId)
      ensure(
        this.db.prepare('SELECT completed_at FROM sessions WHERE id=?').get(sessionId)
          ?.completed_at,
        'Generation uses completed sessions only.',
      );
    if (objectiveId)
      ensure(
        skills.some((s) => s.objectiveId === objectiveId),
        'Unknown objective.',
      );
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    return this.db
      .prepare(
        'SELECT i.*,s.completed_at FROM session_items i JOIN sessions s ON s.id=i.session_id WHERE s.completed_at IS NOT NULL AND i.submitted_at IS NOT NULL ORDER BY i.submitted_at DESC',
      )
      .all()
      .filter((r) => (sessionId ? r.session_id === sessionId : r.submitted_at >= cutoff))
      .map((r) => ({
        question: { ...JSON.parse(r.snapshot), ...mapping(JSON.parse(r.snapshot)) },
        selected: JSON.parse(r.selected),
        correct: !!r.correct,
        confidence: r.confidence,
        assistance: r.assistance,
        priorExposure: r.prior_exposure,
        submittedAt: r.submitted_at,
        sessionId: r.session_id,
      }))
      .filter(
        (e) =>
          (!objectiveId || e.question.objectiveId === objectiveId) &&
          e.question.primarySkillId &&
          !this.store.excluded(e.question, true),
      )
      .slice(0, 50);
  }
  create(p = {}, automatic = false) {
    ensure(p && typeof p === 'object', 'Invalid generation request.');
    const count = p.count ?? 3;
    ensure(Number.isInteger(count) && count >= 1 && count <= 5, 'Generate 1–5 candidates.');
    for (const key of ['sessionId', 'objectiveId'])
      ensure(
        p[key] === undefined || (typeof p[key] === 'string' && p[key].length <= 100),
        'Invalid generation target.',
      );
    const evidence = this.evidence(p);
    ensure(
      evidence.some((e) => !e.correct),
      'No eligible mistakes in this target. Complete practice first.',
    );
    const targetSkills = [
      ...new Set(evidence.filter((e) => !e.correct).map((e) => e.question.primarySkillId)),
    ].sort();
    const overlapping = this.jobs().find(
      (j) =>
        j.kind !== 'lab-adaptation' &&
        j.status === 'queued' &&
        !j.evidence &&
        j.automatic === automatic &&
        j.targetSkills.some((s) => targetSkills.includes(s)),
    );
    if (overlapping) {
      const targets = [
        ...overlapping.targets,
        { sessionId: p.sessionId, objectiveId: p.objectiveId },
      ];
      return this.save(overlapping.id, {
        targets,
        targetSkills: [...new Set([...overlapping.targetSkills, ...targetSkills])],
        count: Math.max(count, overlapping.count),
        message: 'Related queued work combined.',
      });
    }
    const id = randomUUID();
    const stamp = now();
    const data = {
      count,
      automatic,
      targets: [{ sessionId: p.sessionId, objectiveId: p.objectiveId }],
      targetSkills,
      requests: {},
      outputs: {},
      phase: 'fetching',
      retries: 0,
      pauseRequested: false,
      reason: null,
      message: 'Queued',
      settings: {
        generationModel: this.provider.config.generationModel,
        reviewModel: this.provider.config.reviewModel,
        maxOutputTokens: this.provider.config.maxOutputTokens,
        blueprintVersion: blueprint.version,
        registryVersion,
        pricingVersion,
        promptVersion: 'generation-v2',
      },
    };
    this.db
      .prepare('INSERT INTO generation_jobs VALUES(?,?,?,?,?)')
      .run(id, 'queued', json(data), stamp, stamp);
    this.db
      .prepare('INSERT INTO generation_events(job_id,status,message,created_at) VALUES(?,?,?,?)')
      .run(id, 'queued', 'Generation requested', stamp);
    return this.job(id);
  }
  automatic() {
    if (!this.config.automatic) return;
    const rows = this.db
      .prepare(
        'SELECT id FROM sessions WHERE completed_at>=? AND id NOT IN (SELECT session_id FROM generation_triggers)',
      )
      .all(this.config.enabledAt);
    for (const r of rows)
      this.store.transaction(() => {
        const evidence = this.evidence({ sessionId: r.id });
        const j = evidence.some((e) => !e.correct) ? this.create({ sessionId: r.id }, true) : null;
        this.db.prepare('INSERT INTO generation_triggers VALUES(?,?)').run(r.id, j?.id || null);
      });
  }
  pause({ id } = {}) {
    const j = this.job(id);
    ensure(!terminal(j.status), 'Job has finished.');
    this.release(id);
    return this.save(
      id,
      {
        pauseRequested: true,
        reason: 'user',
        message:
          this.runningId === id
            ? 'Pause requested; finishing the current checkpoint.'
            : 'Paused by you.',
      },
      this.runningId === id ? undefined : 'paused',
    );
  }
  resume({ id } = {}) {
    const j = this.job(id);
    ensure(j.phase !== 'preview', 'Confirm the adaptation preview before queueing.');
    ensure(
      j.status === 'paused' && !['unknown', 'incomplete'].includes(j.reason),
      'Use deliberate retry for an uncertain or incomplete paid response.',
    );
    return this.save(
      id,
      { pauseRequested: false, reason: null, message: 'Queued to resume.', nextRetryAt: null },
      'queued',
    );
  }
  retry({ id, confirm } = {}) {
    const j = this.job(id);
    ensure(j.phase !== 'preview', 'Confirm the adaptation preview before queueing.');
    ensure(['paused', 'failed'].includes(j.status), 'Pause or wait for the job before retrying.');
    if (['unknown', 'incomplete'].includes(j.reason))
      ensure(confirm === true, 'Confirm retry: the previous request may already have been billed.');
    const requests = { ...j.requests };
    if (['unknown', 'incomplete', 'validation'].includes(j.reason)) delete requests[j.phase];
    return this.save(
      id,
      {
        requests,
        reason: null,
        pauseRequested: false,
        retries: 0,
        nextRetryAt: null,
        message: 'Explicit retry queued.',
      },
      'queued',
    );
  }
  cancel({ id } = {}) {
    const j = this.job(id);
    ensure(!terminal(j.status), 'Job has finished.');
    this.save(id, { message: 'Cancelled. Submitted usage may remain unknown.' }, 'cancelled');
    this.release(id);
    if (this.provider.active && this.provider.request(this.provider.active.id)?.job_id === id)
      this.provider.cancel({ id: this.provider.active.id });
    return this.job(id);
  }
  release(id) {
    this.db.prepare('DELETE FROM generation_holds WHERE job_id=?').run(id);
  }
  guard(id) {
    if (this.closed) throw new Pause('closed', 'Application closed.');
    const j = this.job(id);
    if (j.status === 'cancelled') throw new Pause('cancelled', 'Cancelled.');
    if (j.pauseRequested) throw new Pause('user', 'Paused by you.');
    return j;
  }
  async tick() {
    if (this.closed || this.running) return;
    this.automatic();
    if (this.provider.config.enabled && this.provider.config.validated)
      for (const j of this.jobs())
        if (j.status === 'paused' && j.reason === 'reactivation' && !j.pauseRequested)
          this.save(
            j.id,
            { reason: null, message: 'AI reactivated; restoring the saved checkpoint.' },
            'queued',
          );
    if (this.provider.active || this.provider.pendingInteractive) return;
    const job = this.jobs()
      .reverse()
      .find(
        (j) => j.status === 'queued' && (!j.nextRetryAt || Date.parse(j.nextRetryAt) <= Date.now()),
      );
    if (!job) return;
    this.running = true;
    this.runningId = job.id;
    try {
      await this.step(job.id);
    } catch (e) {
      if (!this.closed) {
        try {
          if (this.job(job.id).status !== 'cancelled')
            this.save(
              job.id,
              {
                reason: e.reason || 'validation',
                message: e.code
                  ? 'Unable to save generation. Check disk space and retry.'
                  : e.message,
              },
              e instanceof Pause ? 'paused' : 'failed',
            );
          this.release(job.id);
        } catch {
          // Even when SQLite cannot record a failure, the UI must stop claiming active work.
          this.volatileFailures.set(job.id, {
            status: 'failed',
            reason: 'storage',
            message:
              'Generation stopped because its checkpoint could not be saved. Check disk space, then retry or restart.',
          });
        }
      }
    } finally {
      this.running = false;
      this.runningId = null;
    }
  }
  async fetchEvidence(id) {
    let j = this.guard(id);
    this.save(id, { message: 'Refreshing approved documentation.', phase: 'fetching' }, 'fetching');
    const seen = new Set();
    const evidence =
      j.evidence ||
      j.targets
        .flatMap((target) => this.evidence(target))
        .filter((e) => {
          const key = `${e.sessionId}:${e.question.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((e) => !e.correct)
        .slice(0, 3);
    ensure(evidence.length, 'No eligible mistakes remain.');
    this.save(id, { evidence });
    const mapped = documents
      .filter((d) =>
        evidence.some((e) =>
          documents.some((candidate) => candidate.skillIds.includes(e.question.primarySkillId))
            ? d.skillIds.includes(e.question.primarySkillId)
            : d.objectiveId === e.question.objectiveId,
        ),
      )
      .sort(
        (a, b) =>
          Number(evidence.some((e) => b.skillIds.includes(e.question.primarySkillId))) -
          Number(evidence.some((e) => a.skillIds.includes(e.question.primarySkillId))),
      )
      .slice(0, 3);
    if (!mapped.length)
      throw new Pause('evidence', 'No approved documentation is mapped to this target.');
    const sources = [];
    for (const d of mapped) {
      this.guard(id);
      let result;
      try {
        result = await this.reader.fetch({ id: d.id });
      } catch {
        throw new Pause(
          'evidence',
          'Current documentation could not be retrieved. Connect and resume.',
        );
      }
      this.guard(id);
      const query = evidence.map((e) => e.question.prompt + ' ' + e.question.explanation).join(' ');
      const pinned = evidence
        .map((e) => sectionMappings[e.question.primarySkillId])
        .find((v) => v?.[0] === d.id);
      for (const { section, excerpt, offset } of sourceChunks(
        result.article,
        query,
        pinned ? `${d.id}:${pinned[1]}` : null,
      )) {
        if (sources.length >= 6) break;
        sources.push({
          id: `S${sources.length + 1}`,
          documentId: d.id,
          url: d.url,
          title: d.title,
          sectionId: section.id,
          revision: result.version.revision,
          fetchedAt: result.version.fetchedAt,
          excerpt,
          offset,
          attribution: d.attribution,
          license: d.license,
          licenseUrl: d.licenseUrl,
        });
      }
    }
    if (!sources.length) throw new Pause('evidence', 'No current source excerpts available.');
    j = this.guard(id);
    this.save(id, { sources, phase: 'analysis', message: 'Evidence saved.' }, 'queued');
  }
  hold(id) {
    const j = this.job(id);
    const pending = (j.kind === 'lab-adaptation' ? ['generation', 'review'] : phases).filter(
      (p) =>
        !j.outputs[p] &&
        !(j.requests[p] && this.provider.request(j.requests[p])?.status === 'completed'),
    );
    let amount = 0;
    for (const p of pending) {
      const price = models.find(
        (m) =>
          m.id ===
          (['solve', 'review'].includes(p) ? j.settings.reviewModel : j.settings.generationModel),
      );
      ensure(price, 'Saved generation model is unsupported.');
      amount += (16000 * price.input * 1.25 + j.settings.maxOutputTokens * price.output) / 1e6;
    }
    this.store.transaction(() => {
      const existing =
        this.db.prepare('SELECT amount FROM generation_holds WHERE job_id=?').get(id)?.amount || 0;
      if (this.provider.usage().committed - existing + amount > this.provider.config.dailyLimit)
        throw new Pause(
          'budget',
          'Insufficient daily allowance for the remaining analysis, generation and review passes.',
        );
      if (j.automatic) {
        const day = now().slice(0, 10);
        const used = this.db
          .prepare(
            "SELECT r.day,r.cost,r.reserved FROM ai_requests r JOIN generation_jobs j ON j.id=r.job_id WHERE json_extract(j.data,'$.automatic')=1",
          )
          .all()
          .reduce((sum, r) => sum + (r.cost === null ? r.reserved : r.day === day ? r.cost : 0), 0);
        const held = this.db
          .prepare(
            "SELECT COALESCE(SUM(h.amount),0) AS n FROM generation_holds h JOIN generation_jobs j ON j.id=h.job_id WHERE json_extract(j.data,'$.automatic')=1 AND j.id!=?",
          )
          .get(id).n;
        if (!this.config.automatic || used + held + amount > this.config.automationLimit)
          throw new Pause(
            'budget',
            'Automatic generation allowance reached or automation disabled.',
          );
      }
      this.db
        .prepare(
          'INSERT INTO generation_holds VALUES(?,?) ON CONFLICT(job_id) DO UPDATE SET amount=excluded.amount',
        )
        .run(id, amount);
    });
  }
  sourcesValid(ids, j) {
    return (
      ids.length > 0 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => j.sources.some((s) => s.id === id))
    );
  }
  candidates(id) {
    return this.db
      .prepare('SELECT * FROM generation_candidates WHERE job_id=? ORDER BY rowid')
      .all(id)
      .map((r) => ({
        id: r.id,
        status: r.status,
        question: JSON.parse(r.data),
        findings: JSON.parse(r.findings),
      }));
  }
  async payload(j, phase) {
    if (j.kind === 'lab-adaptation') return this.labAdaptations.payload(j, phase);
    const evidence = j.evidence.filter((e) => !this.store.excluded(e.question, true));
    const candidates = this.candidates(j.id).filter((c) => c.status === 'pending');
    const sources = j.sources;
    if (phase === 'analysis') return { evidence, sources };
    const misconceptions = j.outputs.analysis.misconceptions;
    if (phase === 'generation')
      return {
        count: j.count,
        misconceptions,
        sources,
        existingQuestions: this.store.bank
          .filter((q) => misconceptions.some((m) => m.primarySkillId === q.primarySkillId))
          .slice(0, 12)
          .map((q) => ({ prompt: q.prompt, familyId: q.familyId })),
      };
    if (phase === 'solve')
      return {
        sources,
        candidates: candidates.map((c) => ({
          id: c.id,
          prompt: c.question.prompt,
          type: c.question.type,
          selectionCount: c.question.selectionCount,
          options: c.question.options.map(({ id, text }) => ({ id, text })),
        })),
      };
    const neighbors = [];
    for (const c of candidates) {
      const scores = [];
      for (let n = 0; n < this.store.bank.length; n++) {
        const q = this.store.bank[n];
        if (
          q.primarySkillId === c.question.primarySkillId ||
          q.objectiveId === c.question.objectiveId
        )
          scores.push({ q, score: similarity(q.prompt, c.question.prompt) });
        if (n % 50 === 0) await yieldLoop();
      }
      neighbors.push({
        candidateId: c.id,
        questions: scores
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ q }) => ({ id: q.id, familyId: q.familyId, prompt: q.prompt })),
      });
    }
    return {
      sources,
      misconceptions,
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.question.title,
        prompt: c.question.prompt,
        type: c.question.type,
        selectionCount: c.question.selectionCount,
        options: c.question.options,
        correctOptionIds: c.question.correctOptionIds,
        primarySkillId: c.question.primarySkillId,
        explanation: c.question.explanation,
        sourceIds: c.question.sourceIds,
      })),
      independentSolutions: j.outputs.solve,
      neighbors,
    };
  }
  async step(id) {
    let j = this.guard(id);
    if (j.phase === 'fetching') return this.fetchEvidence(id);
    if (j.sources?.some((s) => Date.now() - Date.parse(s.fetchedAt) > 86400000))
      throw new Pause(
        'stale-evidence',
        'This evidence is over 24 hours old. Cancel and create a new job to refresh it; saved review evidence stays intact.',
      );
    if (j.phase === 'publish') return this.publish(id);
    const phase = j.phase;
    const labJob = j.kind === 'lab-adaptation';
    const phaseSchema = labJob ? adaptationSchemas[phase] : schemas[phase];
    let request = j.requests[phase] ? this.provider.request(j.requests[phase]) : null;
    if (request && request.status !== 'completed') {
      if (request.status === 'reserved') {
        // Intent exists but dispatch was never started. Release only this confirmed unsent reservation.
        this.db
          .prepare("UPDATE ai_requests SET status='cancelled',cost=0 WHERE id=?")
          .run(request.id);
      } else if (request.cost === null)
        throw new Pause(
          'unknown',
          'Submission outcome is unknown. The unstored response cannot be recovered; retry deliberately.',
        );
      else if (
        request.cost !== 0 ||
        !['rate-limit', 'authentication', 'model-access', 'quota', null].includes(
          request.error_kind,
        )
      )
        throw new Pause('incomplete', request.error || 'Response incomplete; retry deliberately.');
      request = null;
    }
    if (!request) {
      if (!this.provider.config.enabled || !this.provider.config.validated)
        throw new Pause(
          'reactivation',
          'Activate AI in Settings to continue using the stored key.',
        );
      if (this.provider.active || this.provider.pendingInteractive) return;
      const body = await this.payload(j, phase);
      this.guard(id);
      if (this.provider.active || this.provider.pendingInteractive) return;
      const prompt = labJob ? adaptationInstructions[phase] : instructions[phase] + safety;
      const input = [{ role: 'user', content: json(body) }];
      const inputBound =
        Buffer.byteLength(json({ input, instructions: prompt, text: phaseSchema })) + 512;
      if (inputBound > 16000)
        throw new Pause(
          'context',
          'Evidence exceeds the request ceiling. Choose a narrower objective or smaller batch.',
        );
      this.hold(id);
      this.save(
        id,
        { message: `${phase} in progress.` },
        ['solve', 'review'].includes(phase) ? 'validating' : 'generating',
      );
      const requestId = this.provider.reserve({
        input,
        instructions: prompt,
        inputBound,
        maxOutputTokens: j.settings.maxOutputTokens,
        model: ['solve', 'review'].includes(phase)
          ? j.settings.reviewModel
          : j.settings.generationModel,
        operation: phase,
        promptVersion: labJob ? 'lab-adaptation-v1' : `${phase}-v2`,
        schema: phaseSchema,
        jobId: id,
        context: { sources: j.sources },
      });
      request = await this.provider.run(requestId);
      this.guard(id);
      if (!request || request.status !== 'completed') {
        if (request?.error_kind === 'rate-limit' && request.cost === 0 && j.retries < 3) {
          const delay = Math.max(request.retry_after || 0, 1000 * 2 ** j.retries);
          this.save(
            id,
            {
              retries: j.retries + 1,
              nextRetryAt: new Date(Date.now() + delay).toISOString(),
              message: 'Rate limited; waiting before a confirmed safe retry.',
            },
            'queued',
          );
          return;
        }
        if (request?.cost === null)
          throw new Pause(
            'unknown',
            'Paid submission outcome is unknown. Review usage and retry deliberately.',
          );
        if (['authentication', 'model-access', 'quota'].includes(request?.error_kind))
          throw new Pause(request.error_kind, request.error);
        throw new Pause('incomplete', request?.error || 'Response incomplete; retry deliberately.');
      }
    }
    j = this.guard(id);
    let output;
    try {
      output = JSON.parse(request.text);
      checkSchema(output, phaseSchema);
    } catch {
      throw new Pause(
        'incomplete',
        'The response did not satisfy the structured contract. Retry deliberately.',
      );
    }
    await this.acceptOutput(id, phase, output);
    this.guard(id);
    const next = labJob
      ? phase === 'generation'
        ? 'review'
        : 'publish'
      : (phase === 'analysis' && !output.misconceptions.length) ||
          (phase === 'generation' && !this.candidates(id).some((c) => c.status === 'pending'))
        ? 'publish'
        : phases[phases.indexOf(phase) + 1] || 'publish';
    this.save(
      id,
      {
        outputs: { ...this.job(id).outputs, [phase]: output },
        phase: next,
        retries: 0,
        nextRetryAt: null,
        message: `${phase} checkpoint saved.`,
      },
      'queued',
    );
  }
  async acceptOutput(id, phase, output) {
    if (this.job(id).kind === 'lab-adaptation')
      return this.labAdaptations.accept(this.job(id), phase, output);
    const j = this.job(id);
    if (phase === 'analysis') {
      for (const suspect of output.suspectQuestions) {
        const e = j.evidence.find((e) => e.question.id === suspect.questionId);
        ensure(e, 'Unknown source question in analysis.');
        if (!this.store.excluded(e.question, true))
          this.store.report({
            questionId: e.question.id,
            version: e.question.version,
            category: 'incorrect-answer',
            note: `AI analysis; requires review: ${suspect.reason}`.slice(0, 2000),
          });
      }
      output.misconceptions = output.misconceptions.filter(
        (m) =>
          j.evidence.some(
            (e) =>
              e.question.id === m.questionId &&
              e.question.primarySkillId === m.primarySkillId &&
              !this.store.excluded(e.question, true),
          ) && this.sourcesValid(m.sourceIds, j),
      );
      if (!output.misconceptions.length) {
        this.save(
          id,
          {
            message: 'No supported misconception remains.',
            phase: 'publish',
            outputs: { ...j.outputs, analysis: output },
          },
          'queued',
        );
        return;
      }
    }
    if (phase === 'generation') {
      ensure(output.candidates.length <= j.count, 'Too many generated candidates.');
      if (this.candidates(id).length) return;
      const rows = [];
      for (const raw of output.candidates) {
        const candidateId = randomUUID(),
          skill = skills.find((s) => s.id === raw.primarySkillId);
        const evidence = j.sources.filter((s) => raw.sourceIds.includes(s.id));
        const q = {
          ...raw,
          id: candidateId,
          version: 1,
          blueprintVersion: blueprint.version,
          domainId: skill?.domainId,
          objectiveId: skill?.objectiveId,
          familyId: candidateId,
          reviewedAt: now().slice(0, 10),
          mappingVersion,
          references: [
            ...new Map(evidence.map((s) => [s.url, { title: s.title, url: s.url }])).values(),
          ],
          source: {
            kind: 'ai-generated',
            jobId: id,
            model: j.settings.generationModel,
            reviewModel: j.settings.reviewModel,
            promptVersion: j.settings.promptVersion,
            reviewBasis: 'automated',
            evidence,
          },
        };
        let status = 'pending',
          findings = [];
        try {
          validateBank([q]);
          ensure(
            q.options.every((o) => o.id.trim() && o.text.trim() && o.rationale.trim()),
            'Empty option or rationale.',
          );
          ensure(this.sourcesValid(raw.sourceIds, j), 'Unresolved source evidence.');
          ensure(
            j.outputs.analysis.misconceptions.some((m) => m.primarySkillId === q.primarySkillId),
            'Unrelated primary skill.',
          );
          ensure(
            new Set(q.options.map((o) => normalizeQuestion(o.text))).size === q.options.length,
            'Duplicate option text.',
          );
          ensure(
            ![...this.store.bank, ...rows.map((r) => r.q)].some(
              (b) => normalizeQuestion(b.prompt) === normalizeQuestion(q.prompt),
            ),
            'Duplicate question.',
          );
        } catch (e) {
          status = 'rejected';
          findings = [e.message];
        }
        rows.push({ q, status, findings });
      }
      this.store.transaction(() => {
        for (const r of rows)
          this.db
            .prepare('INSERT INTO generation_candidates VALUES(?,?,?,?,?)')
            .run(r.q.id, id, r.status, json(r.q), json(r.findings));
      });
    }
    if (phase === 'solve' || phase === 'review') {
      const pending = this.candidates(id).filter((c) => c.status === 'pending');
      const results = phase === 'solve' ? output.answers : output.reviews;
      ensure(
        results.length === pending.length &&
          new Set(results.map((r) => r.id)).size === results.length &&
          results.every((r) => pending.some((c) => c.id === r.id)),
        'Incomplete or duplicate candidate review.',
      );
    }
  }
  publish(id) {
    const j = this.guard(id);
    if (j.kind === 'lab-adaptation') return this.labAdaptations.publish(id);
    this.store.transaction(() => {
      this.guard(id);
      for (const c of this.candidates(id).filter((c) => c.status === 'pending')) {
        const q = c.question,
          solve = j.outputs.solve?.answers.find((r) => r.id === c.id),
          review = j.outputs.review?.reviews.find((r) => r.id === c.id);
        let status = 'quarantined';
        const findings = [];
        if (solve && review) {
          findings.push(solve.reason, review.reason);
          const supports =
            this.sourcesValid(solve.sourceIds, j) && this.sourcesValid(review.sourceIds, j);
          const relevant = j.outputs.analysis.misconceptions.some(
            (m) =>
              m.primarySkillId === q.primarySkillId &&
              j.evidence.some(
                (e) => e.question.id === m.questionId && !this.store.excluded(e.question, true),
              ),
          );
          if (review.verdict === 'rejected') status = 'rejected';
          else if (
            review.verdict === 'accepted' &&
            supports &&
            relevant &&
            solve.supported &&
            !solve.ambiguous &&
            sameSelection(solve.correctOptionIds, q.correctOptionIds) &&
            new Set(solve.correctOptionIds).size === solve.correctOptionIds.length
          )
            status = 'accepted';
          if (review.familyId) {
            const family = this.store.bank.find(
              (b) => b.familyId === review.familyId && b.objectiveId === q.objectiveId,
            );
            if (family) q.familyId = family.familyId;
            else {
              if (status === 'accepted') status = 'quarantined';
              findings.push('Unresolved family relationship.');
            }
          } else {
            const neighbor = this.store.bank.find(
              (b) =>
                b.primarySkillId === q.primarySkillId && similarity(b.prompt, q.prompt) >= 0.65,
            );
            if (neighbor) q.familyId = neighbor.familyId;
          }
        }
        if (
          this.store.bank.some((b) => normalizeQuestion(b.prompt) === normalizeQuestion(q.prompt))
        ) {
          status = 'rejected';
          findings.push('Duplicate at publication.');
        }
        const previous = this.db
          .prepare('SELECT data FROM generated_questions')
          .all()
          .map((r) => JSON.parse(r.data));
        if (previous.some((b) => normalizeQuestion(b.prompt) === normalizeQuestion(q.prompt)))
          status = 'rejected';
        const sibling = previous.find(
          (b) => b.primarySkillId === q.primarySkillId && similarity(b.prompt, q.prompt) >= 0.65,
        );
        if (sibling) q.familyId = sibling.familyId;
        this.db
          .prepare('UPDATE generation_candidates SET status=?,data=?,findings=? WHERE id=?')
          .run(status, json(q), json(findings), c.id);
        if (status === 'accepted') {
          validateBank([q]);
          this.db
            .prepare('INSERT OR IGNORE INTO generated_questions VALUES(?,?,?)')
            .run(q.id, `${id}:${q.id}`, json(q));
        }
      }
      this.save(
        id,
        {
          message: this.counts(id).accepted
            ? 'Review complete. Accepted questions are available for new practice.'
            : 'Completed with no accepted questions. Inspect the evidence and review findings.',
          phase: 'completed',
        },
        'completed',
      );
      this.release(id);
    });
    this.store.refreshBank();
  }
  close() {
    this.closed = true;
    clearInterval(this.timer);
  }
}
