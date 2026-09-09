import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StudyStore } from '../../electron/store.js';
test('data management previews, exports, resets and imports through trusted file dialogs', async () => {
  const root = mkdtempSync(join(tmpdir(), 'az104-data-ui-')),
    profile = join(root, 'profile');
  const s = new StudyStore(join(root, 'seed.sqlite'));
  s.close();
  let app;
  const env = { ...process.env, AZ104_DATA_DIR: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  try {
    app = await electron.launch({ args: [resolve('.')], env });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Continue without AI' }).click();
    const quiz = await page.evaluate(() => window.study.start({ count: 5 }));
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await page.screenshot({
      path: 'test-results/data-management.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Preview export', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save portable export' })).toBeVisible();
    const path = join(root, 'export.json');
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    }, path);
    await page.getByRole('button', { name: 'Save portable export' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Portable export saved.' }),
    ).toBeVisible();
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    expect(saved.records.sessions[0].id).toBe(quiz.id);
    await page.getByRole('button', { name: 'Inspect diagnostics' }).click();
    await expect(page.getByRole('button', { name: 'Save diagnostics' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset study data', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Confirm deletion', exact: true }),
    ).toBeDisabled();
    await page.getByLabel('I understand this deletion and the recovery backup').check();
    await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
    await expect
      .poll(() => page.evaluate(async () => (await window.study.getState()).sessions.length))
      .toBe(0);
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, path);
    await page.getByRole('button', { name: 'Choose export to preview' }).click();
    await expect(page.getByText('This import can be merged.')).toBeVisible();
    await page.getByLabel('I reviewed the additive merge and recovery backup policy').check();
    await page.getByRole('button', { name: 'Apply import', exact: true }).click();
    await expect
      .poll(() => page.evaluate(async () => (await window.study.getState()).sessions.length))
      .toBe(1);
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 860, height: 650 });
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(2),
    );
    await page.getByRole('button', { name: 'Inspect diagnostics' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Save diagnostics' })).toBeVisible();
  } finally {
    if (app) await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
