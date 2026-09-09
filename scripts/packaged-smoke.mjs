import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { StudyStore } from '../electron/store.js';
import { LabStore } from '../electron/labs.js';
import { labs } from '../content/labs.js';
import { DocumentStore } from '../electron/document-store.js';
import { Tutor } from '../electron/tutor.js';

assert.equal(
  process.env.CI,
  'true',
  'Packaged tests require a disposable CI account; never run against a personal profile.',
);
const executablePath = resolve(process.argv[2] || process.env.AZ104_PACKAGED_EXECUTABLE || '');
assert.ok(existsSync(executablePath), 'Packaged executable is missing.');
const profile =
  process.platform === 'darwin'
    ? join(homedir(), 'Library/Application Support/AZ-104 Study Desk')
    : join(process.env.APPDATA, 'AZ-104 Study Desk');
assert.ok(!existsSync(profile), 'Refusing to overwrite an existing profile.');
mkdirSync(profile, { recursive: true });
const store = new StudyStore(join(profile, 'study.sqlite'));
const session = store.start({ count: 5 });
const lab = new LabStore(store).start({
  labId: labs.find((l) => l.status === 'released').id,
  method: 'portal',
  preflightReviewed: true,
});
const tutor = new Tutor(store, new DocumentStore(store), {});
const conversation = tutor.create();
store.db
  .prepare(
    "UPDATE tutor_conversations SET data=json_set(data,'$.body','A saved question') WHERE id=?",
  )
  .run(conversation.id);
store.db
  .prepare("INSERT INTO generation_jobs VALUES('checkpoint','paused',?,'2026-09-09','2026-09-09')")
  .run(
    JSON.stringify({
      id: 'checkpoint',
      status: 'paused',
      phase: 'analyzing',
      requestIds: [],
      createdAt: '2026-09-09',
    }),
  );
store.close();
const env = {
  ...process.env,
  AZ104_DEV_SERVER: 'http://127.0.0.1:5173',
  AZ104_DATA_DIR: join(profile, 'ignored-override'),
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
const report = {
  platform: process.platform,
  architecture: process.arch,
  executable: executablePath.split(/[\\/]/).pop(),
  checks: [],
};
try {
  for (let pass = 0; pass < 2; pass++) {
    const start = performance.now();
    app = await electron.launch({ executablePath, env });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    const runtime = await app.evaluate(({ app, safeStorage }) => ({
      packaged: app.isPackaged,
      path: app.getPath('userData'),
      safe: safeStorage.isEncryptionAvailable(),
      encrypted: safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(safeStorage.encryptString('ci-test-placeholder'))
        : null,
    }));
    assert.equal(runtime.packaged, true);
    assert.equal(runtime.path, profile);
    if (runtime.safe) assert.equal(runtime.encrypted, 'ci-test-placeholder');
    const state = await page.evaluate(() => window.study.getState());
    assert.ok(state.sessions.some((s) => s.id));
    if (!state.onboarded) await page.getByRole('button', { name: 'Continue without AI' }).click();
    const persisted = await page.evaluate(
      async ({ labId, conversationId }) => ({
        lab: await window.study.labs.read({ id: labId }),
        chat: await window.study.tutor.read({ id: conversationId }),
        queue: await window.study.generation.list(),
        diagnostics: await window.study.data.diagnostics(),
      }),
      { labId: lab.id, conversationId: conversation.id },
    );
    assert.equal(persisted.lab.id, lab.id);
    assert.equal(persisted.chat.body, 'A saved question');
    assert.equal(persisted.diagnostics.appVersion, '0.5.0');
    const duration = performance.now() - start;
    assert.ok(duration < 5000, `Startup exceeded 5 seconds: ${duration}`);
    const isolation = await page.evaluate(() => ({
      node: typeof window.require,
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
    }));
    assert.equal(isolation.node, 'undefined');
    assert.ok(!isolation.csp.includes('127.0.0.1'));
    await page.getByRole('button', { name: 'Settings & sources', exact: true }).click();
    await page.getByRole('heading', { name: 'Data management', exact: true }).waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY');
    await page.screenshot({
      path: `test-results/packaged-${process.platform}-${process.arch}-${pass}.png`,
      fullPage: true,
    });
    report.checks.push({
      pass,
      startupMs: Math.round(duration),
      secureStorage: runtime.safe,
      profilePreserved: true,
      offlineLocalData: true,
    });
    await app.close();
    app = null;
  }
  const reopened = new StudyStore(join(profile, 'study.sqlite'));
  assert.equal(reopened.session(session.id).items.length, 5);
  reopened.close();
  writeFileSync(
    `test-results/packaged-${process.platform}-${process.arch}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  if (app) await app.close();
  rmSync(profile, { recursive: true, force: true });
}
