import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StudyStore } from '../../electron/store.js';
const root = resolve('.');
test('generation queue publishes reviewed items, remains responsive, and recovers without paid restart', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-stage5-e2e-'));
  let store = new StudyStore(join(dir, 'study.sqlite'));
  const q = store.bank.find((q) => q.primarySkillId === 'identity.access.assignments');
  store.setSetting('onboarded', true);
  store.setSetting('provider', {
    model: 'gpt-5.6-terra',
    generationModel: 'gpt-5.6-sol',
    reviewModel: 'gpt-6-astra',
    dailyLimit: 5,
    maxOutputTokens: 4000,
  });
  store.db
    .prepare(
      'INSERT INTO sessions(id,started_at,completed_at,domain_id,blueprint_version) VALUES(?,?,?,?,?)',
    )
    .run(
      'seed',
      new Date().toISOString(),
      new Date().toISOString(),
      q.domainId,
      q.blueprintVersion,
    );
  store.db
    .prepare(
      'INSERT INTO session_items(session_id,position,question_id,snapshot,selected,submitted_at,correct) VALUES(?,0,?,?,?,?,0)',
    )
    .run(
      'seed',
      q.id,
      JSON.stringify(q),
      JSON.stringify([q.options.find((o) => !q.correctOptionIds.includes(o.id)).id]),
      new Date().toISOString(),
    );
  store.close();
  let app, page;
  const errors = [];
  const launch = async () => {
    const env = { ...process.env, AZ104_DATA_DIR: dir };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    app = await electron.launch({ args: [root], env });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    page.on('pageerror', (e) => errors.push(e.message));
  };
  try {
    await launch();
    await app.evaluate(
      async (_electron, { root, q }) => {
        const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
        const { Models } = require(root + '/node_modules/openai/resources/models.mjs');
        const { Responses } = require(
          root + '/node_modules/openai/resources/responses/responses.mjs',
        );
        const { DocumentStore } = require(root + '/electron/document-store.js');
        const { documents } = require(root + '/content/documents.js');
        const { articleHTML } = require(root + '/tests/fixtures/reader.js');
        DocumentStore.prototype.fetch = async function ({ id }) {
          this.save(
            documents.find((d) => d.id === id),
            { html: articleHTML() },
          );
          return this.read({ id });
        };
        Models.prototype.retrieve = async (id) => ({ id });
        Responses.prototype.create = async function* (p) {
          const phase = p.text?.format.name;
          let value = 'OK';
          if (phase) {
            const body = JSON.parse(p.input[0].content);
            if (phase === 'analysis')
              value = {
                misconceptions: [
                  {
                    questionId: q.id,
                    primarySkillId: q.primarySkillId,
                    description: 'Scope a role assignment',
                    sourceIds: ['S1'],
                  },
                ],
                suspectQuestions: [],
              };
            if (phase === 'generation')
              value = {
                candidates: [
                  {
                    title: 'Generated assignment scope',
                    prompt:
                      'A newly formed team must be granted access at a precise scope. Which scope meets this requirement?',
                    type: 'single',
                    selectionCount: 1,
                    options: [
                      {
                        id: 'a',
                        text: 'Required resource scope',
                        rationale: 'Meets the requirement.',
                      },
                      {
                        id: 'b',
                        text: 'Unrelated scope',
                        rationale: 'Does not grant the required access.',
                      },
                    ],
                    correctOptionIds: ['a'],
                    primarySkillId: q.primarySkillId,
                    relatedSkillIds: [],
                    difficulty: 'medium',
                    explanation: 'Use the required resource scope.',
                    sourceIds: ['S1'],
                  },
                ],
              };
            if (phase === 'solve')
              value = {
                answers: body.candidates.map((c) => ({
                  id: c.id,
                  correctOptionIds: ['a'],
                  supported: true,
                  ambiguous: false,
                  reason: 'Supported by scope documentation.',
                  sourceIds: ['S1'],
                })),
              };
            if (phase === 'review')
              value = {
                reviews: body.candidates.map((c) => ({
                  id: c.id,
                  verdict: 'accepted',
                  reason: 'Supported by the source excerpt.',
                  familyId: q.familyId,
                  sourceIds: ['S1'],
                })),
              };
          }
          yield { type: 'response.created', response: { id: 'e2e-' + Date.now() } };
          await new Promise((r) => setTimeout(r, 300));
          yield {
            type: 'response.output_text.delta',
            delta: typeof value === 'string' ? value : JSON.stringify(value),
          };
          yield {
            type: 'response.completed',
            response: { id: 'e2e-' + Date.now(), usage: { input_tokens: 100, output_tokens: 100 } },
          };
        };
      },
      { root, q },
    );
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await page.getByLabel('API key (optional)').fill('test-only-placeholder-key');
    const consent = page.getByLabel('Accept session-only key storage before storing a key');
    if (await consent.count()) await consent.check();
    await page.getByRole('button', { name: 'Store key', exact: true }).click();
    await page.getByLabel(/I understand the context sharing/).check();
    await page.getByRole('button', { name: 'Activate & test connection' }).click();
    await expect(page.getByText('AI ACTIVE', { exact: true })).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Question generation', exact: true }).focus();
    await page.getByRole('button', { name: 'Question generation', exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Generate targeted practice', exact: true }).click();
    await page.getByRole('button', { name: 'Queue generation', exact: true }).focus();
    await page.getByRole('button', { name: 'Queue generation', exact: true }).press('Enter');
    await expect(page.locator('.generation-job')).toHaveCount(1);
    await page.locator('.generation-job').click();
    const start = Date.now();
    await page.getByRole('button', { name: 'Practice quizzes', exact: true }).click();
    expect(Date.now() - start).toBeLessThan(1500);
    const active = await page.evaluate(() => window.study.start({ count: 5, domainId: 'all' }));
    const frozen = await page.evaluate((id) => window.study.session(id), active.id);
    await page.getByRole('button', { name: 'Question generation', exact: true }).click();
    await expect(page.locator('.generation-job')).toContainText('completed', { timeout: 20000 });
    await page.locator('.generation-job').click();
    await expect(
      page.getByText('Generated assignment scope · accepted', { exact: true }),
    ).toBeVisible();
    expect((await page.evaluate((id) => window.study.session(id), active.id)).items).toEqual(
      frozen.items,
    );
    await page.setViewportSize({ width: 900, height: 760 });
    await page.screenshot({ path: info.outputPath('generation.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const queued = await page.evaluate(() => window.study.generation.create({ sessionId: 'seed' }));
    await page.evaluate((id) => window.study.generation.pause({ id }), queued.id);
    await app.close();
    app = null;
    await launch();
    const recovered = await page.evaluate((id) => window.study.generation.read({ id }), queued.id);
    expect(recovered.status).toBe('paused');
    expect(recovered.requests).toHaveLength(0);
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
