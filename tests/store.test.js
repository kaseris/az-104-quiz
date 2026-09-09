import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyStore } from '../electron/store.js';
import { validateBank } from '../electron/validation.js';
import { starterQuestions as questions } from '../content/questions.js';

function fixture(t, bank = questions) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-store-'));
  let store = new StudyStore(join(dir, 'test.sqlite'), bank);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    get store() {
      return store;
    },
    reopen(newBank = bank) {
      store.close();
      store = new StudyStore(join(dir, 'test.sqlite'), newBank);
      return store;
    },
  };
}
function submission(session, selected) {
  return {
    sessionId: session.id,
    questionId: session.items[session.cursor].question.id,
    selectedOptionIds: selected,
    durationMs: 2300,
  };
}

test('starter bank is versioned, attributed, and has four unique questions per domain', () => {
  validateBank(questions);
  assert.equal(questions.length, 20);
  assert.equal(new Set(questions.map((q) => q.prompt)).size, 20);
  for (const domain of ['identity', 'storage', 'compute', 'networking', 'monitoring'])
    assert.equal(questions.filter((q) => q.domainId === domain).length, 4);
  const bad = structuredClone(questions);
  bad[0].correctOptionIds = ['not-an-option'];
  assert.throws(() => validateBank(bad), /invalid answers/);
});

test('skip choice, draft answer, and exact displayed order survive database reopening', (t) => {
  const f = fixture(t);
  f.store.setSetting('onboarded', true);
  let s = f.store.start({ count: 10 });
  assert.equal(new Set(s.items.map((i) => i.question.domainId)).size, 5);
  assert.equal(
    s.items.some((i) => 'review' in i),
    false,
  );
  assert.equal(JSON.stringify(s).includes('correctOptionIds'), false);
  s = f.store.draft(submission(s, [s.items[0].question.options[0].id]));
  const restored = f.reopen().session(s.id);
  assert.deepEqual(restored, s);
  assert.equal(f.store.state().onboarded, true);
  assert.equal(f.store.state().sessions.length, 1);
  assert.equal(
    f.store.start({ count: 5 }).id,
    s.id,
    'a second request resumes the single active quiz',
  );
});

test('grading uses option IDs and frozen versions, is idempotent, and forbids answer changes', (t) => {
  const f = fixture(t);
  const s = f.store.start({ count: 5 });
  const original = questions.find((q) => q.id === s.items[0].question.id);
  const changed = structuredClone(questions);
  const updated = changed.find((q) => q.id === original.id);
  updated.version = 2;
  updated.correctOptionIds = [
    updated.options.find((o) => !updated.correctOptionIds.includes(o.id)).id,
  ];
  updated.type = 'single';
  f.reopen(changed);
  const payload = submission(s, original.correctOptionIds);
  const answered = f.store.submit(payload);
  assert.equal(answered.items[0].correct, true);
  assert.equal(answered.items[0].question.version, 1);
  assert.deepEqual(f.store.submit(payload), answered);
  assert.equal(f.store.state().sessions[0].answered, 1);
  const wrong = original.options.find((o) => !original.correctOptionIds.includes(o.id)).id;
  assert.throws(() => f.store.submit(submission(s, [wrong])), /cannot be changed/);
  assert.throws(() => f.store.draft(payload), /already submitted/);
});

test('multiple-select scoring rejects partial answers as incorrect and accepts any correct ordering', (t) => {
  const bank = questions.filter((q) => q.type === 'multiple');
  const f = fixture(t, bank);
  let s = f.store.start({ count: 4, domainId: 'networking' });
  s = f.store.submit(submission(s, [bank[0].correctOptionIds[0]]));
  assert.equal(s.items[0].correct, false);
  s = f.store.advance({ sessionId: s.id, questionId: bank[0].id });
  assert.ok(s.completedAt);
  s = f.store.start({ count: 4, domainId: 'networking' });
  s = f.store.submit(submission(s, [...bank[0].correctOptionIds].reverse()));
  assert.equal(s.items[0].correct, true);
});

test('invalid input and premature progression cannot corrupt a session', (t) => {
  const f = fixture(t);
  assert.throws(() => f.store.start({ count: -1 }), /session length/);
  assert.throws(() => f.store.start({ count: 10, domainId: 'unknown' }), /Unknown/);
  const s = f.store.start({ count: 5 });
  const id = s.items[0].question.options[0].id;
  assert.throws(
    () => f.store.advance({ sessionId: s.id, questionId: s.items[0].question.id }),
    /Submit/,
  );
  assert.throws(() => f.store.submit(submission(s, [])), /Select/);
  assert.throws(() => f.store.submit(submission(s, [id, id])), /Duplicate/);
  assert.throws(() => f.store.submit(submission(s, ['injected'])), /Unknown/);
  assert.throws(() => f.store.submit({ ...submission(s, [id]), questionId: 'stale' }), /current/);
  assert.throws(() => f.store.submit({ ...submission(s, [id]), durationMs: Infinity }), /duration/);
  assert.deepEqual(f.store.session(s.id), s);
});

test('a completed quiz has durable results and no active session after restart', (t) => {
  const f = fixture(t);
  let s = f.store.start({ count: 20 });
  const ids = new Set(s.items.map((i) => i.question.id));
  assert.equal(ids.size, 20);
  for (let n = 0; n < 20; n++) {
    const q = questions.find((q) => q.id === s.items[s.cursor].question.id);
    s = f.store.submit(submission(s, q.correctOptionIds));
    s = f.store.advance({ sessionId: s.id, questionId: q.id });
  }
  assert.ok(s.completedAt);
  assert.equal(s.correct, 20);
  f.reopen();
  assert.deepEqual(f.store.session(s.id), s);
  assert.equal(f.store.activeId(), null);
  assert.equal(f.store.state().sessions[0].correct, 20);
  assert.notEqual(f.store.start({ count: 5 }).id, s.id);
});
