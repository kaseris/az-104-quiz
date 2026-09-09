import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
async function launch(dir) {
  const env = { ...process.env, AZ104_DATA_DIR: dir };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  const app = await electron.launch({ args: [resolve('.')], env });
  const page = await app.firstWindow();
  await page.context().setOffline(true);
  return { app, page };
}
test('adaptive reasons, confidence, progress, issue resolution, exam drafts and hidden feedback survive restart', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'stage2-ui-'));
  let app, page;
  const errors = [];
  try {
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Continue without AI' }).click();
    await page.getByRole('button', { name: 'Learning progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
    await expect(page.getByText(/skills have no eligible questions/)).toBeVisible();
    await page.getByRole('button', { name: 'Practice quizzes', exact: true }).click();
    await page.getByRole('button', { name: 'Start adaptive session' }).click();
    await expect(page.getByText('Not practiced yet', { exact: true })).toBeVisible();
    await page.getByLabel('Confidence', { exact: true }).selectOption('unsure');
    await page.locator('label.answer-option').first().click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByRole('button', { name: 'Report question issue', exact: true }).first().click();
    await page.getByLabel('Notes', { exact: true }).fill('Please review the scenario wording.');
    await page.getByRole('button', { name: 'Save local issue' }).click();
    await expect(page.getByText(/Issue saved locally/)).toBeVisible();
    await page.getByRole('button', { name: 'Question issues', exact: true }).click();
    await page
      .getByLabel('Resolution explanation')
      .fill('Checked the linked reference; the scenario is consistent.');
    await page.getByRole('button', { name: 'Dismiss and restore' }).click();
    await expect(page.getByText(/dismissed:/)).toBeVisible();
    // Complete study answers through the same validated bridge to focus the remaining UI checks on exam behavior.
    await page.evaluate(async () => {
      let state = await window.study.getState(),
        s = await window.study.session(state.activeId);
      while (!s.completedAt) {
        let i = s.items[s.cursor];
        if (!i.submittedAt)
          s = await window.study.submit({
            sessionId: s.id,
            questionId: i.question.id,
            selectedOptionIds: [i.question.options[0].id],
            durationMs: 100,
          });
        s = await window.study.advance({ sessionId: s.id, questionId: i.question.id });
      }
    });
    await app.close();
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Practice quizzes', exact: true }).click();
    await page.getByLabel('Mode', { exact: true }).selectOption('exam');
    await page.getByRole('button', { name: 'Start exam session' }).click();
    await page.locator('label.answer-option').first().click();
    await page.getByLabel('Flag for review').check();
    await page.getByRole('button', { name: 'Question 10: unanswered', exact: true }).click();
    let hidden = await page.evaluate(async () => {
      const st = await window.study.getState();
      const s = await window.study.session(st.activeId);
      return { s, summary: st.sessions[0] };
    });
    expect(hidden.s.correct).toBeNull();
    expect(hidden.summary.correct).toBeNull();
    expect(JSON.stringify(hidden.s)).not.toContain('correctOptionIds');
    expect(hidden.s.items[0].flagged).toBe(true);
    await page.screenshot({
      path: info.outputPath('exam-draft.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await app.close();
    ({ app, page } = await launch(dir));
    await page.getByRole('button', { name: 'Resume session', exact: true }).click();
    await expect(page.getByText('Question 10 of 10', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Question 1: answered, flagged' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
    await expect(page.getByText(/9 questions are unanswered/)).toBeVisible();
    await page.getByRole('button', { name: 'Keep reviewing' }).click();
    await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm final submission' }).click();
    await expect(page.getByRole('heading', { name: 'Another step forward.' })).toBeVisible();
    await page.getByRole('button', { name: 'Learning progress', exact: true }).click();
    await page.locator('.progress-objective').first().locator('summary').click();
    await page.screenshot({
      path: info.outputPath('progress.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
