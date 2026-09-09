import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudyStore } from '../electron/store.js';
import { LabStore } from '../electron/labs.js';
import { labs } from '../content/labs.js';
import { migrate, schemaVersion } from '../electron/migrations.js';
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-labs-'));
  const path = join(dir, 'study.sqlite');
  let store = new StudyStore(path);
  let service = new LabStore(store);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    dir,
    path,
    get store() {
      return store;
    },
    get service() {
      return service;
    },
    reopen(catalog = labs) {
      store.close();
      store = new StudyStore(path);
      service = new LabStore(store, catalog);
    },
  };
}
const start = (f, labId = 'rg-tags', method = 'portal') =>
  f.service.start({ labId, method, preflightReviewed: true });
test('saved lab methods, place, exposures and pause survive restart without changing quiz evidence', (t) => {
  const f = fixture(t);
  const quiz = f.store.start({ count: 5, domainId: 'all' });
  const before = f.store.session(quiz.id);
  const attempt = start(f);
  assert.equal(f.service.list().labs.length, 2);
  assert.equal(start(f).id, attempt.id);
  assert.equal(f.service.list().attempts.length, 1);
  f.service.update({ id: attempt.id, action: 'hint', value: 1 });
  f.service.update({ id: attempt.id, action: 'hint', value: 1 }); // deliberate retry is idempotent
  f.service.update({ id: attempt.id, action: 'walkthrough' });
  f.service.update({ id: attempt.id, action: 'step', value: 1 });
  const saved = f.service.update({ id: attempt.id, action: 'pause' });
  assert.equal(saved.progress.hintRevealedAt.length, 1);
  assert.throws(() => f.service.update({ id: attempt.id, action: 'step', value: 0 }), /Resume/);
  f.reopen();
  assert.deepEqual(f.service.read({ id: attempt.id }), saved);
  assert.equal(f.service.update({ id: attempt.id, action: 'resume' }).progress.step, 1);
  assert.deepEqual(f.store.session(quiz.id).items, before.items);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM ai_requests').get().n, 0);
  assert.equal(
    f.store.db.prepare('SELECT COUNT(*) n FROM session_items WHERE submitted_at IS NOT NULL').get()
      .n,
    0,
  );
});
test('catalog revisions and retirement never replace existing attempt instructions or allow new unreleased starts', (t) => {
  const f = fixture(t);
  const saved = start(f, 'vnet-two-subnets', 'cli');
  const changed = structuredClone(labs);
  changed[1].goal = 'New instructions';
  changed[1].version = 2;
  changed[1].status = 'unreleased';
  changed[1].verification = { portal: { status: 'pending' }, cli: { status: 'pending' } };
  f.reopen(changed);
  assert.equal(f.service.list().labs.length, 1);
  assert.deepEqual(f.service.read({ id: saved.id }).lab, saved.lab);
  assert.throws(() => start(f, 'vnet-two-subnets', 'cli'), /not available/);
  f.reopen([]);
  assert.equal(f.service.list().labs.length, 0);
  assert.equal(f.service.list().attempts.length, 1);
  assert.deepEqual(f.service.read({ id: saved.id }).lab, saved.lab);
  assert.equal(
    f.service.update({ id: saved.id, action: 'walkthrough' }).progress.pane,
    'walkthrough',
  );
});
test('IPC-shaped requests reject forged content, unsupported methods/actions and invalid reveal/navigation without writes', (t) => {
  const f = fixture(t);
  for (const p of [
    null,
    [],
    {},
    { labId: 'rg-tags', method: 'cli' },
    { labId: 'rg-tags', method: 'powershell', preflightReviewed: true },
    { labId: 'rg-tags', method: 'cli', preflightReviewed: true, snapshot: {} },
  ])
    assert.throws(() => f.service.start(p));
  const a = start(f);
  assert.throws(() => start(f, 'rg-tags', 'cli'), /original method/);
  for (const p of [
    { action: 'hint', value: 2 },
    { action: 'hint', value: -1 },
    { action: 'step', value: 0 },
    { action: 'pane', value: 'walkthrough' },
    { action: 'pane', value: 'unknown' },
    { action: 'complete' },
    { action: 'pause', value: true },
    { action: 'hint', value: 1, snapshot: {} },
  ])
    assert.throws(() => f.service.update({ id: a.id, ...p }));
  assert.deepEqual(f.service.read({ id: a.id }), a);
  assert.throws(() => f.service.read({ id: a.id, labId: 'rg-tags' }));
  assert.throws(() => f.service.read({ id: 'missing' }));
  f.service.update({ id: a.id, action: 'walkthrough' });
  assert.throws(() => f.service.update({ id: a.id, action: 'step', value: 999 }));
  assert.equal(f.service.link({ id: a.id, url: a.lab.sources[0].url }), a.lab.sources[0].url);
  assert.throws(() => f.service.link({ id: a.id, url: 'https://example.com' }));
  assert.throws(() => f.service.link({ id: a.id, url: 'file:///tmp/test' }));
});
test('write failure rolls back exposure and permits a deliberate retry', (t) => {
  const f = fixture(t);
  const a = start(f);
  f.store.db.exec(
    "CREATE TRIGGER fail_lab_update BEFORE UPDATE ON lab_attempts BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END;",
  );
  assert.throws(() => f.service.update({ id: a.id, action: 'hint', value: 1 }));
  assert.deepEqual(f.service.read({ id: a.id }), a);
  f.store.db.exec('DROP TRIGGER fail_lab_update');
  const after = f.service.update({ id: a.id, action: 'hint', value: 1 });
  assert.equal(after.progress.hintsRevealed, 1);
  assert.equal(after.progress.hintRevealedAt.length, 1);
});
test('stage 5 upgrade backs up and preserves quiz and queue rows; failed migration rolls back', (t) => {
  const f = fixture(t);
  const quiz = f.store.start({ count: 5, domainId: 'all' });
  const before = f.store.session(quiz.id).items;
  f.store.db
    .prepare('INSERT INTO generation_jobs VALUES(?,?,?,?,?)')
    .run('saved-job', 'paused', '{}', '2026-09-07', '2026-09-07');
  f.store.db.exec(
    'DROP TABLE IF EXISTS portable_messages; DROP TABLE IF EXISTS portable_questions; DROP TABLE lab_attempts; PRAGMA user_version=5',
  );
  f.reopen();
  assert.equal(f.store.db.prepare('PRAGMA user_version').get().user_version, schemaVersion);
  assert.deepEqual(f.store.session(quiz.id).items, before);
  assert.equal(
    f.store.db.prepare('SELECT status FROM generation_jobs WHERE id=?').get('saved-job').status,
    'paused',
  );
  const backup = readdirSync(f.dir).find((n) => n.includes('.v5.') && n.endsWith('.backup'));
  assert.ok(backup);
  const old = new DatabaseSync(join(f.dir, backup), { readOnly: true });
  assert.equal(old.prepare('PRAGMA user_version').get().user_version, 5);
  old.close();
  const bad = new DatabaseSync(':memory:');
  try {
    bad.exec(
      "CREATE TABLE lab_attempts(marker TEXT); INSERT INTO lab_attempts VALUES('keep'); PRAGMA user_version=5",
    );
    assert.throws(() => migrate(bad, ':memory:'));
    assert.equal(bad.prepare('PRAGMA user_version').get().user_version, 5);
    assert.equal(bad.prepare('SELECT marker FROM lab_attempts').get().marker, 'keep');
  } finally {
    bad.close();
  }
});

