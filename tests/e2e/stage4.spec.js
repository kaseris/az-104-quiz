import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StudyStore } from '../../electron/store.js';
import { DocumentStore } from '../../electron/document-store.js';
import { documents } from '../../content/documents.js';
import { articleHTML } from '../fixtures/reader.js';
const root = resolve('.');
async function launch(dir) {
  const env = { ...process.env, AZ104_DATA_DIR: dir };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  const app = await electron.launch({ args: [root], env });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}
test('tutor activation, preview, streamed citations, cancellation, deletion and local restart', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-tutor-e2e-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
  const reader = new DocumentStore(store);
  reader.save(
    documents.find((d) => d.id === 'rbac'),
    { html: articleHTML() },
  );
  reader.close();
  store.close();
  let app, page;
  const errors = [];
  try {
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => errors.push(e.message));
    // Test-only SDK substitutions in the isolated main process. Production has no mock switch.
    await app.evaluate(async (_electron, root) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { Models } = require(root + '/node_modules/openai/resources/models.mjs');
      const { Responses } = require(
        root + '/node_modules/openai/resources/responses/responses.mjs',
      );
      Models.prototype.retrieve = async (model) => ({ id: model });
      Responses.prototype.create = async function* (p, options) {
        yield { type: 'response.created', response: { id: 'resp_e2e' } };
        if (p.instructions === 'Connection test.') {
          yield { type: 'response.output_text.delta', delta: 'OK' };
        } else {
          for (const delta of [
            'A role assignment ',
            'connects a principal, role and scope. ',
            '[S1]',
          ]) {
            await new Promise((r) => setTimeout(r, 250));
            if (options.signal.aborted) throw new Error('aborted');
            yield { type: 'response.output_text.delta', delta };
          }
        }
        yield {
          type: 'response.completed',
          response: { id: 'resp_e2e', usage: { input_tokens: 100, output_tokens: 25 } },
        };
      };
    }, root);
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await page.getByLabel('API key (optional)').fill('test-only-e2e-placeholder-key');
    const consent = page.getByLabel('Accept session-only key storage before storing a key');
    if (await consent.count()) await consent.check();
    await page.getByRole('button', { name: 'Store key', exact: true }).click();
    await page.getByLabel('Daily app limit (USD)').fill('1');
    await page.getByLabel(/I understand the context sharing/).check();
    await page.getByRole('button', { name: 'Activate & test connection' }).click();
    await expect(page.getByText('AI ACTIVE', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('settings.png'), fullPage: true });
    await page.getByRole('button', { name: 'Study tutor', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).click();
    await page.getByLabel('Your question', { exact: true }).fill('Explain role assignment scope');
    await page.getByRole('button', { name: 'Preview context', exact: true }).click();
    await expect(page.getByText(/Context preview · upper bound/)).toBeVisible();
    await page.getByRole('button', { name: 'Send to tutor', exact: true }).click();
    await expect(page.locator('.tutor-answer .badge').first()).toHaveText('completed');
    await page.locator('.tutor-prose').getByRole('button', { name: '[S1]', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Cited source' })).toContainText(
      'role assignment',
    );
    await page.screenshot({ path: info.outputPath('tutor-answer.png'), fullPage: true });
    await page
      .getByLabel('Your question', { exact: true })
      .fill('Give me another hint about role scope');
    await page.getByRole('button', { name: 'Preview context', exact: true }).click();
    await page.getByRole('button', { name: 'Send to tutor', exact: true }).click();
    await expect(page.locator('.tutor-answer').last()).toContainText('A role assignment');
    await page.getByRole('button', { name: 'Stop response', exact: true }).click();
    await expect(page.locator('.tutor-answer .badge').last()).toHaveText('cancelled');

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByLabel('Your question', { exact: true }).fill('Saved follow-up question');
    await page.getByLabel('Your question', { exact: true }).press('Tab');
    await page.screenshot({ path: info.outputPath('tutor-narrow.png'), fullPage: true });
    await app.close();
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Study tutor', exact: true }).click();
    await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(
      'Saved follow-up question',
    );
    await expect(page.locator('.tutor-answer .badge').first()).toHaveText('completed');
    const status = await page.evaluate(() => window.study.provider.status());
    expect(status.enabled).toBe(false);
    await page.getByRole('button', { name: 'Delete conversation…' }).click();
    await page.getByRole('button', { name: 'Confirm conversation deletion' }).click();
    await expect(
      page.getByRole('heading', { name: 'A question is a good place to start.' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (app) {
      await page.screenshot({ path: info.outputPath('last-state.png') }).catch(() => {});
      await app.close();
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
