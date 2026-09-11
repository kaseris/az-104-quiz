import { screenshot } from './screenshot.js';
import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { questions } from '../../content/questions.js';

for (const viewport of [
  { width: 1100, height: 700 },
  { width: 900, height: 600 },
  { width: 320, height: 640 },
  { width: 1100, height: 700, zoom: 2 },
]) {
  test(`quiz feedback and continuation stay visible at ${viewport.width}×${viewport.height}${viewport.zoom ? ' at 200% zoom' : ''}`, async ({}, info) => {
    const directory = mkdtempSync(join(tmpdir(), 'quiz-viewport-'));
    const env = { ...process.env, AZ104_DATA_DIR: directory };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    const app = await electron.launch({ args: [resolve('.')], env });
    try {
      const page = await app.firstWindow();
      await page.evaluate(
        (mode) => window.study.setAppearance({ mode }),
        test.info().project.name === 'dark' ? 'dark' : 'light',
      );
      await page.context().setOffline(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.zoom) {
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(2),
        );
      }
      await page.getByRole('button', { name: 'Continue without AI' }).click();
      await page.getByRole('button', { name: 'Set up a practice quiz' }).click();
      await page.getByRole('radio', { name: '5 questions', exact: true }).check();
      await page.getByRole('button', { name: 'Start 5-question quiz' }).click();
      const title = page.locator('.question-panel h1');
      await expect(title).toBeFocused();
      const text = await title.innerText();
      const q = questions.find((entry) => entry.title === text);
      for (const id of q.correctOptionIds) {
        await page
          .locator('.answer-option')
          .filter({
            has: page.getByText(q.options.find((option) => option.id === id).text, { exact: true }),
          })
          .click();
        await expect(page.locator('.saved-label')).toHaveText('Saved on this device');
      }
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      const feedback = page.locator('.answer-explanation h2');
      await expect(feedback).toBeFocused();
      const next = page.getByRole('button', { name: 'Next question', exact: true });
      // toBeVisible alone accepts controls below the viewport; check their actual bounds.
      const bounds = await page.evaluate(() => {
        const heading = document.querySelector('.answer-explanation h2').getBoundingClientRect();
        const button = document.querySelector('.question-actions button').getBoundingClientRect();
        return {
          headingTop: heading.top,
          headingBottom: heading.bottom,
          buttonTop: button.top,
          buttonBottom: button.bottom,
          height: innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(bounds.headingTop).toBeGreaterThanOrEqual(0);
      expect(bounds.headingBottom).toBeLessThan(bounds.buttonTop);
      expect(bounds.buttonBottom).toBeLessThanOrEqual(bounds.height);
      expect(bounds.overflow).toBe(false);
      await screenshot(page, { path: info.outputPath('submitted.png') });
      await page.getByText('Why the other choices don’t fit', { exact: true }).click();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const active = document.activeElement.getBoundingClientRect();
        const bar = document.querySelector('.question-actions').getBoundingClientRect();
        return { top: active.top, bottom: active.bottom, barTop: bar.top };
      });
      expect(focus.top).toBeGreaterThanOrEqual(0);
      expect(focus.bottom).toBeLessThanOrEqual(focus.barTop);
      await next.click();
      await expect(title).not.toHaveText(text);
      await expect(title).toBeFocused();
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
