import { questions as fullBank } from '../content/questions.js';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudyStore } from '../electron/store.js';
import { starterQuestions as questions } from '../content/questions.js';
import { objectives, skills, domains } from '../content/catalog.js';
import { allocate, examSelect, select } from '../electron/scheduler.js';
import { learning, DAY } from '../electron/learning.js';
function bank() {
  return domains.flatMap((d, k) =>
    Array.from({ length: [23, 18, 24, 20, 15][k] }, (_, i) => {
      const obj = objectives.filter((o) => o.domainId === d.id)[
        i % objectives.filter((o) => o.domainId === d.id).length
      ];
      return {
        ...questions.find((q) => q.domainId === d.id),
        id: `test-${d.id}-${i}`,
        familyId: `family-${d.id}-${i}`,
        objectiveId: obj.id,
        primarySkillId: skills.find((s) => s.objectiveId === obj.id).id,
      };
    }),
  );
}
function fixture(t, custom = questions) {
  const dir = mkdtempSync(join(tmpdir(), 'stage2-'));
  const path = join(dir, 'db');
  let wall = Date.parse('2026-09-06T12:00:00Z'),
    mono = 100000,
    up = 100000;
  const clock = { wall: () => wall, mono: () => mono, uptime: () => up };
  let store = new StudyStore(path, custom, clock);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    get s() {
      return store;
    },
    path,
    dir,
    tick(ms) {
      wall += ms;
      mono += ms;
      up += ms;
    },
    rollback(ms) {
      wall -= ms;
    },
    reboot() {
      up = 0;
      mono = 0;
    },
    reopen(b = custom) {
      store.close();
      store = new StudyStore(path, b, clock);
    },
  };
}
const answer = (s, correct = true) => {
  const item = s.items[s.cursor];
  return {
    sessionId: s.id,
    questionId: item.question.id,
    selectedOptionIds: correct
      ? (questions.find((q) => q.id === item.question.id)?.correctOptionIds ?? ['o1'])
      : [],
    durationMs: 10,
    revision: item.revision,
    confidence: 'confident',
  };
};
test('largest remainder is deterministic for every supported exam size', () => {
  assert.deepEqual(allocate(50, [23, 18, 24, 20, 15]), [12, 9, 12, 10, 7]);
  for (const count of [10, 20, 50]) {
    const x = examSelect(bank(), count, 'seed');
    assert.equal(x.chosen.length, count);
    assert.equal(x.shortages.length, 0);
    assert.equal(new Set(x.chosen.map((x) => x.question.familyId)).size, count);
    assert.deepEqual(x, examSelect(bank(), count, 'seed'));
  }
});
test('exam hides answers in session and state, saves flags/drafts, and finalizes once', (t) => {
  const f = fixture(t, bank());
  let s = f.s.start({ mode: 'exam', count: 50 });
  assert.equal(s.correct, null);
  assert.equal(JSON.stringify(s).includes('correctOptionIds'), false);
  assert.equal(f.s.state().sessions[0].correct, null);
  s = f.s.draft({ ...answer(s), selectedOptionIds: ['o1'] });
  assert.throws(() => f.s.draft({ ...answer(s), revision: 0 }), /changed/);
  s = f.s.flag({
    sessionId: s.id,
    questionId: s.items[0].question.id,
    flagged: true,
    revision: s.items[0].revision,
  });
  s = f.s.navigate({ sessionId: s.id, position: 49 });
  f.reopen();
  s = f.s.session(s.id);
  assert.equal(s.items[0].flagged, true);
  assert.equal(s.correct, null);
  assert.throws(() => f.s.submit(answer(s)), /Finalize/);
  assert.throws(() => f.s.finalize({ sessionId: s.id }), /unanswered/);
  s = f.s.finalize({ sessionId: s.id, confirmUnanswered: true });
  assert.equal(s.answered, 50);
  assert.ok(s.completedAt);
  assert.equal(s.items[49].correct, false);
  assert.deepEqual(f.s.finalize({ sessionId: s.id }), s);
  assert.throws(() => f.s.draft(answer(s)), /not active/);
});
test('timed restart retains deadline, expiry grades drafts once, rollback and reboot invalidate timing', (t) => {
  const f = fixture(t, bank());
  let s = f.s.start({ mode: 'exam', count: 10, timed: true, durationMinutes: 1 });
  const deadline = s.deadline;
  f.tick(20000);
  f.reopen();
  s = f.s.session(s.id);
  assert.equal(s.deadline, deadline);
  assert.equal(s.timingStatus, 'timed');
  f.tick(40001);
  s = f.s.session(s.id);
  assert.ok(s.completedAt);
  assert.equal(s.correct, 0);
  const at = s.completedAt;
  f.tick(10000);
  assert.equal(f.s.session(s.id).completedAt, at);
  s = f.s.start({ mode: 'exam', count: 10, timed: true });
  f.rollback(10000);
  assert.equal(f.s.session(s.id).timingStatus, 'invalid');
  f.s.finalize({ sessionId: s.id, confirmUnanswered: true });
  s = f.s.start({ mode: 'exam', count: 10, timed: true });
  f.reboot();
  f.reopen();
  assert.equal(f.s.session(s.id).timingStatus, 'invalid');
});
test('cold start coverage, cooldown scarcity, explicit repeats and reproducible selection', (t) => {
  const f = fixture(t);
  let s = f.s.start({ mode: 'adaptive', count: 20 });
  assert.equal(new Set(s.items.map((i) => i.question.domainId)).size, 5);
  assert.ok(s.items.every((i) => i.reason === 'Not practiced yet'));
  for (let i = 0; i < 20; i++) {
    s = f.s.submit(answer(s));
    s = f.s.advance({ sessionId: s.id, questionId: s.items[s.cursor].question.id });
  }
  assert.equal(f.s.preview({ mode: 'adaptive', count: 10 }).available, 0);
  assert.throws(() => f.s.start({ mode: 'adaptive', count: 10 }), /eligible/);
  assert.equal(f.s.preview({ mode: 'adaptive', count: 10, repeatHeavy: true }).available, 10);
  const a = f.s.plan({ mode: 'adaptive', count: 10, repeatHeavy: true }, 'fixed');
  const b = f.s.plan({ mode: 'adaptive', count: 10, repeatHeavy: true }, 'fixed');
  assert.deepEqual(a.result, b.result);
});
test('disputes preserve score, exclude evidence, require explanation, and correction is version-aware', (t) => {
  const f = fixture(t);
  let s = f.s.start({ count: 5 });
  s = f.s.submit(answer(s));
  const q = s.items[0].question;
  let issues = f.s.report({ questionId: q.id, version: q.version, category: 'incorrect-answer' });
  assert.equal(f.s.session(s.id).correct, 1);
  assert.equal(f.s.evidence()[0].excluded, true);
  assert.ok(!f.s.eligible().some((x) => x.id === q.id));
  assert.throws(() => f.s.resolve({ id: issues[0].id, status: 'dismissed', note: '' }), /Explain/);
  f.s.resolve({ id: issues[0].id, status: 'dismissed', note: 'Verified against reference' });
  assert.equal(f.s.evidence()[0].excluded, false);
  issues = f.s
    .report({ questionId: q.id, version: 1, category: 'outdated-content' })
    .filter((i) => i.status === 'pending');
  const updated = structuredClone(questions);
  const replacement = updated.find((x) => x.id === q.id);
  replacement.version = 2;
  replacement.correctsVersions = [1];
  f.reopen(updated);
  assert.equal(f.s.issues().find((i) => i.id === issues[0].id).status, 'corrected');
  assert.equal(f.s.session(s.id).items[0].question.version, 1);
  assert.equal(f.s.session(s.id).correct, 1);
  assert.ok(f.s.eligible().some((x) => x.id === q.id && x.version === 2));
});
test('independent evidence is family-balanced, excludes unknown assistance and does not extend immediate review', () => {
  const q = questions[0],
    row = {
      questionId: q.id,
      primarySkillId: q.primarySkillId,
      objectiveId: q.objectiveId,
      domainId: q.domainId,
      familyId: q.familyId,
      assistance: 'none',
      priorExposure: false,
      mode: 'study',
      excluded: false,
    };
  const rows = Array.from({ length: 12 }, (_, i) => ({
    ...row,
    key: String(i),
    at: new Date(i * 1000).toISOString(),
    correct: i > 0,
  }));
  const l = learning(rows, questions, DAY);
  const s = l.skills.find((x) => x.id === q.primarySkillId);
  assert.equal(s.distinctFamilies, 1);
  assert.equal(s.state, 'Insufficient evidence');
  assert.deepEqual(s.first, { correct: 0, total: 1 });
  assert.equal(l.families[q.familyId].due, DAY);
  rows[0].assistance = 'unknown';
  assert.equal(
    learning(rows, questions, DAY).skills.find((x) => x.id === q.primarySkillId).unassisted.total,
    0,
  );
});
test('overlapping pools and family variants never duplicate selection', () => {
  const base = bank();
  const variant = { ...base[0], id: 'variant' };
  const rows = base.slice(0, 15).map((q, i) => ({
    ...q,
    questionId: q.id,
    key: String(i),
    at: new Date(0).toISOString(),
    correct: false,
    assistance: 'none',
    priorExposure: false,
  }));
  const stats = learning(rows, base, 2 * DAY),
    config = {
      count: 20,
      domainIds: domains.map((d) => d.id),
      cooldownHours: 24,
      repeatHeavy: false,
    };
  const r = select({ bank: [...base, variant], stats, config, seed: 'overlap', now: 2 * DAY });
  assert.equal(r.chosen.length, 20);
  assert.equal(new Set(r.chosen.map((x) => x.question.familyId)).size, 20);
  assert.ok(r.chosen.some((x) => x.pool === 'unseen'));
  assert.ok(r.chosen.filter((x) => x.pool === 'weak').length >= 5);
});
test('v1 upgrade preserves raw snapshot and scores and makes a consistent backup', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'legacy-')),
    path = join(dir, 'db');
  const db = new DatabaseSync(path),
    q = questions[0],
    snapshot = JSON.stringify(q);
  db.exec(
    `CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE sessions(id TEXT PRIMARY KEY,started_at TEXT NOT NULL,completed_at TEXT,domain_id TEXT NOT NULL,blueprint_version TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0);CREATE UNIQUE INDEX one_active_session ON sessions((1)) WHERE completed_at IS NULL;CREATE TABLE session_items(session_id TEXT NOT NULL REFERENCES sessions(id),position INTEGER NOT NULL,question_id TEXT NOT NULL,snapshot TEXT NOT NULL,selected TEXT NOT NULL DEFAULT '[]',submitted_at TEXT,correct INTEGER,duration_ms INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session_id,position),UNIQUE(session_id,question_id));PRAGMA user_version=1;`,
  );
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,0)').run(
    'old',
    '2026-01-01',
    '2026-01-02',
    'all',
    '2026-04-17',
  );
  db.prepare('INSERT INTO session_items VALUES (?,0,?,?,?,?,1,123)').run(
    'old',
    q.id,
    snapshot,
    JSON.stringify(q.correctOptionIds),
    '2026-01-01',
  );
  db.close();
  const store = new StudyStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  assert.equal(store.session('old').correct, 1);
  assert.equal(store.db.prepare('SELECT snapshot FROM session_items').get().snapshot, snapshot);
  assert.equal(store.evidence()[0].assistance, 'unknown');
  const backup = readdirSync(dir).find((x) => x.endsWith('.backup'));
  assert.ok(backup);
  const old = new DatabaseSync(join(dir, backup));
  assert.equal(old.prepare('PRAGMA user_version').get().user_version, 1);
  old.close();
});

