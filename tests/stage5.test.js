import { schemaVersion } from '../electron/migrations.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudyStore } from '../electron/store.js';
import { DocumentStore } from '../electron/document-store.js';
import { Provider } from '../electron/provider.js';
import { Generation } from '../electron/generation.js';
import { checkSchema, schemas } from '../electron/generation-contract.js';
import { articleHTML } from './fixtures/reader.js';
const drop5 =
  'DROP TABLE generated_questions; DROP TABLE generation_candidates; DROP TABLE generation_holds; DROP TABLE generation_events; DROP TABLE generation_triggers; DROP TABLE generation_jobs; ALTER TABLE ai_requests DROP COLUMN job_id; ALTER TABLE ai_requests DROP COLUMN operation; ALTER TABLE ai_requests DROP COLUMN error_kind; ALTER TABLE ai_requests DROP COLUMN retry_after; ALTER TABLE ai_requests DROP COLUMN provider_request_id;';
function seed(store, domain = 'identity') {
  const q = store.bank.find((q) => q.domainId === domain && q.primarySkillId);
  const id = `session-${domain}-${Date.now()}-${Math.random()}`;
  store.db
    .prepare(
      'INSERT INTO sessions(id,started_at,completed_at,domain_id,blueprint_version) VALUES(?,?,?,?,?)',
    )
    .run(id, new Date().toISOString(), new Date().toISOString(), domain, q.blueprintVersion);
  store.db
    .prepare(
      "INSERT INTO session_items(session_id,position,question_id,snapshot,selected,submitted_at,correct,confidence,assistance,prior_exposure) VALUES(?,0,?,?,?,?,0,'confident','none',0)",
    )
    .run(
      id,
      q.id,
      JSON.stringify(q),
      JSON.stringify([q.options.find((o) => !q.correctOptionIds.includes(o.id)).id]),
      new Date().toISOString(),
    );
  return { id, q };
}
function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-generation-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  const { id: sessionId, q } = seed(store);
  const calls = [];
  let f;
  const client = {
    models: { retrieve: async (id) => ({ id }) },
    responses: {
      create: async (p) => {
        const phase = p.text?.format?.name;
        const body = JSON.parse(p.input[0].content);
        calls.push({ phase, p, body });
        if (options.error) await options.error(phase, f);
        let result;
        if (phase === 'analysis')
          result = {
            misconceptions: [
              {
                questionId: q.id,
                primarySkillId: q.primarySkillId,
                description: 'Distinguish scopes',
                sourceIds: ['S1'],
              },
            ],
            suspectQuestions: [],
          };
        if (phase === 'generation')
          result = {
            candidates: [
              {
                title: 'Targeted scope decision',
                prompt:
                  'A new operational team needs the narrowest scope for this scenario. Which choice meets its requirements?',
                type: 'single',
                selectionCount: 1,
                options: [
                  {
                    id: 'a',
                    text: 'Scoped assignment',
                    rationale: 'Matches the documented scope.',
                  },
                  { id: 'b', text: 'Unrelated assignment', rationale: 'Does not match the scope.' },
                ],
                correctOptionIds: ['a'],
                primarySkillId: q.primarySkillId,
                relatedSkillIds: [],
                difficulty: 'medium',
                explanation: 'The documented scope satisfies the requirement.',
                sourceIds: ['S1'],
              },
            ],
          };
        if (phase === 'solve')
          result = {
            answers: body.candidates.map((c) => ({
              id: c.id,
              correctOptionIds: ['a'],
              supported: true,
              ambiguous: false,
              reason: 'Supported by the supplied scope evidence.',
              sourceIds: ['S1'],
            })),
          };
        if (phase === 'review')
          result = {
            reviews: body.candidates.map((c) => ({
              id: c.id,
              verdict: 'accepted',
              reason: 'Supported and unambiguous.',
              familyId: q.familyId,
              sourceIds: ['S1'],
            })),
          };
        if (options.result) result = options.result(phase, result, f);
        return (async function* () {
          yield { type: 'response.created', response: { id: `resp_${calls.length}` } };
          if (options.streaming) await options.streaming(phase, f);
          yield { type: 'response.output_text.delta', delta: JSON.stringify(result) };
          yield {
            type: 'response.completed',
            response: {
              id: `resp_${calls.length}`,
              usage: { input_tokens: 200, output_tokens: 100 },
            },
          };
        })();
      },
    },
  };
  const provider = new Provider(
    store,
    { read: () => 'test-placeholder-key', status: () => ({ hasKey: true }) },
    { clientFactory: () => client },
  );
  provider.settings({ dailyLimit: 10 });
  provider.config.enabled = true;
  provider.config.validated = true;
  const reader = new DocumentStore(store, { fetcher: async () => ({ html: articleHTML() }) });
  const generation = new Generation(store, reader, provider, { autoStart: false });
  f = { dir, store, provider, reader, generation, sessionId, q, calls };
  t.after(() => {
    generation.close();
    provider.close();
    reader.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return f;
}
async function finish(f, id) {
  for (let i = 0; i < 12; i++) {
    await f.generation.tick();
    const j = f.generation.job(id);
    if (['completed', 'paused', 'failed', 'cancelled'].includes(j.status)) return j;
  }
  return f.generation.job(id);
}
test('full queue publishes once, retains independent solve/provenance, and respects exam defaults', async (t) => {
  const f = fixture(t);
  const active = f.store.start({ count: 5, domainId: 'all' });
  const before = JSON.stringify(f.store.session(active.id));
  const j = f.generation.create({ sessionId: f.sessionId, count: 1 });
  const done = await finish(f, j.id);
  assert.equal(done.status, 'completed', done.message);
  const candidates = f.generation.candidates(j.id);
  assert.equal(candidates[0].status, 'accepted');
  assert.equal(candidates[0].question.familyId, f.q.familyId);
  assert.deepEqual(
    f.calls.map((c) => c.phase),
    ['analysis', 'generation', 'solve', 'review'],
  );
  assert.ok(!('correctOptionIds' in f.calls[2].body.candidates[0]));
  assert.ok(!('rationale' in f.calls[2].body.candidates[0].options[0]));
  assert.equal(f.calls[0].p.model, f.provider.config.generationModel);
  assert.equal(f.calls[3].p.model, f.provider.config.reviewModel);
  assert.ok(
    f.calls.every((c) => c.p.store === false && c.p.background === false && c.p.text.format.strict),
  );
  assert.equal(JSON.stringify(f.store.session(active.id)), before);
  assert.equal(
    f.store.plan({ mode: 'exam', count: 50 }).bank.some((q) => q.source.kind === 'ai-generated'),
    false,
  );
  assert.equal(
    f.store
      .plan({ mode: 'exam', count: 50, includeGenerated: true })
      .bank.some((q) => q.source.kind === 'ai-generated'),
    true,
  );
  f.generation.settings({ includeGenerated: false });
  assert.equal(
    f.store.plan({ count: 5 }).bank.some((q) => q.source.kind === 'ai-generated'),
    false,
  );
  f.generation.publish(j.id);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM generated_questions').get().n, 1);
  assert.equal(f.provider.usage().held, 0);
  assert.ok(f.provider.usage().committed > 0);
});
test('automatic generation requires an allowance and coalesces and deduplicates completed-session events', async (t) => {
  const f = fixture(t);
  assert.throws(() => f.generation.settings({ automatic: true }), /allowance/);
  f.generation.settings({ automationLimit: 2, automatic: true });
  f.generation.config.enabledAt = '2000-01-01';
  f.generation.automatic();
  f.generation.automatic();
  assert.equal(f.generation.jobs().length, 1);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM generation_triggers').get().n, 1);
  seed(f.store);
  f.generation.automatic();
  assert.equal(f.generation.jobs().length, 1);
  assert.equal(f.generation.jobs()[0].targets.length, 2);
  f.generation.settings({ automatic: false });
  assert.equal(f.generation.jobs()[0].status, 'paused');
});
test('budget reserves all passes before dispatch and keeps tutoring within shared allowance', async (t) => {
  const f = fixture(t);
  f.provider.settings({ dailyLimit: 0.01 });
  const j = f.generation.create({ sessionId: f.sessionId });
  const done = await finish(f, j.id);
  assert.equal(done.reason, 'budget');
  assert.equal(f.calls.length, 0);
  f.provider.settings({ dailyLimit: 10 });
  f.generation.resume({ id: j.id });
  await f.generation.tick();
  assert.ok(f.provider.usage().held > 0);
  f.provider.settings({ dailyLimit: f.provider.usage().committed });
  assert.throws(
    () =>
      f.provider.reserve({
        input: [],
        instructions: 'test',
        inputBound: 100,
        maxOutputTokens: 1000,
      }),
    /limit/,
  );
});
test('uncertain dispatch is never retried automatically, survives restart, and deliberate retry keeps prior reservation', async (t) => {
  let fail = true;
  const f = fixture(t, {
    error: async () => {
      if (fail) throw new Error('socket disconnected');
    },
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  const paused = await finish(f, j.id);
  assert.equal(paused.reason, 'unknown');
  await f.generation.tick();
  assert.equal(f.calls.length, 1);
  assert.throws(() => f.generation.retry({ id: j.id }), /Confirm retry/);
  const committed = f.provider.usage().committed;
  f.generation.close();
  const recovered = new Generation(f.store, f.reader, f.provider, { autoStart: false });
  t.after(() => recovered.close());
  assert.equal(recovered.job(j.id).reason, 'unknown');
  fail = false;
  f.generation.closed = false;
  f.generation.retry({ id: j.id, confirm: true });
  assert.equal((await finish(f, j.id)).status, 'completed');
  assert.ok(f.provider.usage().committed > committed);
});
test('completed provider output is consumed from a checkpoint without resubmission', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  await f.generation.tick();
  await f.generation.tick();
  const saved = f.generation.job(j.id);
  f.generation.save(j.id, { phase: 'analysis', outputs: {} }, 'queued');
  await f.generation.tick();
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.generation.job(j.id).outputs.analysis, saved.outputs.analysis);
});
test('cancellation during a provider response prevents publication and retains uncertain usage', async (t) => {
  const f = fixture(t, {
    streaming: async (_phase, f) => f.generation.cancel({ id: f.generation.runningId }),
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  const done = await finish(f, j.id);
  assert.equal(done.status, 'cancelled');
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM generated_questions').get().n, 0);
  assert.ok(f.provider.usage().unknown > 0);
  assert.equal(f.provider.usage().held, 0);
});
test('pause during a pass retains completed provider output for resume', async (t) => {
  let paused = false;
  const f = fixture(t, {
    streaming: async (_phase, f) => {
      if (!paused) {
        paused = true;
        f.generation.pause({ id: f.generation.runningId });
      }
    },
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  assert.equal((await finish(f, j.id)).reason, 'user');
  f.generation.resume({ id: j.id });
  assert.equal((await finish(f, j.id)).status, 'completed');
  assert.equal(f.calls.filter((c) => c.phase === 'analysis').length, 1);
});
test('rate limits retry only confirmed rejection, respect retry-after and cap retries', async (t) => {
  const f = fixture(t, {
    error: async () => {
      throw Object.assign(new Error('rate limited'), {
        status: 429,
        headers: { 'retry-after': '2' },
      });
    },
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  await f.generation.tick();
  await f.generation.tick();
  assert.equal(f.generation.job(j.id).retries, 1);
  assert.ok(Date.parse(f.generation.job(j.id).nextRetryAt) > Date.now() + 1000);
  for (let i = 0; i < 4; i++) {
    f.generation.save(j.id, { nextRetryAt: null });
    await f.generation.tick();
  }
  assert.equal(f.calls.length, 4);
  assert.equal(f.generation.job(j.id).status, 'paused');
});
test('missing current documentation pauses before any provider dispatch', async (t) => {
  const f = fixture(t);
  f.reader.fetcher = async () => {
    throw new Error('offline');
  };
  const j = f.generation.create({ sessionId: f.sessionId });
  assert.equal((await finish(f, j.id)).reason, 'evidence');
  assert.equal(f.calls.length, 0);
});
test('suspect originals enter issue review and cannot generate reinforcing questions', async (t) => {
  const f = fixture(t, {
    result: (p, r, f) =>
      p === 'analysis'
        ? {
            ...r,
            suspectQuestions: [
              { questionId: f.q.id, reason: 'Original answer conflicts with documentation.' },
            ],
          }
        : r,
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  assert.equal((await finish(f, j.id)).status, 'completed');
  assert.equal(f.calls.length, 1);
  assert.ok(f.store.excluded(f.q, true));
  assert.equal(f.generation.candidates(j.id).length, 0);
});
for (const kind of [
  'cardinality',
  'duplicate-option',
  'source',
  'duplicate-question',
  'ambiguous',
  'unsupported',
  'wrong-solve',
  'duplicate-review',
])
  test(`${kind} never enters the eligible bank`, async (t) => {
    const f = fixture(t, {
      result: (p, r, f) => {
        if (p === 'generation') {
          const q = r.candidates[0];
          if (kind === 'cardinality') q.selectionCount = 2;
          if (kind === 'duplicate-option') q.options[1].text = q.options[0].text;
          if (kind === 'source') q.sourceIds = ['S999'];
          if (kind === 'duplicate-question') q.prompt = f.q.prompt;
        }
        if (p === 'solve') {
          if (kind === 'ambiguous') r.answers[0].ambiguous = true;
          if (kind === 'unsupported') r.answers[0].supported = false;
          if (kind === 'wrong-solve') r.answers[0].correctOptionIds = ['b'];
        }
        if (p === 'review' && kind === 'duplicate-review') r.reviews.push(r.reviews[0]);
        return r;
      },
    });
    const j = f.generation.create({ sessionId: f.sessionId });
    await finish(f, j.id);
    assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM generated_questions').get().n, 0);
  });
test('queued tutor wins the next provider slot without aborting generation', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  await f.generation.tick();
  f.provider.pendingInteractive = 1;
  await f.generation.tick();
  assert.equal(f.calls.length, 0);
  f.provider.pendingInteractive = 0;
  let release;
  f.provider.active = { id: 'held', controller: new AbortController() };
  const gate = new Promise((r) => (release = r));
  let ran = false;
  const task = f.provider.interactive(() => {
    ran = true;
    return 42;
  });
  assert.equal(f.provider.pendingInteractive, 1);
  assert.equal(f.provider.active.controller.signal.aborted, false);
  f.provider.active = null;
  release();
  await gate;
  assert.equal(await task, 42);
  assert.ok(ran);
  await finish(f, j.id);
});
test('schema 4 migration preserves data, accounting, settings, and makes backup', async (t) => {
  const f = fixture(t);
  const path = join(f.dir, 'v4.sqlite');
  let s = new StudyStore(path);
  s.setSetting('provider', { dailyLimit: 2, generationModel: 'gpt-5.6-sol' });
  const active = s.start({ count: 5 });
  const snapshot = JSON.stringify(active);
  s.close();
  const db = new DatabaseSync(path);
  db.exec(
    'DROP TABLE IF EXISTS portable_messages; DROP TABLE IF EXISTS portable_questions; DROP TABLE lab_attempts; DROP INDEX generation_requests;' +
      drop5 +
      'PRAGMA user_version=4',
  );
  db.close();
  s = new StudyStore(path);
  assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, schemaVersion);
  assert.equal(JSON.stringify(s.session(active.id)), snapshot);
  assert.equal(s.setting('provider').dailyLimit, 2);
  assert.ok(readdirSync(f.dir).some((p) => p.includes('.v4.')));
  s.close();
});
test('malformed strict contract rejects missing and unexpected fields', () => {
  assert.throws(
    () => checkSchema({ candidates: [], extra: true }, schemas.generation),
    /unknown field/,
  );
  assert.throws(() => checkSchema({}, schemas.generation), /array/);
});

for (const phase of ['analysis', 'generation', 'solve', 'review', 'publish'])
  test(`restart at ${phase} preserves checkpoints and requires activation before further paid work`, async (t) => {
    const f = fixture(t);
    const j = f.generation.create({ sessionId: f.sessionId });
    while (f.generation.job(j.id).phase !== phase) await f.generation.tick();
    const before = f.calls.length;
    f.generation.close();
    const provider = new Provider(
      f.store,
      { read: () => 'test-placeholder-key', status: () => ({ hasKey: true }) },
      { clientFactory: f.provider.clientFactory },
    );
    const queue = new Generation(f.store, f.reader, provider, { autoStart: false });
    t.after(() => {
      queue.close();
    });
    assert.equal(queue.job(j.id).status, 'paused');
    await queue.tick();
    assert.equal(f.calls.length, before);
    queue.resume({ id: j.id });
    await queue.tick();
    if (phase === 'publish') assert.equal(queue.job(j.id).status, 'completed');
    else assert.equal(queue.job(j.id).reason, 'reactivation');
    assert.equal(f.calls.length, before);
  });
for (const [status, code, kind] of [
  [401, null, 'authentication'],
  [403, null, 'model-access'],
  [429, 'insufficient_quota', 'quota'],
])
  test(`${kind} pauses generation without repeated dispatch`, async (t) => {
    const f = fixture(t, {
      error: async () => {
        throw Object.assign(new Error('do not expose'), { status, code });
      },
    });
    const j = f.generation.create({ sessionId: f.sessionId });
    assert.equal((await finish(f, j.id)).reason, kind);
    await f.generation.tick();
    assert.equal(f.calls.length, 1);
    assert.equal(f.provider.usage().held, 0);
  });
test('cancellation immediately before publication cannot publish saved accepted reviews', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  while (f.generation.job(j.id).phase !== 'publish') await f.generation.tick();
  f.generation.cancel({ id: j.id });
  assert.throws(() => f.generation.publish(j.id), /Cancelled/);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM generated_questions').get().n, 0);
});
test('source expiry preserves old evidence and prevents new paid work', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  await f.generation.tick();
  f.generation.save(j.id, {
    sources: f.generation
      .job(j.id)
      .sources.map((s) => ({ ...s, fetchedAt: '2000-01-01T00:00:00Z' })),
  });
  assert.equal((await finish(f, j.id)).reason, 'stale-evidence');
  assert.equal(f.calls.length, 0);
});
test('published questions survive reopening and retirement without rewriting history', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  await finish(f, j.id);
  const q = f.generation.candidates(j.id)[0].question;
  const reopened = new StudyStore(join(f.dir, 'study.sqlite'));
  assert.ok(reopened.bank.some((b) => b.id === q.id));
  const issues = reopened.report({
    questionId: q.id,
    version: 1,
    category: 'outdated-content',
    note: 'Retire this generated item.',
  });
  reopened.resolve({ id: issues[0].id, status: 'retired', note: 'No longer useful.' });
  assert.ok(!reopened.eligible().some((b) => b.id === q.id));
  assert.equal(reopened.session(f.sessionId).correct, 0);
  reopened.close();
});

test('SDK request headers are retained independently of response IDs', async (t) => {
  const f = fixture(t);
  const client = f.provider.clientFactory();
  const original = client.responses.create;
  client.responses.create = (p) => ({
    withResponse: async () => ({ data: await original(p), request_id: 'req_header_test' }),
  });
  const j = f.generation.create({ sessionId: f.sessionId });
  assert.equal((await finish(f, j.id)).status, 'completed');
  assert.ok(
    f.generation
      .read({ id: j.id })
      .requests.every((r) => r.provider_request_id === 'req_header_test'),
  );
});
test('unsavable failure stops UI processing and retry consumes the already completed provider result', async (t) => {
  const f = fixture(t);
  const j = f.generation.create({ sessionId: f.sessionId });
  await f.generation.tick();
  const original = f.generation.save.bind(f.generation);
  let failed = false;
  f.generation.save = (id, patch, status) => {
    if (patch.outputs) failed = true;
    if (failed) throw Object.assign(new Error('disk full'), { code: 'SQLITE_FULL' });
    return original(id, patch, status);
  };
  await f.generation.tick();
  assert.equal(f.generation.job(j.id).reason, 'storage');
  assert.equal(f.generation.list().jobs[0].status, 'failed');
  f.generation.save = original;
  f.generation.retry({ id: j.id });
  assert.equal((await finish(f, j.id)).status, 'completed');
  assert.equal(f.calls.filter((c) => c.phase === 'analysis').length, 1);
});