test('evidence survives restart, completion is self-reported and immutable, cleanup remains independent', (t) => {
  const f = fixture(t);
  const a = start(f);
  const evidence = {
    checklist: [0, 1, 2],
    notes: 'Tags checked',
    output: '<script>never execute</script>',
    problemKind: 'environment',
  };
  assert.throws(() => f.service.complete({ id: a.id }), /checklist/);
  f.service.update({ id: a.id, action: 'hint', value: 1 });
  f.service.evidence({ id: a.id, ...evidence });
  f.service.update({ id: a.id, action: 'awaiting' });
  f.reopen();
  assert.equal(f.service.read({ id: a.id }).status, 'awaiting_evidence');
  assert.deepEqual(f.service.read({ id: a.id }).evidence, evidence);
  const done = f.service.complete({ id: a.id });
  assert.equal(done.completionBasis, 'self_reported');
  assert.equal(done.cleanupStatus, 'pending');
  assert.equal(done.progress.hintsRevealed, 1);
  assert.deepEqual(f.service.complete({ id: a.id }), done);
  assert.throws(() => f.service.evidence({ id: a.id, ...evidence, notes: 'overwrite' }), /locked/);
  for (const action of ['pause', 'resume', 'awaiting', 'hint', 'walkthrough'])
    assert.throws(() =>
      f.service.update({ id: a.id, action, ...(action === 'hint' ? { value: 2 } : {}) }),
    );
  f.service.cleanup({ id: a.id, status: 'pending', note: 'Keeping resources until tomorrow' });
  const clean = f.service.cleanup({
    id: a.id,
    status: 'completed',
    note: 'Dedicated group deleted; absent in Portal',
  });
  assert.equal(clean.completedAt, done.completedAt);
  assert.deepEqual(clean.evidence, done.evidence);
  assert.equal(clean.cleanup.history.length, 2);
  assert.deepEqual(
    f.service.cleanup({ id: a.id, status: 'completed', note: clean.cleanup.note }),
    clean,
  );
  f.reopen();
  assert.deepEqual(f.service.read({ id: a.id }), clean);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM ai_requests').get().n, 0);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM session_items').get().n, 0);
});
test('new attempt keys are idempotent and preserve independent methods, evidence and snapshots', (t) => {
  const f = fixture(t);
  const p = { labId: 'rg-tags', method: 'portal', preflightReviewed: true, requestKey: 'one' };
  const first = f.service.start(p);
  f.service.evidence({
    id: first.id,
    checklist: [0, 1, 2],
    notes: 'First',
    output: '',
    problemKind: 'none',
  });
  const done = f.service.complete({ id: first.id });
  assert.deepEqual(f.service.start(p), done);
  const second = f.service.start({ ...p, method: 'cli', requestKey: 'two' });
  assert.notEqual(second.id, first.id);
  assert.equal(second.method, 'cli');
  assert.deepEqual(second.evidence.checklist, []);
  assert.equal(second.progress.hintsRevealed, 0);
  assert.equal(second.cleanupStatus, 'pending');
  assert.throws(() => f.service.start({ ...p, method: 'cli' }));
  f.service.evidence({
    id: second.id,
    checklist: [],
    notes: 'Second',
    output: 'Result',
    problemKind: 'conceptual',
  });
  assert.deepEqual(f.service.read({ id: first.id }), done);
  assert.equal(f.service.list().attempts.length, 2);
});
test('invalid or failed evidence and cleanup updates leave saved data intact', (t) => {
  const f = fixture(t);
  const a = start(f);
  const valid = { id: a.id, checklist: [], notes: '', output: '', problemKind: 'none' };
  for (const patch of [
    { checklist: [0, 0] },
    { checklist: [99] },
    { checklist: ['0'] },
    { notes: 'x'.repeat(20001) },
    { output: 'x'.repeat(64001) },
    { problemKind: 'verified' },
    { completionBasis: 'azure' },
  ])
    assert.throws(() => f.service.evidence({ ...valid, ...patch }));
  assert.throws(() => f.service.complete({ id: a.id, completionBasis: 'ai_reviewed' }));
  assert.throws(() => f.service.cleanup({ id: a.id, status: 'verified', note: '' }));
  assert.throws(() => f.service.cleanup({ id: a.id, status: 'completed', note: 'x'.repeat(4001) }));
  assert.deepEqual(f.service.read({ id: a.id }), a);
  f.store.db.exec(
    "CREATE TRIGGER fail_lab_evidence BEFORE UPDATE ON lab_attempts BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;",
  );
  assert.throws(() => f.service.evidence({ ...valid, notes: 'Must survive retry' }));
  assert.throws(() => f.service.cleanup({ id: a.id, status: 'completed', note: '' }));
  assert.deepEqual(f.service.read({ id: a.id }), a);
  f.store.db.exec('DROP TRIGGER fail_lab_evidence');
  assert.equal(
    f.service.evidence({ ...valid, notes: 'Must survive retry' }).evidence.notes,
    'Must survive retry',
  );
});
test('schema 6 migration preserves existing lab snapshots and exposures with unknown cleanup pending', (t) => {
  const f = fixture(t);
  const a = start(f);
  f.service.update({ id: a.id, action: 'hint', value: 1 });
  const old = f.service.update({ id: a.id, action: 'pause' });
  f.store.db.exec(`
    CREATE TABLE old_labs (id TEXT PRIMARY KEY,lab_id TEXT NOT NULL UNIQUE,snapshot TEXT NOT NULL,method TEXT NOT NULL,status TEXT NOT NULL,progress TEXT NOT NULL,started_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO old_labs SELECT id,lab_id,snapshot,method,status,progress,started_at,updated_at FROM lab_attempts;
    DROP TABLE IF EXISTS portable_messages; DROP TABLE IF EXISTS portable_questions; DROP TABLE lab_attempts; ALTER TABLE old_labs RENAME TO lab_attempts; PRAGMA user_version=6;
  `);
  f.reopen();
  const restored = f.service.read({ id: a.id });
  assert.deepEqual(restored.lab, old.lab);
  assert.deepEqual(restored.progress, old.progress);
  assert.equal(restored.status, 'paused');
  assert.equal(restored.cleanupStatus, 'pending');
  assert.equal(restored.completionBasis, null);
  assert.deepEqual(restored.evidence, {
    checklist: [],
    notes: '',
    output: '',
    problemKind: 'none',
  });
  assert.ok(readdirSync(f.dir).some((n) => n.includes('.v6.') && n.endsWith('.backup')));
  const next = f.service.start({
    labId: 'rg-tags',
    method: 'cli',
    preflightReviewed: true,
    requestKey: 'new-after-upgrade',
  });
  assert.notEqual(next.id, a.id);
  assert.deepEqual(f.service.read({ id: a.id }), restored);
});