test('reviewed content gate has 100 attributed items, complete groups and enough independent families', () => {
  assert.equal(fullBank.length, 100);
  assert.equal(new Set(fullBank.map((q) => q.prompt)).size, 100);
  assert.equal(new Set(fullBank.map((q) => q.familyId)).size, 92);
  assert.deepEqual(
    domains.map((d) => fullBank.filter((q) => q.domainId === d.id).length),
    [23, 18, 24, 20, 15],
  );
  assert.ok(objectives.every((o) => fullBank.some((q) => q.objectiveId === o.id)));
  const audit = JSON.parse(
    readFileSync(new URL('../docs/STAGE2_CONTENT_AUDIT.json', import.meta.url), 'utf8'),
  );
  assert.equal(audit.length, 80);
  for (const a of audit) {
    assert.match(a.documentation.sha256, /^[a-f0-9]{64}$/);
    const q = fullBank.find((q) => q.id === a.questionId);
    assert.equal(q.primarySkillId, a.primarySkillId);
    assert.equal(q.source.url, a.sourceUrl);
    assert.equal(q.references[0].url, a.documentation.url);
  }
  assert.equal(examSelect(fullBank, 50, 'content').shortages.length, 0);
});
test('failed migration rolls all schema changes back and retains backup; future version refuses writes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'migration-failure-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'db');
  let db = new DatabaseSync(path);
  db.exec(
    'CREATE TABLE sessions(id TEXT); CREATE TABLE session_items(id TEXT); CREATE TABLE issues(id TEXT); PRAGMA user_version=1;',
  );
  db.close();
  assert.throws(() => new StudyStore(path), /already exists/);
  db = new DatabaseSync(path);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  assert.ok(
    !db
      .prepare('PRAGMA table_info(sessions)')
      .all()
      .some((c) => c.name === 'mode'),
  );
  assert.ok(readdirSync(dir).some((x) => x.endsWith('.backup')));
  db.exec('PRAGMA user_version=99');
  db.close();
  assert.throws(() => new StudyStore(path), /newer app/);
  db = new DatabaseSync(path);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 99);
  db.close();
});
test('small clock discrepancies cannot accumulate time across restarts', (t) => {
  const f = fixture(t, bank());
  const s = f.s.start({ mode: 'exam', count: 10, timed: true, durationMinutes: 1 });
  for (let i = 0; i < 5; i++) {
    f.tick(10000);
    f.rollback(500);
    f.reopen();
    assert.ok(f.s.session(s.id).remainingMs <= 60000 - (i + 1) * 10000);
  }
  f.tick(10001);
  assert.ok(f.s.session(s.id).completedAt);
});
test('improving and weak evidence states require distinct first families', () => {
  const q = questions[0];
  const rows = Array.from({ length: 10 }, (_, i) => ({
    questionId: `q${i}`,
    familyId: `f${i}`,
    key: `k${i}`,
    primarySkillId: q.primarySkillId,
    objectiveId: q.objectiveId,
    domainId: q.domainId,
    at: new Date(i * DAY).toISOString(),
    correct: i >= 5,
    assistance: 'none',
    priorExposure: false,
    mode: 'study',
  }));
  assert.equal(
    learning(rows, questions, 20 * DAY).skills.find((s) => s.id === q.primarySkillId).state,
    'Needs review',
  );
  rows[3].correct = true;
  rows[4].correct = true;
  assert.equal(
    learning(rows, questions, 20 * DAY).skills.find((s) => s.id === q.primarySkillId).state,
    'Improving',
  );
});
test('history exposure marks an active repeated family assisted without changing its earlier attempt', (t) => {
  const f = fixture(t, [questions[0]]);
  let first = f.s.start({ count: 4, domainId: 'identity' });
  first = f.s.submit(answer(first));
  first = f.s.advance({ sessionId: first.id, questionId: questions[0].id });
  f.tick(DAY * 4);
  let second = f.s.start({ count: 4, domainId: 'identity' });
  assert.equal(second.items[0].priorExposure, true);
  f.s.session(first.id);
  second = f.s.submit(answer(second));
  const evidence = f.s.evidence();
  assert.equal(evidence[0].assistance, 'none');
  assert.equal(evidence[1].assistance, 'seen');
  assert.equal(evidence[0].correct, true);
});
test('eligible shortages block exams without changing requested distribution and retirement persists', (t) => {
  const f = fixture(t, bank());
  for (const q of f.s.bank.filter((q) => q.domainId === 'monitoring').slice(0, 10)) {
    const issue = f.s
      .report({ questionId: q.id, version: 1, category: 'outdated-content' })
      .find((i) => i.question_id === q.id);
    f.s.resolve({ id: issue.id, status: 'retired', note: 'Retired after review' });
  }
  const preview = f.s.preview({ mode: 'exam', count: 50 });
  assert.equal(preview.blocked, true);
  assert.deepEqual(preview.shortages, [{ domainId: 'monitoring', required: 7, available: 5 }]);
  assert.throws(() => f.s.start({ mode: 'exam', count: 50 }), /gate|eligible/);
  f.reopen();
  assert.equal(f.s.eligible().filter((q) => q.domainId === 'monitoring').length, 5);
  assert.equal(f.s.preview({ mode: 'exam', count: 10 }).blocked, false);
});
test('saved scheduler inputs reproduce adaptive identities and reasons', (t) => {
  const f = fixture(t);
  const session = f.s.start({ mode: 'adaptive', count: 10 });
  const config = JSON.parse(
    f.s.db.prepare('SELECT config FROM sessions WHERE id=?').get(session.id).config,
  );
  const replay = select({
    bank: config.selection.candidates,
    stats: config.selection.stats,
    config,
    seed: config.seed,
    now: config.selection.now,
  });
  assert.deepEqual(
    replay.chosen.map((x) => [x.question.id, x.reason]),
    session.items.map((i) => [i.question.id, i.reason]),
  );
});

test('a new version cannot silently bypass a pending dispute', (t) => {
  const f = fixture(t);
  const q = questions[0];
  f.s.report({ questionId: q.id, version: q.version, category: 'incorrect-answer' });
  const updated = structuredClone(questions);
  updated[0].version = 2;
  f.reopen(updated);
  assert.ok(!f.s.eligible().some((x) => x.id === q.id));
  assert.equal(f.s.issues()[0].status, 'pending');
  updated[0].correctsVersions = [1];
  f.reopen(updated);
  assert.ok(f.s.eligible().some((x) => x.id === q.id));
  assert.equal(f.s.issues()[0].status, 'corrected');
});

test('exam reading duration is saved even without changing an answer', (t) => {
  const f = fixture(t, bank());
  let s = f.s.start({ mode: 'exam', count: 10 });
  f.tick(5000);
  s = f.s.navigate({ sessionId: s.id, position: 1 });
  assert.equal(s.items[0].durationMs, 5000);
  f.tick(3000);
  f.reopen();
  s = f.s.session(s.id);
  assert.equal(s.items[1].durationMs, 3000);
  assert.equal(s.items[0].durationMs, 5000);
});
