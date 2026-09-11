import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

// Each lifecycle screenshot also checks the populated/interactive state, in both projects.
export async function screenshot(page, options) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    }));
  });
  await page.screenshot(options);
  expect(violations, options.path).toEqual([]);
}
