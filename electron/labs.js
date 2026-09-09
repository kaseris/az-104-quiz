import { learning } from './learning.js';
import { recommendLabs } from './lab-learning.js';
import { randomUUID } from 'node:crypto';
import { labs, labCatalogVersion } from '../content/labs.js';
import { validateLabs } from '../content/lab-contract.js';
import { ensure } from './validation.js';

function payload(value, keys) {
  ensure(value && typeof value === 'object' && !Array.isArray(value), 'Invalid lab request.');
  ensure(
    Object.keys(value).every((key) => keys.includes(key)),
    'Unknown lab request field.',
  );
  return value;
}
const idString = (id) => typeof id === 'string' && id.length > 0 && id.length <= 100;
export class LabStore {
  constructor(store, catalog = labs) {
    if (catalog.length) validateLabs(catalog);
    this.store = store;
    this.catalog = structuredClone(catalog);
  }
  summary(row) {
    const snapshot = JSON.parse(row.snapshot);
    return {
      id: row.id,
      labId: row.lab_id,
      title: snapshot.title,
      version: snapshot.version,
      method: row.method,
      status: row.status,
      domainId: snapshot.domainId,
      objectiveId: snapshot.objectiveId,
      problemKind: JSON.parse(row.evidence).problemKind,
      hintsRevealed: JSON.parse(row.progress).hintsRevealed,
      walkthroughRevealed: !!JSON.parse(row.progress).walkthroughRevealedAt,
      tutorRequests: this.store.db
        .prepare(
          "SELECT COUNT(*) n FROM ai_requests WHERE json_extract(context,'$.lab.attemptId')=?",
        )
        .get(row.id).n,
      reflectionSaved: !!JSON.parse(row.reflection).savedAt,
      reflectionAssessment: JSON.parse(row.reflection).assessment,
      reflectionCompared: !!JSON.parse(row.reflection).comparedAt,
      completedAt: row.completed_at,
      completionBasis: row.completion_basis,
      cleanupStatus: JSON.parse(row.cleanup).status,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    };
  }
  list() {
    const attempts = this.store.db
      .prepare('SELECT * FROM lab_attempts ORDER BY updated_at DESC, id')
      .all()
      .map((r) => this.summary(r));
    const quiz = learning(this.store.evidence(), this.store.eligible(), this.store.clock.wall());
    return {
      recommendations: recommendLabs(this.catalog, quiz.objectives, attempts),
      labs: this.catalog
        .filter((l) => l.status === 'released')
        .map((l) => ({
          id: l.id,
          title: l.title,
          domainId: l.domainId,
          objectiveId: l.objectiveId,
          primarySkillId: l.primarySkillId,
          goal: l.goal,
          duration: l.duration,
        })),
      attempts,
    };
  }
  row(id) {
    ensure(idString(id), 'Invalid lab attempt ID.');
    const row = this.store.db.prepare('SELECT * FROM lab_attempts WHERE id=?').get(id);
    ensure(row, 'This saved lab attempt was not found.');
    return row;
  }
  read(request) {
    const p = payload(request, ['id', 'labId']);
    ensure(Boolean(p.id) !== Boolean(p.labId), 'Choose a lab or a saved attempt.');
    if (p.id) {
      const row = this.row(p.id);
      return {
        ...this.summary(row),
        lab: JSON.parse(row.snapshot),
        progress: JSON.parse(row.progress),
        evidence: JSON.parse(row.evidence),
        cleanup: JSON.parse(row.cleanup),
        reflection: JSON.parse(row.reflection),
      };
    }
    ensure(idString(p.labId), 'Invalid lab ID.');
    const lab = this.catalog.find((l) => l.id === p.labId && l.status === 'released');
    ensure(lab, 'This lab is not available to start.');
    return { lab: structuredClone(lab) };
  }
  start(request) {
    const p = payload(request, ['labId', 'method', 'preflightReviewed', 'requestKey']);
    ensure(['portal', 'cli'].includes(p.method), 'Choose Portal or CLI.');
    ensure(
      p.preflightReviewed === true,
      'Review prerequisites, resources and cleanup before starting.',
    );
    ensure(
      p.requestKey === undefined || idString(p.requestKey),
      'Invalid new-attempt request key.',
    );
    const { lab } = this.read({ labId: p.labId });
    return this.store.transaction(() => {
      // A retry with the same request key returns the same attempt, even after completion.
      const existing = p.requestKey
        ? this.store.db.prepare('SELECT id FROM lab_attempts WHERE request_key=?').get(p.requestKey)
        : this.store.db
            .prepare(
              "SELECT id FROM lab_attempts WHERE lab_id=? AND status!='completed' ORDER BY started_at DESC,id LIMIT 1",
            )
            .get(lab.id);
      if (existing) {
        const attempt = this.read({ id: existing.id });
        ensure(
          attempt.labId === lab.id && attempt.method === p.method,
          'This lab already has a saved attempt. Resume its original method.',
        );
        return attempt;
      }
      const id = randomUUID();
      const now = this.store.now();
      this.store.db
        .prepare(
          'INSERT INTO lab_attempts(id,lab_id,snapshot,method,status,progress,started_at,updated_at,request_key) VALUES(?,?,?,?,?,?,?,?,?)',
        )
        .run(
          id,
          lab.id,
          JSON.stringify({ ...lab, catalogVersion: labCatalogVersion }),
          p.method,
          'in_progress',
          JSON.stringify({
            pane: 'goal',
            step: 0,
            hintsRevealed: 0,
            hintRevealedAt: [],
            walkthroughRevealedAt: null,
            preflightReviewedAt: now,
          }),
          now,
          now,
          p.requestKey ?? null,
        );
      return this.read({ id });
    });
  }
  update(request) {
    const p = payload(request, ['id', 'action', 'value']);
    return this.store.transaction(() => {
      const row = this.row(p.id);
      const lab = JSON.parse(row.snapshot);
      const progress = JSON.parse(row.progress);
      let status = row.status;
      const now = this.store.now();
      if (['pause', 'resume', 'awaiting'].includes(p.action)) {
        ensure(
          status !== 'completed',
          'Completed learning records are locked; start another attempt.',
        );
        ensure(p.value === undefined, 'Unexpected lab action value.');
        status =
          p.action === 'pause'
            ? 'paused'
            : p.action === 'awaiting'
              ? 'awaiting_evidence'
              : 'in_progress';
      } else {
        ensure(
          ['pane', 'step'].includes(p.action) || status === 'in_progress',
          'Resume the lab before changing your place.',
        );
        ensure(
          status !== 'paused' || p.action === 'pane',
          'Resume the lab before changing your place.',
        );
        if (p.action === 'hint') {
          ensure(
            Number.isInteger(p.value) &&
              p.value >= progress.hintsRevealed &&
              p.value <= progress.hintsRevealed + 1 &&
              p.value <= lab.hints.length,
            'Reveal hints in order.',
          );
          if (p.value > progress.hintsRevealed) progress.hintRevealedAt.push(now);
          progress.hintsRevealed = p.value;
        } else if (p.action === 'walkthrough') {
          ensure(p.value === undefined, 'Unexpected lab action value.');
          progress.walkthroughRevealedAt ||= now;
          progress.pane = 'walkthrough';
        } else if (p.action === 'pane') {
          ensure(['goal', 'walkthrough', 'cleanup'].includes(p.value), 'Invalid lab view.');
          ensure(
            p.value !== 'walkthrough' || progress.walkthroughRevealedAt,
            'Reveal the walkthrough first.',
          );
          progress.pane = p.value;
        } else if (p.action === 'step') {
          ensure(
            progress.walkthroughRevealedAt &&
              Number.isInteger(p.value) &&
              p.value >= 0 &&
              p.value < lab.methods[row.method].walkthrough.length,
            'Invalid walkthrough step.',
          );
          progress.step = p.value;
        } else throw new Error('Unknown lab action.');
      }
      this.store.db
        .prepare('UPDATE lab_attempts SET status=?,progress=?,updated_at=? WHERE id=?')
        .run(status, JSON.stringify(progress), now, row.id);
      return this.read({ id: row.id });
    });
  }
  evidence(request) {
    const p = payload(request, ['id', 'checklist', 'notes', 'output', 'problemKind']);
    return this.store.transaction(() => {
      const row = this.row(p.id);
      ensure(row.status !== 'completed', 'Completed evidence is locked; start another attempt.');
      const lab = JSON.parse(row.snapshot);
      ensure(
        Array.isArray(p.checklist) &&
          new Set(p.checklist).size === p.checklist.length &&
          p.checklist.every(
            (n) => Number.isInteger(n) && n >= 0 && n < lab.evidenceChecklist.length,
          ),
        'Invalid completion checklist.',
      );
      ensure(
        typeof p.notes === 'string' && p.notes.length <= 20000,
        'Notes must be at most 20,000 characters.',
      );
      ensure(
        typeof p.output === 'string' && p.output.length <= 64000,
        'Output must be at most 64,000 characters.',
      );
      ensure(
        ['none', 'environment', 'conceptual'].includes(p.problemKind),
        'Invalid problem category.',
      );
      this.store.db.prepare('UPDATE lab_attempts SET evidence=?,updated_at=? WHERE id=?').run(
        JSON.stringify({
          checklist: [...p.checklist].sort((a, b) => a - b),
          notes: p.notes,
          output: p.output,
          problemKind: p.problemKind,
        }),
        this.store.now(),
        row.id,
      );
      return this.read({ id: row.id });
    });
  }
  complete(request) {
    const p = payload(request, ['id']);
    return this.store.transaction(() => {
      const row = this.row(p.id);
      if (row.status === 'completed') return this.read({ id: row.id });
      const lab = JSON.parse(row.snapshot);
      const evidence = JSON.parse(row.evidence);
      ensure(
        evidence.checklist.length === lab.evidenceChecklist.length,
        'Finish the completion checklist before marking this attempt complete.',
      );
      const now = this.store.now();
      this.store.db
        .prepare(
          "UPDATE lab_attempts SET status='completed',completed_at=?,completion_basis='self_reported',updated_at=? WHERE id=?",
        )
        .run(now, now, row.id);
      return this.read({ id: row.id });
    });
  }
  cleanup(request) {
    const p = payload(request, ['id', 'status', 'note']);
    ensure(['pending', 'completed'].includes(p.status), 'Invalid cleanup state.');
    ensure(
      typeof p.note === 'string' && p.note.length <= 4000,
      'Cleanup note must be at most 4,000 characters.',
    );
    return this.store.transaction(() => {
      const row = this.row(p.id);
      const cleanup = JSON.parse(row.cleanup);
      if (cleanup.status !== p.status || cleanup.note !== p.note) {
        const now = this.store.now();
        cleanup.history.push({ status: p.status, note: p.note, at: now });
        Object.assign(cleanup, { status: p.status, note: p.note, updatedAt: now });
        this.store.db
          .prepare('UPDATE lab_attempts SET cleanup=?,updated_at=? WHERE id=?')
          .run(JSON.stringify(cleanup), now, row.id);
      }
      return this.read({ id: row.id });
    });
  }
  reflection(request) {
    const p = payload(request, ['id', 'action', 'answer', 'assessment']);
    ensure(['save', 'compare'].includes(p.action), 'Invalid reflection action.');
    if (p.action === 'save') {
      ensure(
        typeof p.answer === 'string' && p.answer.length <= 4000,
        'Reflection must be at most 4,000 characters.',
      );
      ensure(
        ['unanswered', 'needs_review', 'understood'].includes(p.assessment),
        'Invalid self-assessment.',
      );
      ensure(
        p.assessment === 'unanswered' || p.answer.trim().length > 0,
        'Write a reflection before assessing it.',
      );
    } else
      ensure(p.answer === undefined && p.assessment === undefined, 'Unexpected comparison fields.');
    return this.store.transaction(() => {
      const row = this.row(p.id);
      const reflection = JSON.parse(row.reflection);
      const now = this.store.now();
      if (p.action === 'compare') reflection.comparedAt ||= now;
      else Object.assign(reflection, { answer: p.answer, assessment: p.assessment, savedAt: now });
      this.store.db
        .prepare('UPDATE lab_attempts SET reflection=?,updated_at=? WHERE id=?')
        .run(JSON.stringify(reflection), now, row.id);
      return this.read({ id: row.id });
    });
  }
  link(request) {
    const p = payload(request, ['id', 'labId', 'url']);
    const { lab } = this.read(p.id ? { id: p.id } : { labId: p.labId });
    ensure(
      typeof p.url === 'string' &&
        [...lab.sources, ...lab.costs.sources].some((s) => s.url === p.url),
      'This link is not a lab source.',
    );
    const url = new URL(p.url);
    ensure(
      url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        ['learn.microsoft.com', 'azure.microsoft.com'].includes(url.hostname),
      'Invalid lab source URL.',
    );
    return p.url;
  }
}
