import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { installer } from './installer.mjs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { StudyStore } from '../electron/store.js';
import { LabStore } from '../electron/labs.js';
import { labs } from '../content/labs.js';
import { questions } from '../content/questions.js';
import { documents } from '../content/documents.js';
import { articleHTML } from '../tests/fixtures/reader.js';
import { DocumentStore } from '../electron/document-store.js';
import { Tutor } from '../electron/tutor.js';

assert.equal(
  process.env.CI,
  'true',
  'Packaged tests require a disposable CI account; never run against a personal profile.',
);
const installation = process.argv[2] || process.env.AZ104_PACKAGED_EXECUTABLE ? null : installer();
installation?.install();
const executablePath = resolve(
  process.argv[2] || process.env.AZ104_PACKAGED_EXECUTABLE || installation.executable,
);
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
const reader = new DocumentStore(store);
reader.save(
  documents.find((d) => d.id === 'rbac'),
  { html: articleHTML() },
);
const annotation = reader.annotate({
  documentId: 'rbac',
  sectionId: 'rbac:role-assignments',
  kind: 'bookmark',
  note: 'Saved packaged bookmark',
});
const tutor = new Tutor(store, reader, {});
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
store.db.exec('DROP TABLE portable_messages; DROP TABLE portable_questions; PRAGMA user_version=8');
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
    app = await electron.launch({ executablePath, env, cwd: dirname(executablePath) });
    const launchMs = Math.round(performance.now() - start);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    const domMs = Math.round(performance.now() - start);
    const state = await page.evaluate(() => window.study.getState());
    if (!state.onboarded)
      await page.getByRole('button', { name: 'Continue without AI' }).waitFor();
    else await page.getByRole('button', { name: 'Settings & sources', exact: true }).waitFor();
    const startupMs = Math.round(performance.now() - start);
    console.log(JSON.stringify({ pass, launchMs, domMs, startupMs }));
    assert.ok(startupMs < 5000, `Usable startup exceeded 5 seconds: ${startupMs}`);
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
    assert.ok(
      readdirSync(profile).some((n) => n.includes('.v8.')),
      'Migration backup missing',
    );
    console.log(
      JSON.stringify({
        pass,
        pageURL: page.url(),
        appPath: await app.evaluate(({ app }) => app.getAppPath()),
      }),
    );
    if (pass === 0 && runtime.safe)
      await page.evaluate(() =>
        window.study.saveKey({ key: 'ci-only-storage-placeholder', sessionConsent: true }),
      );
    if (pass === 1 && runtime.safe) {
      assert.equal(state.credentials.hasKey, true);
      const restored = await app.evaluate(
        async ({ safeStorage }, file) => {
          const fs = process.getBuiltinModule('fs');
          return safeStorage.decryptString(fs.readFileSync(file));
        },
        join(profile, 'openai-key.enc'),
      );
      assert.equal(restored, 'ci-only-storage-placeholder');
    }
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
    assert.ok(persisted.queue.jobs.some((j) => j.id === 'checkpoint' && j.status === 'paused'));
    const reading = await page.evaluate(() => window.study.reader.state());
    assert.ok(
      reading.annotations.some(
        (a) => a.id === annotation.id && a.note === 'Saved packaged bookmark',
      ),
    );
    if (pass === 0) {
      await page.evaluate(
        async ({ session, questions }) => {
          for (const item of session.items) {
            const q = questions.find((q) => q.id === item.question.id);
            await window.study.submit({
              sessionId: session.id,
              questionId: q.id,
              selectedOptionIds: q.correctOptionIds,
              durationMs: 1,
            });
            await window.study.advance({ sessionId: session.id, questionId: q.id });
          }
        },
        { session, questions },
      );
    } else {
      const completed = await page.evaluate((id) => window.study.session(id), session.id);
      assert.ok(completed.completedAt);
      assert.equal(
        (await page.evaluate(() => window.study.getState())).sessions.find(
          (s) => s.id === session.id,
        ).answered,
        5,
      );
    }
    assert.equal(persisted.diagnostics.appVersion, '0.5.0');
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
      startupMs,
      launchMs,
      domMs,
      workflowMs: Math.round(performance.now() - start),
      secureStorage: runtime.safe,
      profilePreserved: true,
      offlineLocalData: true,
    });
    await app.close();
    app = null;
    if (pass === 0) installation?.install();
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
  await installation?.cleanup();
}
