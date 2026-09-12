import { screenshot } from './screenshot.js';
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
  await page.evaluate(
    (mode) => window.study.setAppearance({ mode }),
    test.info().project.name === 'dark' ? 'dark' : 'light',
  );
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}
function seed(dir) {
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
  const reader = new DocumentStore(store);
  reader.save(
    documents.find((d) => d.id === 'rbac'),
    { html: articleHTML() },
  );
  store.close();
}
async function selectPassage(page) {
  const passage = page
    .locator('[data-reader-section="rbac:role-assignments"] .section-content p')
    .first();
  await passage.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
}
test('reader offline lifecycle: search, highlight, bookmark, @ references, drafts and cache clearing across restart', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-reader-e2e-'));
  seed(dir);
  let app, page;
  const errors = [];
  try {
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => {
      errors.push(e.message);
      console.log('Reader runtime error:', e.message);
    });
    await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Read. Connect. Remember.' })).toBeVisible();
    await page.getByLabel('Search cached documentation').fill('principal role');
    await page.getByRole('button', { name: 'Search sections' }).click();
    await expect(page.getByRole('heading', { name: '1 matching sections' })).toBeVisible();
    await page.locator('.reader-result').first().click();
    await expect(
      page
        .locator('.reader-section')
        .filter({ has: page.getByRole('heading', { name: 'Role assignments', exact: true }) }),
    ).toBeVisible();
    await expect(page.locator('.reader-table table')).toContainText('Inspect resources');
    await expect(page.locator('.section-content pre')).toContainText(
      "param location string = 'eastus'",
    );
    const passage = page
      .locator('[data-reader-section="rbac:role-assignments"] .section-content p')
      .first();
    for (const width of [1320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await passage.scrollIntoViewIfNeeded();
      await selectPassage(page);
      const panel = page.getByRole('region', { name: 'Selected text actions' });
      await expect(panel).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const popup = document.querySelector('.selection-tools').getBoundingClientRect();
            const selection = window.getSelection().getRangeAt(0).getBoundingClientRect();
            return (
              popup.left >= 0 &&
              popup.right <= innerWidth &&
              popup.top >= 0 &&
              popup.bottom <= innerHeight &&
              (popup.top >= selection.bottom + 8 || popup.bottom <= selection.top - 8)
            );
          }),
        )
        .toBe(true);
      await screenshot(page, { path: info.outputPath(`selection-${width}.png`) });
      await page.getByLabel('Annotation note', { exact: true }).focus();
      await page.getByLabel('Annotation note', { exact: true }).press('Escape');
      await expect(panel).toHaveCount(0);
    }
    await page.setViewportSize({ width: 1320, height: 900 });
    await passage.scrollIntoViewIfNeeded();
    await selectPassage(page);
    await page.getByLabel('Annotation note', { exact: true }).fill('Review scope inheritance');
    await page.getByRole('button', { name: 'Save highlight', exact: true }).click();
    await expect(page.locator('.saved-annotation')).toContainText('Review scope inheritance');
    await page.getByRole('button', { name: 'Bookmark Comparison', exact: true }).click();
    await expect(page.locator('.saved-annotation')).toHaveCount(2);
    await page.locator('[data-reader-section="rbac:role-assignments"]').evaluate((section) => {
      const heading = section.querySelector('h3');
      const paragraph = section.querySelector('.section-content p');
      const range = document.createRange();
      range.setStart(heading, 0);
      range.setEnd(paragraph, paragraph.childNodes.length);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.getByLabel('Annotation note', { exact: true }).fill('Explain scope inheritance');
    await page.getByRole('button', { name: 'Ask tutor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your study tutor.' })).toBeVisible();
    await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(
      'Explain scope inheritance',
    );
    await expect(page.locator('.reference-chip')).toContainText('Role assignments');
    await expect(page.locator('.tutor-answer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await page.getByLabel('Draft title', { exact: true }).fill('Why do scopes matter?');
    await page.getByLabel('Question', { exact: true }).fill('Explain this @identity');
    await expect(
      page.locator('.reference-picker button').filter({ hasText: 'Identity & governance' }),
    ).toBeVisible();
    await page.getByLabel('Question', { exact: true }).press('Enter');
    await expect(page.locator('.reference-chip')).toHaveCount(2);
    await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
    await page.getByText('Context preview (2 references)', { exact: true }).click();
    await expect(page.locator('.context-excerpt').first()).toContainText(
      'A role assignment connects',
    );
    await screenshot(page, { path: info.outputPath('reader-drafts.png'), fullPage: true });
    expect(
      await page.evaluate(() => ({
        require: typeof window.require,
        process: typeof window.process,
      })),
    ).toEqual({ require: 'undefined', process: 'undefined' });
    const refused = await page.evaluate(async () => {
      try {
        await window.study.reader.openLink({ id: 'rbac', url: 'https://example.com' });
        return false;
      } catch {
        return true;
      }
    });
    expect(refused).toBe(true);
    await app.close();
    ({ app, page } = await launch(dir));
    page.on('pageerror', (e) => {
      errors.push(e.message);
      console.log('Reader runtime error:', e.message);
    });
    await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await expect(page.getByLabel('Draft title', { exact: true })).toHaveValue(
      'Why do scopes matter?',
    );
    await expect(page.getByLabel('Question', { exact: true })).toHaveValue(
      'Explain this @identity',
    );
    await expect(page.locator('.saved-annotation')).toHaveCount(2);
    await expect(page.locator('.reference-chip')).toHaveCount(2);
    await page
      .locator('.reader-entry')
      .filter({ hasText: 'Azure role-based access control' })
      .click();
    await expect(page.locator('.reader-article h2')).toHaveText('Azure access study');
    expect(await page.evaluate(() => CSS.highlights.get('saved-study-highlights')?.size)).toBe(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByLabel('Search cached documentation').focus();
    await page.getByLabel('Search cached documentation').press('Tab');
    await expect(page.getByRole('button', { name: 'Search sections' })).toBeFocused();
    expect(
      await page
        .getByRole('button', { name: 'Search sections' })
        .evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe('none');
    await screenshot(page, { path: info.outputPath('reader-narrow.png'), fullPage: true });
    await page.getByText(/Document cache ·/).click();
    await page.getByRole('button', { name: 'Clear all cached content…', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm cache clearing' }).click();
    await expect(page.getByRole('button', { name: 'Retrieve article', exact: true })).toBeVisible();
    await expect(page.locator('.saved-annotation')).toHaveCount(2);
    await expect(page.locator('.reference-chip').first()).toContainText('unavailable');
    await page.getByLabel('Search cached documentation').fill('principal');
    await page.getByRole('button', { name: 'Search sections' }).click();
    await expect(page.getByRole('heading', { name: '0 matching sections' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (app) {
      await page
        .screenshot({ path: info.outputPath('last-state.png'), fullPage: false })
        .catch(() => {});
      console.log(
        'Reader terminal alerts:',
        await page
          .locator('[role=alert]')
          .allTextContents()
          .catch(() => []),
      );
      await app.close();
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
test('live Microsoft Learn retrieval renders representative prose, tables, and code in Electron', async ({}, info) => {
  test.skip(
    process.env.AZ104_LIVE_READER !== '1',
    'Opt-in live source audit; deterministic tests run without network.',
  );
  const dir = mkdtempSync(join(tmpdir(), 'az104-reader-live-'));
  let app, page;
  try {
    ({ app, page } = await launch(dir));
    await page.getByRole('button', { name: 'Continue without AI' }).click();
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    for (const [title, selector] of [
      ['Azure role-based access control', '.reader-section'],
      ['Storage redundancy', '.reader-table table'],
      ['Create Bicep files with Visual Studio Code', '.section-content pre'],
    ]) {
      await page.locator('.reader-entry').filter({ hasText: title }).click();
      await page.getByRole('button', { name: 'Retrieve article', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Refresh article', exact: true })).toBeVisible({
        timeout: 25000,
      });
      await expect(page.locator(selector).first()).toBeVisible();
      await screenshot(page, {
        path: info.outputPath(`${title.split(' ')[0]}.png`),
        fullPage: true,
      });
    }
    const state = await page.evaluate(() => window.study.reader.state());
    expect(state.documents.filter((d) => d.cached)).toHaveLength(3);
  } finally {
    if (app) {
      await page
        .screenshot({ path: info.outputPath('last-state.png'), fullPage: false })
        .catch(() => {});
      console.log(
        'Reader terminal alerts:',
        await page
          .locator('[role=alert]')
          .allTextContents()
          .catch(() => []),
      );
      await app.close();
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
