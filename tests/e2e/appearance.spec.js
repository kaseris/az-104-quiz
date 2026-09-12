import { paletteContrast } from './palette-contrast.js';
import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { questions } from '../../content/questions.js';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

for (const mode of ['light', 'dark']) {
  test(`${mode} appearance covers screens, quiz feedback, and restart`, async ({}, info) => {
    const dir = mkdtempSync(join(tmpdir(), 'appearance-ui-'));
    const env = { ...process.env, AZ104_DATA_DIR: dir };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    let app;
    const errors = [];
    const launch = async () => {
      app = await electron.launch({ args: [resolve('.')], env });
      const page = await app.firstWindow();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.context().setOffline(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      return page;
    };
    try {
      let page = await launch();
      await page.getByRole('button', { name: 'Continue without AI' }).waitFor();
      expect((await page.evaluate(() => window.study.getState())).appearance).toBe('system');
      await page.evaluate((mode) => window.study.setAppearance({ mode }), mode);
      const theme = async () =>
        expect
          .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
          .toBe(mode === 'dark');
      await theme();
      const pairs = await page.evaluate(paletteContrast);
      writeFileSync(info.outputPath('palette-pairs.json'), JSON.stringify(pairs, null, 2));
      expect(
        pairs.filter((pair) => !Number.isFinite(pair.ratio) || pair.ratio < pair.minimum),
      ).toEqual([]);
      const scans = [];
      const scan = async (screen) => {
        await page.evaluate(axe);
        const result = await page.evaluate(() =>
          window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          }),
        );
        scans.push({
          screen,
          violations: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
        await page.screenshot({
          path: info.outputPath(`${screen}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      };
      await scan('onboarding');
      await page.getByRole('button', { name: 'Continue without AI' }).click();
      for (const name of [
        'Overview',
        'Practice quizzes',
        'Session history',
        'Learning progress',
        'Question issues',
        'Documentation',
        'Study tutor',
        'Question generation',
        'Hands-on labs',
        'Settings & sources',
      ]) {
        await page.getByRole('button', { name, exact: true }).click();
        await scan(name.replaceAll(' ', '-'));
      }
      await expect(page.getByLabel('Color theme')).toHaveValue(mode);
      // Exercise the actual storage failure path, then retry the requested mode.
      await app.evaluate(async (_electron, root) => {
        const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
        const { StudyStore } = require(root + '/electron/store.js');
        const original = StudyStore.prototype.setSetting;
        StudyStore.prototype.setSetting = function (key, value) {
          if (key === 'appearance') {
            StudyStore.prototype.setSetting = original;
            throw Object.assign(new Error('Injected storage failure'), { code: 'SQLITE_FULL' });
          }
          return original.call(this, key, value);
        };
      }, resolve('.'));
      await page.getByLabel('Color theme').selectOption(mode === 'dark' ? 'light' : 'dark');
      await expect(page.getByRole('alert')).toContainText('Your previous setting is still active');
      await expect(page.getByLabel('Color theme')).toHaveValue(mode);
      await theme();
      await scan('appearance-save-error');
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await page.getByLabel('Color theme').selectOption(mode);
      await theme();
      // Use the real setting control for the other mode and back.
      await page.getByLabel('Color theme').selectOption(mode === 'dark' ? 'light' : 'dark');
      await expect(page.getByLabel('Color theme')).toBeEnabled();
      await page.getByLabel('Color theme').selectOption(mode);
      await theme();
      await page.getByRole('button', { name: 'Overview', exact: true }).click();
      await page.getByRole('button', { name: 'Set up a practice quiz' }).click();
      await page.getByRole('button', { name: 'Start 10-question quiz' }).click();
      const title = await page.locator('.question-panel h1').innerText();
      const q = questions.find((q) => q.title === title);
      for (const id of q.correctOptionIds) {
        await page
          .locator('.answer-option')
          .filter({ has: page.getByText(q.options.find((o) => o.id === id).text, { exact: true }) })
          .click();
        await expect(page.locator('.saved-label')).toHaveText('Saved on this device');
      }
      await scan('selected-answer');
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await expect(page.locator('.answer-explanation')).toBeVisible();
      await scan('feedback');
      for (const viewport of [
        { width: 900, height: 600 },
        { width: 320, height: 640 },
      ]) {
        await page.setViewportSize(viewport);
        await scan(`feedback-${viewport.width}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        );
      }
      await page.evaluate(
        (mode) => window.study.setAppearance({ mode }),
        mode === 'dark' ? 'light' : 'dark',
      );
      await page.evaluate((mode) => window.study.setAppearance({ mode }), mode);
      await theme();
      await expect(page.locator('.question-panel h1')).toHaveText(title);
      writeFileSync(info.outputPath('contrast.json'), JSON.stringify(scans, null, 2));
      expect(scans.flatMap((s) => s.violations.map((v) => `${s.screen}: ${v.id}`))).toEqual([]);
      await app.close();
      page = await launch();
      await theme();
      expect((await page.evaluate(() => window.study.getState())).appearance).toBe(mode);
      expect(await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe(mode);
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      ).toBe(mode);
      expect(errors).toEqual([]);
    } finally {
      if (app) await app.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('System follows native appearance updates while explicit modes stay fixed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'appearance-system-'));
  const env = { ...process.env, AZ104_DATA_DIR: dir };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  const app = await electron.launch({ args: [resolve('.')], env });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Continue without AI' }).waitFor();
    const systemChange = async (dark) => {
      // Simulate the OS signal without changing the user's desktop appearance.
      await app.evaluate(({ nativeTheme }, dark) => {
        Object.defineProperty(nativeTheme, 'shouldUseDarkColors', {
          configurable: true,
          get: () =>
            nativeTheme.themeSource === 'system' ? dark : nativeTheme.themeSource === 'dark',
        });
        nativeTheme.emit('updated');
      }, dark);
    };
    for (const mode of ['system', 'light', 'dark']) {
      await page.evaluate((mode) => window.study.setAppearance({ mode }), mode);
      for (const systemDark of [true, false]) {
        await systemChange(systemDark);
        const expected = mode === 'system' ? systemDark : mode === 'dark';
        await expect
          .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
          .toBe(expected);
        expect(
          await app.evaluate(({ BrowserWindow }) =>
            BrowserWindow.getAllWindows()[0].getBackgroundColor(),
          ),
        ).toBe(expected ? '#0F172A' : '#F5F7FB');
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.classList.contains('theme-switching')),
          )
          .toBe(false);
      }
    }
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
