import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudyStore } from '../electron/store.js';
import { DocumentStore } from '../electron/document-store.js';
import { Provider } from '../electron/provider.js';
import { Generation } from '../electron/generation.js';
import { LabStore } from '../electron/labs.js';
import { documents } from '../content/documents.js';
import { articleHTML } from './fixtures/reader.js';
function fixture(t, { verdict = 'accepted', grounded = true, proposal, fail } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-adapt-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  const reader = new DocumentStore(store);
  reader.save(
    documents.find((d) => d.id === 'lab-tags'),
    {
      html: articleHTML({
        passage:
          'Merge adds or updates tags while keeping unrelated tags. Replace removes omitted tags.',
      }),
    },
  );
  const calls = [];
  const provider = new Provider(
    store,
    { read: () => 'test-adaptation-placeholder', status: () => ({ hasKey: true }) },
    {
      clientFactory: () => ({
        responses: {
          create: async (p) => {
            calls.push(p);
            if (fail) throw fail;
            const output =
              p.text.format.name === 'generation'
                ? proposal || {
                    explanation: 'Merge retains unrelated tags.',
                    hints: ['Find the group Tags page.', 'Consider which tag must remain.'],
                    reflectionPrompt: 'What does Replace remove?',
                    reflectionAnswer: 'Tags omitted from the replacement set.',
                    sourceIds: ['S1'],
                  }
                : {
                    verdict,
                    grounded,
                    objectivePreserved: true,
                    executionUnchanged: true,
                    reason:
                      'Claims match the supplied tag documentation; no new cloud action is introduced.',
                    sourceIds: ['S1'],
                  };
            return (async function* () {
              yield { type: 'response.output_text.delta', delta: JSON.stringify(output) };
              yield {
                type: 'response.completed',
                response: {
                  id: 'mock-adaptation',
                  usage: { input_tokens: 300, output_tokens: 120 },
                },
              };
            })();
          },
        },
      }),
    },
  );
  provider.settings({ dailyLimit: 2 });
  provider.config.enabled = true;
  provider.config.validated = true;
  let queue = new Generation(store, reader, provider, { autoStart: false });
  const labs = new LabStore(store);
  const attempt = labs.start({ labId: 'rg-tags', method: 'portal', preflightReviewed: true });
  t.after(() => {
    queue.close();
    provider.close();
    reader.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    store,
    reader,
    provider,
    labs,
    attempt,
    calls,
    get q() {
      return queue;
    },
    restart() {
      queue.close();
      queue = new Generation(store, reader, provider, { autoStart: false });
    },
  };
}
async function draft(f) {
  return f.q.labAdaptations.preview({ attemptId: f.attempt.id, style: 'beginner' });
}
async function finish(f, id) {
  for (let i = 0; i < 8; i++) {
    await f.q.tick();
    if (['completed', 'failed', 'paused', 'cancelled'].includes(f.q.job(id).status)) break;
  }
}
test('adaptations require a reviewed preview and two distinct-model passes; accepted guidance opens explicitly', async (t) => {
  const f = fixture(t);
  const before = f.labs.read({ id: f.attempt.id });
  const quiz = f.store.evidence();
  const p = await draft(f);
  assert.equal(f.calls.length, 0);
  assert.equal(p.phase, 'preview');
  assert.throws(() => f.q.resume({ id: p.id }), /Confirm/);
  assert.throws(() => f.q.retry({ id: p.id }), /Confirm/);
  assert.throws(() => f.q.labAdaptations.create({ id: p.id, confirm: false }));
  f.q.labAdaptations.create({ id: p.id, confirm: true });
  f.q.labAdaptations.create({ id: p.id, confirm: true });
  await finish(f, p.id);
  const j = f.q.job(p.id);
  assert.equal(j.verdict, 'accepted');
  assert.equal(f.calls.length, 2);
  assert.notEqual(f.calls[0].model, f.calls[1].model);
  assert.equal(f.q.labAdaptations.list({ attemptId: f.attempt.id })[0].candidate, null);
  const opened = f.q.labAdaptations.open({ id: p.id });
  assert.match(opened.candidate.explanation, /Merge/);
  assert.ok(opened.openedAt);
  assert.equal(f.q.labAdaptations.open({ id: p.id }).openedAt, opened.openedAt);
  assert.deepEqual(f.labs.read({ id: f.attempt.id }), before);
  assert.deepEqual(f.store.evidence(), quiz);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM generated_questions').get().n, 0);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM generation_holds').get().n, 0);
  assert.equal(f.q.list().jobs.length, 0);
  f.restart();
  assert.ok(f.q.labAdaptations.list({ attemptId: f.attempt.id })[0].candidate);
  f.q.labAdaptations.dismiss({ id: p.id });
  assert.equal(f.q.labAdaptations.list({ attemptId: f.attempt.id })[0].candidate, null);
});
test('rejected or unsupported proposals never become usable guidance', async (t) => {
  for (const config of [{ verdict: 'rejected' }, { grounded: false }]) {
    const f = fixture(t, config);
    const p = await draft(f);
    f.q.labAdaptations.create({ id: p.id, confirm: true });
    await finish(f, p.id);
    assert.notEqual(f.q.job(p.id).verdict, 'accepted');
    assert.throws(() => f.q.labAdaptations.open({ id: p.id }), /Only accepted/);
    assert.equal(f.q.labAdaptations.list({ attemptId: f.attempt.id })[0].candidate, null);
  }
});
test('unknown sources and executable proposals stop before review/publication', async (t) => {
  for (const patch of [
    { sourceIds: ['invented'] },
    { explanation: 'az group delete --name shared' },
  ]) {
    const proposal = {
      explanation: 'Merge retains tags',
      hints: ['One hint', 'Another hint'],
      reflectionPrompt: 'Why?',
      reflectionAnswer: 'Preserves tags',
      sourceIds: ['S1'],
      ...patch,
    };
    const f = fixture(t, { proposal });
    const p = await draft(f);
    f.q.labAdaptations.create({ id: p.id, confirm: true });
    await finish(f, p.id);
    assert.equal(f.q.job(p.id).status, 'failed');
    assert.equal(f.calls.length, 1);
    assert.throws(() => f.q.labAdaptations.open({ id: p.id }));
  }
});
test('private learner evidence is excluded and invalid requests cannot inject a different exercise', async (t) => {
  const f = fixture(t);
  f.labs.evidence({
    id: f.attempt.id,
    checklist: [],
    notes: 'PRIVATE-NOTES',
    output: 'PRIVATE-OUTPUT',
    problemKind: 'environment',
  });
  f.labs.reflection({
    id: f.attempt.id,
    action: 'save',
    answer: 'PRIVATE-REFLECTION',
    assessment: 'unanswered',
  });
  const p = await draft(f);
  assert.ok(!JSON.stringify(p).includes('PRIVATE-'));
  await assert.rejects(() =>
    f.q.labAdaptations.preview({
      attemptId: f.attempt.id,
      style: 'beginner',
      base: { goal: 'forged' },
    }),
  );
  await assert.rejects(() =>
    f.q.labAdaptations.preview({ attemptId: 'missing', style: 'beginner' }),
  );
  await assert.rejects(() =>
    f.q.labAdaptations.preview({ attemptId: f.attempt.id, style: 'freeform cloud changes' }),
  );
  f.q.labAdaptations.create({ id: p.id, confirm: true });
  await finish(f, p.id);
  assert.ok(!JSON.stringify(f.calls).includes('PRIVATE-'));
});
test('activation, expiry, source freshness and shared budget prevent unauthorized paid work', async (t) => {
  const f = fixture(t);
  const p = await draft(f);
  f.provider.config.enabled = false;
  assert.throws(() => f.q.labAdaptations.create({ id: p.id, confirm: true }), /Activate/);
  f.provider.config.enabled = true;
  f.q.save(p.id, { previewedAt: Date.now() - 600001 });
  assert.throws(() => f.q.labAdaptations.create({ id: p.id, confirm: true }), /expired/);
  const fresh = await draft(f);
  f.q.labAdaptations.create({ id: fresh.id, confirm: true });
  f.provider.config.dailyLimit = 0.00001;
  await f.q.tick();
  assert.equal(f.q.job(fresh.id).reason, 'budget');
  assert.equal(f.calls.length, 0);
  f.provider.config.dailyLimit = 2;
  f.q.resume({ id: fresh.id });
  f.q.save(fresh.id, {
    sources: f.q.job(fresh.id).sources.map((s) => ({ ...s, fetchedAt: '2020-01-01T00:00:00Z' })),
  });
  await f.q.tick();
  assert.equal(f.q.job(fresh.id).reason, 'stale-evidence');
  assert.equal(f.calls.length, 0);
});
test('restart resumes completed checkpoints without duplicate generation; cancel releases held allowance', async (t) => {
  const f = fixture(t);
  const p = await draft(f);
  f.q.labAdaptations.create({ id: p.id, confirm: true });
  await f.q.tick();
  assert.equal(f.q.job(p.id).phase, 'review');
  assert.equal(f.calls.length, 1);
  f.restart();
  await finish(f, p.id);
  assert.equal(f.calls.length, 2);
  assert.equal(f.q.job(p.id).status, 'completed');
  const second = await draft(f);
  f.q.labAdaptations.create({ id: second.id, confirm: true });
  await f.q.tick();
  f.q.cancel({ id: second.id });
  await f.q.tick();
  assert.equal(f.q.job(second.id).status, 'cancelled');
  assert.equal(f.calls.length, 3);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM generation_holds').get().n, 0);
});
test('unknown submission requires deliberate retry and does not silently resubmit', async (t) => {
  const f = fixture(t);
  const p = await draft(f);
  f.q.labAdaptations.create({ id: p.id, confirm: true });
  // A request with unknown usage represents an interrupted submitted response.
  f.q.hold(p.id);
  const id = f.provider.reserve({
    input: [],
    instructions: 'test',
    inputBound: 600,
    jobId: p.id,
    operation: 'generation',
  });
  f.provider.active = null;
  f.store.db.prepare("UPDATE ai_requests SET status='submitted' WHERE id=?").run(id);
  await f.q.tick();
  assert.equal(f.q.job(p.id).reason, 'unknown');
  assert.throws(() => f.q.resume({ id: p.id }));
  assert.throws(() => f.q.retry({ id: p.id }), /Confirm/);
  await f.q.tick();
  assert.equal(f.calls.length, 0);
  f.q.retry({ id: p.id, confirm: true });
  await finish(f, p.id);
  assert.equal(f.calls.length, 2);
  assert.equal(f.provider.request(id).cost, null);
});

test('approved YAML article provenance works without allowing private repositories', async () => {
  const { extractArticle } = await import('../electron/document-source.js');
  const source = documents.find((d) => d.id === 'lab-vnet');
  const yaml = articleHTML().replace('articles/example.md', 'articles/example.yml');
  assert.ok(extractArticle(yaml, source).sections.length);
  assert.throws(
    () => extractArticle(yaml.replace('/azure-docs/', '/azure-docs-pr/'), source),
    /Source-use evidence/,
  );
  assert.throws(
    () => extractArticle(yaml.replace('example.yml', 'example.exe'), source),
    /Source-use evidence/,
  );
});
