import { screenshot } from './screenshot.js';
import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StudyStore } from '../../electron/store.js';
import { LabStore } from '../../electron/labs.js';
import { DocumentStore } from '../../electron/document-store.js';
import { documents } from '../../content/documents.js';
import { articleHTML } from '../fixtures/reader.js';
const root = resolve('.');
test('adaptation preview, independent review, explicit opening and restart preserve the original lab', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-adapt-e2e-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
  const labs = new LabStore(store);
  const a = labs.start({ labId: 'rg-tags', method: 'portal', preflightReviewed: true });
  labs.evidence({
    id: a.id,
    checklist: [],
    notes: 'PRIVATE-ADAPTATION-NOTE',
    output: '',
    problemKind: 'none',
  });
  const before = labs.read({ id: a.id });
  const reader = new DocumentStore(store);
  reader.save(
    documents.find((d) => d.id === 'lab-tags'),
    {
      html: articleHTML({
        passage: 'Merge retains existing unrelated tags. Replace removes omitted tags.',
      }),
    },
  );
  reader.close();
  store.close();
  let app, page;
  const errors = [];
  const launch = async () => {
    const env = { ...process.env, AZ104_DATA_DIR: dir };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    app = await electron.launch({ args: [root], env });
    page = await app.firstWindow();
    await page.evaluate(
      (mode) => window.study.setAppearance({ mode }),
      test.info().project.name === 'dark' ? 'dark' : 'light',
    );
    await page.context().setOffline(true);
    page.on('pageerror', (e) => errors.push(e.message));
  };
  const openLab = async () => {
    await page.getByRole('button', { name: 'Hands-on labs', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Open saved lab: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
  };
  try {
    await launch();
    await app.evaluate((_electron, root) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { Models } = require(root + '/node_modules/openai/resources/models.mjs');
      const { Responses } = require(
        root + '/node_modules/openai/resources/responses/responses.mjs',
      );
      Models.prototype.retrieve = async (id) => ({ id });
      Responses.prototype.create = async function* (p) {
        const proposal = {
          explanation: 'Merge keeps unrelated tags while updating the supplied tag.',
          hints: ['Identify which tag must remain.', 'Compare merge with replacement.'],
          reflectionPrompt: 'Which omitted tag survives Merge?',
          reflectionAnswer: 'The unrelated tag remains.',
          sourceIds: ['S1'],
        };
        const review = {
          verdict: 'accepted',
          grounded: true,
          objectivePreserved: true,
          executionUnchanged: true,
          reason: 'Grounded in the supplied tag excerpt; no changed cloud actions.',
          sourceIds: ['S1'],
        };
        const text =
          p.instructions === 'Connection test.'
            ? 'OK'
            : JSON.stringify(p.text.format.name === 'generation' ? proposal : review);
        yield { type: 'response.output_text.delta', delta: text };
        yield {
          type: 'response.completed',
          response: { id: 'mock-adaptation-ui', usage: { input_tokens: 300, output_tokens: 150 } },
        };
      };
    }, root);
    await openLab();
    const section = () => page.getByRole('region', { name: 'Optional lab adaptations' });
    await section().getByRole('button', { name: 'Prepare an adaptation', exact: true }).click();
    await section()
      .getByRole('button', { name: 'Preview adaptation context', exact: true })
      .click();
    await expect(
      section().getByRole('heading', { name: 'Review before queueing', exact: true }),
    ).toBeVisible();
    await expect(section().getByText(/PRIVATE-ADAPTATION-NOTE/)).toHaveCount(0);
    await section()
      .getByRole('button', { name: 'Queue paid adaptation and review', exact: true })
      .click();
    await expect(section().getByRole('alert')).toContainText('Activate');
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await page.getByLabel('API key (optional)').fill('test-only-adaptation-key');
    const consent = page.getByLabel('Accept session-only key storage before storing a key');
    if (await consent.count()) await consent.check();
    await page.getByRole('button', { name: 'Store key', exact: true }).click();
    await expect(page.getByLabel('Replace API key')).toBeVisible();
    await page.getByLabel('Daily app limit (USD)').fill('2');
    await page.getByLabel(/I understand the context sharing/).check();
    await page.getByRole('button', { name: 'Activate & test connection', exact: true }).click();
    await expect(page.getByText('AI ACTIVE', { exact: true })).toBeVisible();
    await openLab();
    await section().getByRole('button', { name: 'Prepare an adaptation', exact: true }).click();
    await section()
      .getByRole('button', { name: 'Preview adaptation context', exact: true })
      .click();
    await section()
      .getByRole('button', { name: 'Queue paid adaptation and review', exact: true })
      .click();
    await expect(
      section().getByRole('button', { name: 'Open reviewed guidance', exact: true }),
    ).toBeVisible();
    await expect(
      section().getByText('Merge keeps unrelated tags while updating the supplied tag.', {
        exact: true,
      }),
    ).toHaveCount(0);
    await section().getByRole('button', { name: 'Open reviewed guidance', exact: true }).click();
    await expect(
      section().getByText('Merge keeps unrelated tags while updating the supplied tag.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      section().getByText('AI-generated · independently AI-reviewed · not Azure-verified', {
        exact: true,
      }),
    ).toBeVisible();
    await section().getByText('Adapted hint 1', { exact: true }).click();
    await page.setViewportSize({ width: 900, height: 760 });
    await section().scrollIntoViewIfNeeded();
    await screenshot(page, { path: info.outputPath('adaptation.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await page.evaluate((id) => window.study.labs.read({ id }), a.id)).toEqual(before);
    await app.close();
    app = null;
    await launch();
    await openLab();
    await expect(
      section().getByText('Merge keeps unrelated tags while updating the supplied tag.', {
        exact: true,
      }),
    ).toBeVisible();
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    await section().getByRole('button', { name: 'Dismiss adaptation', exact: true }).click();
    await expect(
      section().getByText('Merge keeps unrelated tags while updating the supplied tag.', {
        exact: true,
      }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
