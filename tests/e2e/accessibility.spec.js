import { test, expect, _electron as electron } from '@playwright/test';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { questions } from '../../content/questions.js';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
test('main screens expose accessible names and sufficient contrast', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-a11y-'));
  let app;
  try {
    const env = { ...process.env, AZ104_DATA_DIR: dir };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    app = await electron.launch({ args: [resolve('.')], env });
    const page = await app.firstWindow();
    await page.evaluate(
      (mode) => window.study.setAppearance({ mode }),
      test.info().project.name === 'dark' ? 'dark' : 'light',
    );
    await page.waitForLoadState('domcontentloaded');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reports = [];
    const scan = async (screen) => {
      await page.evaluate(axe);
      const r = await page.evaluate(() =>
        window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        }),
      );
      reports.push({
        screen,
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
    };
    await scan('onboarding');
    await page.getByRole('button', { name: 'Continue without AI' }).click();
    for (const screen of [
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
      await page.getByRole('button', { name: screen, exact: true }).click();
      await scan(screen);
    }
    const session = await page.evaluate(() => window.study.start({ count: 5 }));
    await page.evaluate(() => window.dispatchEvent(new Event('study:data-changed')));
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session', exact: true }).click();
    await scan('Active quiz');
    const q = questions.find((q) => q.id === session.items[0].question.id);
    for (let i = 0; i < q.correctOptionIds.length; i++)
      await page.locator('label.answer-option').nth(i).click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await scan('Answer explanation');
    writeFileSync('test-results/accessibility.json', JSON.stringify(reports, null, 2));
    expect(
      reports.flatMap((r) => r.violations.map((v) => `${r.screen}: ${v.id} (${v.nodes.length})`)),
    ).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
