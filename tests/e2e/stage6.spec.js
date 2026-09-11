import { screenshot } from './screenshot.js';
import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StudyStore } from '../../electron/store.js';
const root = resolve('.');
test('offline labs: preflight, saved help, recoverable save error, pause and resume across restart', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-stage6-e2e-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Hands-on labs', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Exercise library', exact: true }),
    ).toBeVisible();
  };
  try {
    await launch();
    await page.setViewportSize({ width: 900, height: 760 });
    await screenshot(page, { path: info.outputPath('library.png'), fullPage: true });
    await page.getByLabel('Domain', { exact: true }).selectOption('storage');
    await expect(page.getByText('No exercises match. Try another domain or search.')).toBeVisible();
    await page.getByLabel('Domain', { exact: true }).selectOption('all');
    await page
      .getByRole('button', {
        name: 'View exercise: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
    await expect(page.getByRole('heading', { name: 'Resources and costs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start lab', exact: true })).toBeDisabled();
    await page.getByLabel('Execution method').selectOption('portal');
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Try the goal first' })).toBeVisible();
    // Inject one controlled storage failure through the real desktop service.
    await app.evaluate((_electron, root) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { LabStore } = require(root + '/electron/labs.js');
      const original = LabStore.prototype.update;
      LabStore.prototype.update = function (_p) {
        LabStore.prototype.update = original;
        const error = new Error('simulated storage failure');
        error.code = 'SQLITE_FULL';
        throw error;
      };
    }, root);
    await page.getByRole('button', { name: 'Reveal next hint' }).click();
    await expect(page.getByRole('alert')).toContainText('could not be saved');
    await expect(
      page.getByText('Find the Tags page on the resource group itself.', { exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByText('Find the Tags page on the resource group itself.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reveal full walkthrough', exact: true }).click();
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(page.getByLabel('Current walkthrough step')).toContainText(
      'On Tags, add Environment=Practice',
    );
    const step = await page.getByLabel('Current walkthrough step').innerText();
    await page.getByRole('button', { name: 'Pause lab', exact: true }).click();
    await app.close();
    app = null;
    await launch();
    await page
      .getByRole('button', {
        name: 'Open saved lab: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
    await expect(page.getByRole('button', { name: 'Resume lab', exact: true })).toBeVisible();
    await expect(page.getByLabel('Current walkthrough step')).toHaveText(step);
    await page.getByRole('button', { name: 'Resume lab', exact: true }).click();
    await page.getByRole('button', { name: 'Goal and hints', exact: true }).click();
    await expect(
      page.getByText('Find the Tags page on the resource group itself.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cleanup', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Clean up your exercise resources' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '← Lab library', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'View exercise: Create a virtual network with two subnets',
        exact: true,
      })
      .click();
    await page.getByLabel('Execution method').selectOption('cli');
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await page.getByRole('button', { name: 'Reveal full walkthrough', exact: true }).click();
    await expect(page.getByLabel('Current walkthrough step')).toContainText('az login');
    await page.setViewportSize({ width: 900, height: 760 });
    await screenshot(page, { path: info.outputPath('labs.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const state = await page.evaluate(() => window.study.labs.list());
    expect(state.attempts).toHaveLength(2);
    expect(state.attempts.find((a) => a.labId === 'vnet-two-subnets').method).toBe('cli');
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    const settingsBounds = await page
      .getByRole('button', { name: 'Settings & sources', exact: true })
      .boundingBox();
    expect(settingsBounds.y + settingsBounds.height).toBeLessThanOrEqual(760);
    const navBounds = await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox();
    const labsBounds = await page
      .getByRole('button', { name: 'Hands-on labs', exact: true })
      .boundingBox();
    expect(labsBounds.y + labsBounds.height).toBeLessThanOrEqual(navBounds.y + navBounds.height);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('lab evidence autosaves, completes separately from cleanup, and keeps repeat attempts independent', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-stage6-evidence-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
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
    await page.getByRole('button', { name: 'Hands-on labs', exact: true }).click();
  };
  const evidence = () => page.getByRole('region', { name: 'Lab evidence and completion' });
  const waitSaved = () =>
    expect(
      evidence()
        .getByRole('status')
        .filter({ hasText: /^Saved on this device$/ }),
    ).toBeVisible();
  try {
    await launch();
    await page
      .getByRole('button', {
        name: 'View exercise: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await page.getByRole('button', { name: 'Reveal next hint', exact: true }).click();
    await expect(page.getByLabel('Lab notes', { exact: true })).toBeEnabled();
    await page.getByLabel('Lab notes', { exact: true }).pressSequentially('Checked both tags.');
    await expect(page.getByLabel('Lab notes', { exact: true })).toHaveValue('Checked both tags.');
    await waitSaved();
    await page
      .getByLabel('Pasted command output', { exact: true })
      .fill('<script>window.unexpectedLabScript = true</script>');
    await waitSaved();
    expect(await page.evaluate(() => window.unexpectedLabScript)).toBeUndefined();
    await app.evaluate((_electron, root) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { LabStore } = require(root + '/electron/labs.js');
      const original = LabStore.prototype.evidence;
      LabStore.prototype.evidence = function (_p) {
        LabStore.prototype.evidence = original;
        const error = new Error('simulated evidence failure');
        error.code = 'SQLITE_FULL';
        throw error;
      };
    }, root);
    await page
      .getByLabel('Lab notes', { exact: true })
      .fill('Keep my notes through a failed save.');
    await expect(evidence().getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(evidence()).toBeVisible();
    await expect(page.getByLabel('Lab notes', { exact: true })).toHaveValue(
      'Keep my notes through a failed save.',
    );
    await page.getByRole('button', { name: 'Retry evidence save', exact: true }).click();
    await waitSaved();
    await page.getByLabel('Problem encountered', { exact: true }).selectOption('environment');
    await waitSaved();
    for (const check of await evidence().getByRole('checkbox').all()) await check.check();
    await expect(page.getByRole('button', { name: 'Complete as self-reported' })).toBeEnabled();
    await page.getByRole('button', { name: 'Awaiting evidence', exact: true }).click();
    await expect(page.locator('.lab-toolbar .badge')).toContainText('Awaiting evidence');
    const firstId = (await page.evaluate(() => window.study.labs.list())).attempts[0].id;
    await app.close();
    app = null;
    await launch();
    await page
      .getByRole('button', {
        name: 'Open saved lab: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
    await expect(page.getByLabel('Lab notes', { exact: true })).toHaveValue(
      'Keep my notes through a failed save.',
    );
    await expect(page.getByLabel('Problem encountered', { exact: true })).toHaveValue(
      'environment',
    );
    await page.getByRole('button', { name: 'Complete as self-reported' }).click();
    await expect(page.getByLabel('Lab notes', { exact: true })).toBeDisabled();
    await expect(evidence().getByText('Cleanup pending', { exact: true })).toBeVisible();
    const completed = await page.evaluate((id) => window.study.labs.read({ id }), firstId);
    expect(completed.completionBasis).toBe('self_reported');
    await page.getByLabel('Resource cleanup', { exact: true }).selectOption('completed');
    await page.getByRole('button', { name: 'Discard cleanup changes', exact: true }).click();
    await expect(page.getByLabel('Resource cleanup', { exact: true })).toHaveValue('pending');
    await page.getByLabel('Resource cleanup', { exact: true }).selectOption('completed');
    await page
      .getByLabel('Cleanup note', { exact: true })
      .fill('Dedicated group deleted and absence confirmed.');
    await page.getByRole('button', { name: 'Save cleanup status', exact: true }).click();
    await expect(
      evidence().getByText('Cleanup completed · self-reported', { exact: true }),
    ).toBeVisible();
    const clean = await page.evaluate((id) => window.study.labs.read({ id }), firstId);
    expect(clean.completedAt).toBe(completed.completedAt);
    expect(clean.evidence).toEqual(completed.evidence);
    await page.getByRole('button', { name: 'Start another attempt', exact: true }).click();
    await page.getByLabel('Execution method', { exact: true }).selectOption('cli');
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await expect(page.getByLabel('Lab notes', { exact: true })).toHaveValue('');
    await expect(evidence().getByText('Cleanup pending', { exact: true })).toBeVisible();
    await page.getByLabel('Lab notes', { exact: true }).fill('Independent second attempt.');
    await waitSaved();
    const all = await page.evaluate(() => window.study.labs.list());
    expect(all.attempts).toHaveLength(2);
    expect(all.attempts.find((a) => a.id !== firstId).method).toBe('cli');
    expect(await page.evaluate((id) => window.study.labs.read({ id }), firstId)).toEqual(clean);
    await page.setViewportSize({ width: 900, height: 760 });
    await evidence().scrollIntoViewIfNeeded();
    await screenshot(page, { path: info.outputPath('evidence.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await app.close();
    app = null;
    await launch();
    const final = await page.evaluate((id) => window.study.labs.read({ id }), firstId);
    expect(final).toEqual(clean);
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('6C local recommendations, reflection recovery and filtered history survive restart offline', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-6c-e2e-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
  const quiz = store.start({ count: 5, objectiveId: 'identity.governance' });
  // Seed missed quiz evidence; the real evidence model decides whether the objective needs review.
  store.db
    .prepare('UPDATE session_items SET submitted_at=?,correct=0,assistance=? WHERE session_id=?')
    .run('2026-09-08T08:00:00.000Z', 'none', quiz.id);
  const before = store.evidence();
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
    await page.getByRole('button', { name: 'Hands-on labs', exact: true }).click();
  };
  try {
    await launch();
    const recommendations = page.getByRole('region', { name: 'Local lab recommendations' });
    await expect(recommendations).toContainText('marked Needs review by quiz evidence');
    await recommendations.getByRole('button', { name: /Review suggested lab/ }).click();
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await page
      .getByLabel('Your reflection', { exact: true })
      .fill('I can preserve unrelated tags with merge.');
    await page.getByLabel('Reflection self-assessment').selectOption('understood');
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.getByLabel('Your reflection', { exact: true })).toBeVisible();
    await app.evaluate((_electron, root) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { LabStore } = require(root + '/electron/labs.js');
      const original = LabStore.prototype.reflection;
      LabStore.prototype.reflection = function () {
        LabStore.prototype.reflection = original;
        const error = new Error('simulated reflection failure');
        error.code = 'SQLITE_FULL';
        throw error;
      };
    }, root);
    await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Your reflection', { exact: true })).toHaveValue(
      'I can preserve unrelated tags with merge.',
    );
    await page.getByRole('button', { name: 'Retry evidence save', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Compare with suggested answer', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Compare with suggested answer', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Suggested answer', exact: true }),
    ).toBeVisible();
    const state = await page.evaluate(() => window.study.labs.list());
    const id = state.attempts[0].id;
    await page.setViewportSize({ width: 900, height: 760 });
    await page.getByLabel('Your reflection', { exact: true }).scrollIntoViewIfNeeded();
    await screenshot(page, { path: info.outputPath('reflection.png') });
    await page.getByRole('button', { name: '← Lab library', exact: true }).click();
    await page.getByLabel('History method').selectOption('cli');
    await expect(page.getByText('No saved attempts match these filters.')).toBeVisible();
    await page.getByLabel('History method').selectOption('portal');
    await page.getByLabel('History status').selectOption('cleanup_pending');
    await expect(page.getByText('Reflection: Can explain it', { exact: false })).toBeVisible();
    await screenshot(page, { path: info.outputPath('history.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await app.close();
    app = null;
    await launch();
    await page.getByRole('button', { name: /Open saved lab:/ }).click();
    await expect(page.getByLabel('Your reflection', { exact: true })).toHaveValue(
      'I can preserve unrelated tags with merge.',
    );
    await expect(
      page.getByRole('heading', { name: 'Suggested answer', exact: true }),
    ).toBeVisible();
    const saved = await page.evaluate((id) => window.study.labs.read({ id }), id);
    expect(saved.reflection.assessment).toBe('understood');
    expect(saved.reflection.comparedAt).toBeTruthy();
    expect((await page.evaluate(() => window.study.provider.status())).enabled).toBe(false);
    expect(errors).toEqual([]);
    await app.close();
    app = null;
    const reopened = new StudyStore(join(dir, 'study.sqlite'));
    try {
      expect(reopened.evidence()).toEqual(before);
    } finally {
      reopened.close();
    }
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('6D.1 lab tutoring previews opt-in redacted evidence offline without activating AI', async ({}, info) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-6d1-e2e-'));
  const store = new StudyStore(join(dir, 'study.sqlite'));
  store.setSetting('onboarded', true);
  store.close();
  let app;
  const errors = [];
  try {
    const env = { ...process.env, AZ104_DATA_DIR: dir };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.AZ104_DEV_SERVER;
    app = await electron.launch({ args: [root], env });
    const page = await app.firstWindow();
    await page.evaluate(
      (mode) => window.study.setAppearance({ mode }),
      test.info().project.name === 'dark' ? 'dark' : 'light',
    );
    await page.context().setOffline(true);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Hands-on labs', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'View exercise: Manage tags on a dedicated resource group',
        exact: true,
      })
      .click();
    await page
      .getByLabel('I reviewed prerequisites, costs, dedicated resources and cleanup.')
      .check();
    await page.getByRole('button', { name: 'Start lab', exact: true }).click();
    await page
      .getByLabel('Pasted command output', { exact: true })
      .fill('PRIVATE-IDENTIFIER: denied');
    await expect(
      page.getByRole('button', { name: 'Optional lab tutor', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Optional lab tutor', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Lab context sharing' })).toBeVisible();
    await expect(page.getByLabel('Include lab output', { exact: true })).not.toBeChecked();
    await page.getByRole('button', { name: 'Preview context', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Lab context to be sent', exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.context-excerpt').filter({ hasText: 'PRIVATE-IDENTIFIER' }),
    ).toHaveCount(0);
    await page.getByLabel('Include lab output', { exact: true }).click();
    await expect(page.getByLabel('Include lab output', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Shared lab output', { exact: true })).toHaveValue(
      'PRIVATE-IDENTIFIER: denied',
    );
    await page
      .getByLabel('Shared lab output', { exact: true })
      .fill('Sanitized authorization error');
    await page.getByRole('button', { name: 'Preview context', exact: true }).click();
    await expect(
      page.locator('.context-excerpt').filter({ hasText: 'Sanitized authorization error' }),
    ).toHaveCount(1);
    await expect(
      page.locator('.context-excerpt').filter({ hasText: 'PRIVATE-IDENTIFIER' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Send to tutor', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Activate');
    const conversations = await page.evaluate(() => window.study.tutor.list());
    const c = await page.evaluate((id) => window.study.tutor.read({ id }), conversations[0].id);
    expect(c.requests).toHaveLength(0);
    const labs = await page.evaluate(() => window.study.labs.list());
    const saved = await page.evaluate((id) => window.study.labs.read({ id }), labs.attempts[0].id);
    expect(saved.evidence.output).toBe('PRIVATE-IDENTIFIER: denied');
    expect(saved.status).toBe('in_progress');
    expect(saved.tutorRequests).toBe(0);
    await page.setViewportSize({ width: 900, height: 760 });
    await page.getByRole('region', { name: 'Lab context sharing' }).scrollIntoViewIfNeeded();
    await screenshot(page, { path: info.outputPath('lab-tutor.png') });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
