// Explicit, bounded live evaluation. Credentials are read only inside Electron's main process.
// The normal profile receives one accounting reservation; study evidence stays in an isolated profile.
import { _electron as electron } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
if (!process.argv.includes('--live'))
  throw new Error('Use --live only for an explicitly authorized paid evaluation.');
const root = resolve('.');
const selectedSkill = process.argv.find((v) => v.startsWith('--skill='))?.slice(8) || null;
const originalDirectory = join(homedir(), 'Library/Application Support/AZ-104 Study Desk');
const original = new DatabaseSync(join(originalDirectory, 'study.sqlite'));
const config = JSON.parse(
  original.prepare("SELECT value FROM settings WHERE key='provider'").get().value,
);
const day = new Date().toISOString().slice(0, 10),
  billingId = randomUUID();
const directory = mkdtempSync(join(tmpdir(), 'az104-stage5-live-'));
let cap, app, summary;
original.exec('BEGIN IMMEDIATE');
try {
  const committed = original
    .prepare(
      'SELECT COALESCE(SUM(CASE WHEN day=? THEN COALESCE(cost,reserved) ELSE CASE WHEN cost IS NULL THEN reserved ELSE 0 END END),0) AS n FROM ai_requests',
    )
    .get(day).n;
  const hasHolds = original
    .prepare("SELECT name FROM sqlite_master WHERE name='generation_holds'")
    .get();
  const held = hasHolds
    ? original.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM generation_holds').get().n
    : 0;
  cap = Math.min(1.5, config.dailyLimit - committed - held);
  if (cap < 1.12)
    throw new Error('Insufficient configured allowance for the bounded live evaluation.');
  original
    .prepare(
      'INSERT INTO ai_requests(id,day,status,model,reserved,payload,context,created_at,pricing_version,prompt_version) VALUES(?,?,?,?,?,?,?,?,?,?)',
    )
    .run(
      billingId,
      day,
      'reserved',
      config.generationModel,
      cap,
      '{}',
      JSON.stringify({ purpose: 'Stage 5 isolated five-domain evaluation', directory }),
      new Date().toISOString(),
      'openai-standard-2026-09-06',
      'stage5-evaluation-v1',
    );
  original.exec('COMMIT');
} catch (e) {
  original.exec('ROLLBACK');
  original.close();
  throw e;
}
try {
  const env = { ...process.env, AZ104_DATA_DIR: directory };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.AZ104_DEV_SERVER;
  app = await electron.launch({ args: [root], env });
  await app.evaluate(
    async ({ safeStorage }, { root, directory, originalDirectory, config, cap, selectedSkill }) => {
      const require = process.getBuiltinModule('module').createRequire(root + '/package.json');
      const { StudyStore } = require(root + '/electron/store.js');
      const { Credentials } = require(root + '/electron/credentials.js');
      const { Provider } = require(root + '/electron/provider.js');
      const { DocumentStore } = require(root + '/electron/document-store.js');
      const { Generation } = require(root + '/electron/generation.js');
      const store = new StudyStore(directory + '/evaluation.sqlite');
      store.setSetting('provider', { ...config, dailyLimit: cap });
      const credentials = new Credentials(originalDirectory, safeStorage);
      const provider = new Provider(store, credentials);
      const reader = new DocumentStore(store);
      const queue = new Generation(store, reader, provider, { autoStart: false });
      globalThis.stage5Live = { store, provider, reader, queue, jobs: [], directory };
      await provider.activate({ consent: true });
      for (const model of new Set([config.generationModel, config.reviewModel]))
        await provider.clientFactory(provider.key()).models.retrieve(model);
      const targets = [
        'identity.access.assignments',
        'storage.accounts.redundancy',
        'compute.vms.availability',
        'networking.security.groups',
        'monitoring.monitor.alerts',
      ];
      for (const primarySkillId of targets.filter((id) => !selectedSkill || selectedSkill === id)) {
        const q = store.bank.find((q) => q.primarySkillId === primarySkillId);
        if (!q) throw new Error('Missing evaluation question for ' + primarySkillId);
        const id = 'live-' + primarySkillId;
        const stamp = new Date().toISOString();
        store.db
          .prepare(
            'INSERT INTO sessions(id,started_at,completed_at,domain_id,blueprint_version) VALUES(?,?,?,?,?)',
          )
          .run(id, stamp, stamp, q.domainId, q.blueprintVersion);
        store.db
          .prepare(
            "INSERT INTO session_items(session_id,position,question_id,snapshot,selected,submitted_at,correct,confidence,assistance) VALUES(?,0,?,?,?,?,0,'confident','none')",
          )
          .run(
            id,
            q.id,
            JSON.stringify(q),
            JSON.stringify([q.options.find((o) => !q.correctOptionIds.includes(o.id)).id]),
            stamp,
          );
        const job = queue.create({ sessionId: id, count: 1 });
        globalThis.stage5Live.jobs.push(job.id);
      }
    },
    { root, directory, originalDirectory, config, cap, selectedSkill },
  );
  for (let i = 0; i < 45; i++) {
    const status = await app.evaluate(async () => {
      const f = globalThis.stage5Live;
      await f.queue.tick();
      return f.queue.list().jobs.map(({ id, status, phase, reason, message }) => ({
        id,
        status,
        phase,
        reason,
        message,
      }));
    });
    console.log(JSON.stringify(status));
    if (status.every((j) => ['completed', 'failed', 'paused', 'cancelled'].includes(j.status)))
      break;
  }
  summary = await app.evaluate(() => {
    const f = globalThis.stage5Live;
    return {
      checkedAt: new Date().toISOString(),
      usage: f.provider.usage(),
      jobs: f.jobs.map((id) => f.queue.read({ id })),
    };
  });
  writeFileSync(
    join(
      root,
      selectedSkill ? 'docs/STAGE5_LIVE_MONITORING.json' : 'docs/STAGE5_LIVE_EVALUATION.json',
    ),
    JSON.stringify(summary, null, 2) + '\n',
  );
} finally {
  let accounting = null;
  if (app) {
    try {
      accounting = await app.evaluate(() => {
        const f = globalThis.stage5Live;
        if (!f) return null;
        f.queue.close();
        return f.store.db
          .prepare(
            'SELECT COALESCE(SUM(COALESCE(cost,reserved)),0) AS committed,COALESCE(SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END),0) AS unknown,COALESCE(SUM(input_tokens),0) AS input,COALESCE(SUM(output_tokens),0) AS output FROM ai_requests',
          )
          .get();
      });
    } catch {
      /* Retain the reservation if accounting is unavailable. */
    }
    await app.close();
  }
  if (accounting)
    original
      .prepare(
        'UPDATE ai_requests SET status=?,cost=?,reserved=?,input_tokens=?,output_tokens=? WHERE id=?',
      )
      .run(
        accounting.unknown ? 'interrupted' : 'completed',
        accounting.unknown ? null : accounting.committed,
        accounting.committed,
        accounting.input,
        accounting.output,
        billingId,
      );
  original.close();
  console.log(JSON.stringify({ directory, billingId, cap, accounting }));
}
