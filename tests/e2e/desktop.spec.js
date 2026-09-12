import { screenshot } from './screenshot.js';
import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { questions } from '../../content/questions.js';

const root = resolve('.');
async function launch(directory) {
  const env = { ...process.env, AZ104_DATA_DIR: directory };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  const app = await electron.launch({ args: [root], env });
  const page = await app.firstWindow();
  await page.evaluate(
    (mode) => window.study.setAppearance({ mode }),
    test.info().project.name === 'dark' ? 'dark' : 'light',
  );
  await page.context().setOffline(true);
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

test('offline desktop lifecycle: skip, saved draft, frozen answer, full quiz and history across restarts', async ({}, testInfo) => {
  const directory = mkdtempSync(join(tmpdir(), 'az104-desktop-'));
  let app, page;
  const errors = [];
  try {
    ({ app, page } = await launch(directory));
    page.on('pageerror', (e) => errors.push(e.message));
    await expect(page.getByRole('heading', { name: 'Start where you are.' })).toBeVisible();
    await screenshot(page, {
      path: testInfo.outputPath('01-onboarding.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Continue without AI' }).click();
    await expect(page.getByRole('heading', { name: 'Make room for progress.' })).toBeVisible();
    await screenshot(page, {
      path: testInfo.outputPath('02-overview.png'),
      fullPage: true,
      animations: 'disabled',
    });
    const isolation = await page.evaluate(() => ({
      require: typeof window.require,
      process: typeof window.process,
    }));
    expect(isolation).toEqual({ require: 'undefined', process: 'undefined' });
    await page.getByRole('button', { name: 'Set up a practice quiz' }).click();
    await page.getByRole('radio', { name: '20 questions' }).check();
    await page.getByRole('button', { name: 'Start 20-question quiz' }).click();
    const title = await page.locator('.question-panel h1').innerText();
    const first = questions.find((q) => q.title === title);
    const wrong = first.options.find((o) => !first.correctOptionIds.includes(o.id));
    await page
      .locator('label.answer-option')
      .filter({ has: page.getByText(wrong.text, { exact: true }) })
      .click();
    if (first.type === 'multiple') {
      await page
        .locator('label.answer-option')
        .filter({ hasText: first.options.find((o) => first.correctOptionIds.includes(o.id)).text })
        .click();
    }
    await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeEnabled();
    const chosen = await page.locator('label.answer-option.chosen .answer-text').allTextContents();
    const order = await page.locator('.answer-text').allTextContents();
    await screenshot(page, {
      path: testInfo.outputPath('03-question.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await app.close();
    ({ app, page } = await launch(directory));
    page.on('pageerror', (e) => errors.push(e.message));
    await expect(page.getByRole('heading', { name: 'Make room for progress.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue without AI' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Resume session', exact: true }).click();
    await expect(page.locator('.question-panel h1')).toHaveText(title);
    expect(await page.locator('.answer-text').allTextContents()).toEqual(order);
    expect(await page.locator('label.answer-option.chosen .answer-text').allTextContents()).toEqual(
      chosen,
    );
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A useful one to revisit.' })).toBeVisible();
    const incorrectTile = page.locator('.question-map [aria-label="Question 1: incorrect"]');
    await expect(incorrectTile).toHaveClass(/incorrect/);
    await expect(incorrectTile.locator('svg.lucide-x')).toHaveCount(1);
    await expect(incorrectTile.locator('svg.lucide-check')).toHaveCount(0);
    expect(
      await incorrectTile.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--color-error-text)';
        el.append(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return getComputedStyle(el).color === expected;
      }),
    ).toBe(true);
    await screenshot(page, {
      path: testInfo.outputPath('04-explanation.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(
      page.locator('.stat').filter({ hasText: 'QUESTIONS ANSWERED' }).locator('strong'),
    ).toHaveText('1');
    await expect(
      page.locator('.stat').filter({ hasText: 'ANSWER ACCURACY' }).locator('strong'),
    ).toHaveText('0%');
    await app.close();
    ({ app, page } = await launch(directory));
    await page.getByRole('button', { name: 'Resume session', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A useful one to revisit.' })).toBeVisible();
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    await expect(page.locator('.question-panel h1')).not.toHaveText(first.title);
    await expect(
      page.locator('.question-map [aria-label="Question 1: incorrect"] svg.lucide-x'),
    ).toHaveCount(1);
    for (let n = 1; n < 20; n++) {
      const title = await page.locator('.question-panel h1').innerText();
      const q = questions.find((q) => q.title === title);
      for (const id of q.correctOptionIds) {
        const option = q.options.find((o) => o.id === id);
        await page
          .locator('label.answer-option')
          .filter({ has: page.getByText(option.text, { exact: true }) })
          .click();
        await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'That’s right.' })).toBeVisible();
      await expect(
        page.locator(`.question-map [aria-label="Question ${n + 1}: correct"] svg.lucide-check`),
      ).toHaveCount(1);
      await page
        .getByRole('button', { name: n === 19 ? 'Finish & review' : 'Next question', exact: true })
        .click();
      if (n < 19) await expect(page.locator('.question-panel h1')).not.toHaveText(title);
    }
    await expect(page.getByText('19 of 20 correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Missed 1', exact: true }).click();
    await expect(page.locator('.review-item')).toHaveCount(1);
    await page.locator('.review-item summary').first().click();
    await screenshot(page, {
      path: testInfo.outputPath('05-results.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await app.close();
    ({ app, page } = await launch(directory));
    await page.getByRole('button', { name: 'Session history', exact: true }).click();
    await expect(page.locator('.history-row')).toHaveCount(1);
    await expect(page.locator('.history-row')).toContainText('95%');
    await page.locator('.history-row').click();
    await expect(page.getByText('19 of 20 correct', { exact: true })).toBeVisible();
    await page.locator('.skip-link').focus();
    await page.locator('.skip-link').press('Enter');
    expect(await page.evaluate(() => window.study.getState().then((s) => s.onboarded))).toBe(true);
    const refused = await page.evaluate(async () => {
      try {
        await window.study.openReference('https://example.com');
        return 'allowed';
      } catch (error) {
        return error.message;
      }
    });
    expect(refused).toContain('reviewed source list');
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await expect(page.getByText('NO KEY STORED', { exact: true })).toBeVisible();
    await expect(
      page.getByText('15 of 15 objective groups sampled', { exact: true }),
    ).toBeVisible();
    await screenshot(page, {
      path: testInfo.outputPath('06-settings.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, {
      path: testInfo.outputPath('07-narrow.png'),
      fullPage: true,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