test('schema 7 rebuild failure preserves the schema 6 table and creates a recovery backup', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-v7-rollback-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'study.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec(`CREATE TABLE lab_attempts(id TEXT PRIMARY KEY,lab_id TEXT UNIQUE,snapshot TEXT,method TEXT,status TEXT,progress TEXT,started_at TEXT,updated_at TEXT);
      INSERT INTO lab_attempts VALUES('old','rg-tags','original','portal','paused','preserved','before','before');
      CREATE TABLE lab_attempts_next(marker TEXT); PRAGMA user_version=6;`);
    assert.throws(() => migrate(db, path));
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 6);
    assert.equal(db.prepare('SELECT snapshot FROM lab_attempts').get().snapshot, 'original');
    assert.equal(db.prepare('SELECT progress FROM lab_attempts').get().progress, 'preserved');
    assert.ok(readdirSync(dir).some((name) => name.includes('.v6.') && name.endsWith('.backup')));
  } finally {
    db.close();
  }
});

test('6A.3 drafts cannot be listed, read as new labs or started', (t) => {
  const f = fixture(t);
  for (const lab of labs.filter((l) => l.status === 'unreleased')) {
    assert.ok(!f.service.list().labs.some((l) => l.id === lab.id));
    assert.throws(() => f.service.read({ labId: lab.id }));
    for (const method of ['portal', 'cli'])
      assert.throws(() => f.service.start({ labId: lab.id, method, preflightReviewed: true }));
  }
  assert.equal(f.service.list().attempts.length, 0);
});

test('reflection persists independently after completion without changing quiz evidence or cleanup', (t) => {
  const f = fixture(t);
  const a = start(f);
  f.service.evidence({
    id: a.id,
    checklist: a.lab.evidenceChecklist.map((_, i) => i),
    notes: 'Original',
    output: '',
    problemKind: 'none',
  });
  const completed = f.service.complete({ id: a.id });
  const quizBefore = f.store.evidence();
  const snapshotBefore = f.store.db
    .prepare('SELECT snapshot FROM lab_attempts WHERE id=?')
    .get(a.id).snapshot;
  const saved = f.service.reflection({
    id: a.id,
    action: 'save',
    answer: 'Tags describe purpose; merge retains unrelated tags.',
    assessment: 'understood',
  });
  assert.ok(saved.reflection.savedAt);
  assert.equal(saved.reflection.comparedAt, null);
  const compared = f.service.reflection({ id: a.id, action: 'compare' });
  assert.ok(compared.reflection.comparedAt);
  assert.equal(
    f.service.reflection({ id: a.id, action: 'compare' }).reflection.comparedAt,
    compared.reflection.comparedAt,
  );
  f.reopen();
  const restored = f.service.read({ id: a.id });
  assert.deepEqual(restored.reflection, compared.reflection);
  assert.deepEqual(restored.evidence, completed.evidence);
  assert.deepEqual(restored.cleanup, completed.cleanup);
  assert.deepEqual(restored.progress, completed.progress);
  assert.equal(restored.completedAt, completed.completedAt);
  assert.deepEqual(f.store.evidence(), quizBefore);
  assert.equal(
    f.store.db.prepare('SELECT snapshot FROM lab_attempts WHERE id=?').get(a.id).snapshot,
    snapshotBefore,
  );
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM ai_requests').get().n, 0);
  assert.equal(f.service.list().attempts[0].reflectionAssessment, 'understood');
  const second = f.service.start({
    labId: a.labId,
    method: 'cli',
    preflightReviewed: true,
    requestKey: 'reflection-repeat',
  });
  assert.deepEqual(second.reflection, {
    answer: '',
    assessment: 'unanswered',
    savedAt: null,
    comparedAt: null,
  });
});
test('invalid reflection requests and failed writes preserve the saved answer', (t) => {
  const f = fixture(t);
  const a = start(f);
  const valid = { id: a.id, action: 'save', answer: 'A reflection', assessment: 'needs_review' };
  const before = f.service.reflection(valid);
  for (const patch of [
    { answer: 'x'.repeat(4001) },
    { answer: null },
    { assessment: 'verified' },
    { answer: ' ' },
    { savedAt: 'forged' },
    { action: 'compare', answer: 'spoofed' },
    { id: 'missing' },
  ])
    assert.throws(() => f.service.reflection({ ...valid, ...patch }));
  f.store.db.exec(
    "CREATE TRIGGER reject_reflection BEFORE UPDATE OF reflection ON lab_attempts BEGIN SELECT RAISE(ABORT,'write failed'); END;",
  );
  assert.throws(
    () => f.service.reflection({ ...valid, answer: 'Keep this draft in UI' }),
    /write failed/,
  );
  assert.deepEqual(f.service.read({ id: a.id }), before);
});
test('schema 8 initializes reflection without inventing historical answers and preserves saved attempts', (t) => {
  const f = fixture(t);
  const a = start(f);
  const before = f.service.read({ id: a.id });
  f.store.db.exec(
    'DROP TABLE IF EXISTS portable_messages; DROP TABLE IF EXISTS portable_questions; ALTER TABLE lab_attempts DROP COLUMN reflection; PRAGMA user_version=7;',
  );
  f.reopen();
  assert.deepEqual(f.service.read({ id: a.id }), before);
  assert.equal(f.store.db.prepare('PRAGMA user_version').get().user_version, schemaVersion);
  assert.ok(readdirSync(f.dir).some((n) => n.includes('.v7.') && n.endsWith('.backup')));
});
test('schema 8 failure rolls back version and preserves existing content', (t) => {
  const f = fixture(t);
  const a = start(f);
  f.store.db.exec('PRAGMA user_version=7;');
  assert.throws(() => migrate(f.store.db, f.path), /duplicate column/);
  assert.equal(f.store.db.prepare('PRAGMA user_version').get().user_version, 7);
  assert.equal(f.service.read({ id: a.id }).lab.id, 'rg-tags');
  f.store.db.exec('PRAGMA user_version=8;');
});
