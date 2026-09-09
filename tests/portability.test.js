import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudyStore } from '../electron/store.js';
import { Portability } from '../electron/portability.js';
import { LabStore } from '../electron/labs.js';
import { labs } from '../content/labs.js';
import { Tutor } from '../electron/tutor.js';
import { DocumentStore } from '../electron/document-store.js';
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-portable-')),
    path = join(dir, 'study.sqlite');
  const store = new StudyStore(path),
    data = new Portability(store, { filename: path });
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, data, dir, path };
}
test('portable export round trips immutable quiz and lab snapshots, skips identical data, and excludes secrets', (t) => {
  const a = fixture(t),
    b = fixture(t);
  const session = a.store.start({ count: 5 });
  const q = session.items[0].question;
  a.store.draft({
    sessionId: session.id,
    questionId: q.id,
    selectedOptionIds: [q.options[0].id],
    durationMs: 1,
  });
  a.store.setSetting('provider', { apiKey: 'SECRET', enabled: true });
  const lab = new LabStore(a.store).start({
    labId: labs.find((l) => l.status === 'released').id,
    method: 'portal',
    preflightReviewed: true,
  });
  a.store.db
    .prepare("UPDATE lab_attempts SET evidence=json_set(evidence,'$.notes','PRIVATE') WHERE id=?")
    .run(lab.id);
  const exported = a.data.export();
  assert.equal(JSON.stringify(exported).includes('SECRET'), false);
  assert.equal(JSON.stringify(exported).includes('PRIVATE'), false);
  assert.equal(b.data.preview(exported).canApply, true);
  b.data.apply(exported);
  assert.deepEqual(b.store.session(session.id), a.store.session(session.id));
  assert.deepEqual(b.data.export(), exported);
  assert.equal(b.data.preview(exported).counts.sessions.skip, 1);
  assert.equal(b.store.db.prepare('SELECT count(*) n FROM ai_requests').get().n, 0);
  assert.ok(readdirSync(b.dir).some((n) => n.includes('.recovery.')));
});
test('chat history imports as inert messages with retained citations and deletion support', (t) => {
  const a = fixture(t),
    b = fixture(t),
    reader = new DocumentStore(a.store),
    tutor = new Tutor(a.store, reader, {});
  const c = tutor.create();
  a.store.db
    .prepare(
      "INSERT INTO ai_requests(id,conversation_id,day,status,model,reserved,payload,context,text,provider_id,created_at,pricing_version,prompt_version) VALUES('request',?,'2026-09-09','completed','test',1,'{}',?, 'Saved answer [S1]','SECRET','2026-09-09','test','test')",
    )
    .run(
      c.id,
      JSON.stringify({
        question: 'Saved question',
        sources: [
          {
            citation: 'S1',
            title: 'Source',
            documentId: 'rbac',
            revision: 'old',
            excerpt: 'Retained quote',
          },
        ],
      }),
    );
  const bundle = a.data.export({ chats: true });
  assert.equal(JSON.stringify(bundle).includes('SECRET'), false);
  b.data.apply(bundle);
  const restored = new Tutor(b.store, new DocumentStore(b.store), { active: null });
  assert.equal(restored.read({ id: c.id }).requests[0].status, 'historical');
  assert.equal(
    restored.citation({ requestId: 'request', citation: 'S1' }).excerpt,
    'Retained quote',
  );
  assert.equal(b.store.db.prepare('SELECT count(*) n FROM ai_requests').get().n, 0);
  assert.equal(b.data.preview(bundle).counts.portable_messages.skip, 1);
  restored.remove({ id: c.id, confirm: true });
  assert.equal(b.store.db.prepare('SELECT count(*) n FROM portable_messages').get().n, 0);
});
test('invalid references, options, snapshots and conflicting active sessions cannot change the profile', (t) => {
  const a = fixture(t),
    b = fixture(t);
  a.store.start({ count: 5 });
  const good = a.data.export();
  for (const mutate of [
    (x) => x.version++,
    (x) => (x.records.session_items[0].session_id = 'missing'),
    (x) => (x.records.session_items[0].snapshot = '{}'),
    (x) => x.records.settings.push({ key: 'provider', value: '{}' }),
    (x) => x.records.sessions.push(x.records.sessions[0]),
    (x) => (x.attachments = ['../key']),
  ]) {
    const bad = structuredClone(good);
    mutate(bad);
    assert.throws(() => b.data.apply(bad));
    assert.equal(b.store.state().sessions.length, 0);
  }
  b.store.start({ count: 5 });
  assert.equal(b.data.preview(good).canApply, false);
  assert.throws(() => b.data.apply(good), /conflicts/);
});
test('transaction failure rolls back all imported rows and preserves a recovery backup', (t) => {
  const a = fixture(t),
    b = fixture(t);
  a.store.start({ count: 5 });
  b.store.db.exec(
    "CREATE TRIGGER fail_import BEFORE INSERT ON session_items BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END",
  );
  assert.throws(() => b.data.apply(a.data.export()), /simulated/);
  assert.equal(b.store.state().sessions.length, 0);
  assert.ok(readdirSync(b.dir).some((n) => n.includes('.recovery.')));
});
test('reset preserves spending reservations and credentials/settings while removing personal records', (t) => {
  const a = fixture(t);
  a.store.start({ count: 5 });
  a.store.setSetting('provider', { dailyLimit: 2 });
  a.store.db.exec(
    "INSERT INTO ai_requests(id,day,status,model,reserved,payload,context,text,created_at,pricing_version,prompt_version) VALUES('bill','2026-09-09','interrupted','test',1,'{}','{}','PRIVATE','2026-09-09','test','test')",
  );
  assert.throws(() => a.data.erase({ kind: 'study' }));
  a.data.erase({ kind: 'study', confirmed: true });
  assert.equal(a.store.state().sessions.length, 0);
  assert.equal(a.store.setting('provider').dailyLimit, 2);
  assert.equal(a.store.db.prepare('SELECT reserved FROM ai_requests').get().reserved, 1);
  assert.equal(a.store.db.prepare('SELECT text FROM ai_requests').get().text, '');
  assert.equal(JSON.stringify(a.data.diagnostics()).includes(a.dir), false);
});
test('schema 8 upgrades create a backup; unsupported downgrades leave database bytes unchanged', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-schema-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'db.sqlite');
  let s = new StudyStore(path);
  const id = s.start({ count: 5 }).id;
  s.db.exec('DROP TABLE portable_messages;DROP TABLE portable_questions;PRAGMA user_version=8');
  s.close();
  s = new StudyStore(path);
  assert.equal(s.session(id).items.length, 5);
  s.close();
  assert.ok(readdirSync(dir).some((n) => n.includes('.v8.')));
  let db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=DELETE;PRAGMA user_version=999');
  db.close();
  const before = readFileSync(path);
  assert.throws(() => new StudyStore(path), /newer app/);
  assert.deepEqual(readFileSync(path), before);
});

test('annotations retain excerpts after cache-free import and malformed annotation shapes are rejected', (t) => {
  const a = fixture(t),
    b = fixture(t),
    reader = new DocumentStore(a.store);
  const d = {
    id: 'annotation',
    kind: 'highlight',
    documentId: 'rbac',
    sectionId: 'rbac:role-assignments',
    title: 'Roles',
    originalRevision: 'old',
    currentRevision: 'old',
    quote: 'A retained quote',
    prefix: '',
    suffix: '',
    start: 0,
    end: 16,
    note: 'My note',
    status: 'attached',
  };
  a.store.db
    .prepare('INSERT INTO document_annotations VALUES(?,?,?,?)')
    .run(d.id, d.documentId, JSON.stringify(d), '2026-09-09');
  const bundle = a.data.export();
  b.data.apply(bundle);
  assert.equal(new DocumentStore(b.store).annotations()[0].quote, d.quote);
  assert.equal(new DocumentStore(b.store).annotations()[0].available, false);
  assert.equal(reader.annotations()[0].quote, d.quote);
  const bad = structuredClone(bundle);
  bad.records.document_annotations[0].data = JSON.stringify({ ...d, prefix: 42 });
  assert.throws(() => b.data.preview(bad), /annotation shape/);
});

test('generated questions import without executable jobs, and malformed lab states are rejected', (t) => {
  const a = fixture(t),
    b = fixture(t);
  const q = structuredClone(a.store.bank[0]);
  q.id = 'portable-custom';
  q.familyId = 'portable-custom';
  a.store.db.prepare('INSERT INTO portable_questions VALUES(?,?)').run(q.id, JSON.stringify(q));
  a.store.refreshBank();
  const bundle = a.data.export();
  b.data.apply(bundle);
  assert.ok(b.store.bank.some((x) => x.id === q.id));
  assert.equal(b.store.db.prepare('SELECT count(*) n FROM generation_jobs').get().n, 0);
  const lab = new LabStore(a.store).start({
    labId: labs.find((l) => l.status === 'released').id,
    method: 'portal',
    preflightReviewed: true,
  });
  const bad = a.data.export();
  const row = bad.records.lab_attempts.find((r) => r.id === lab.id);
  row.cleanup = JSON.stringify({ status: 'invented', note: '', history: [] });
  assert.throws(() => b.data.preview(bad), /cleanup/);
});

test('export refuses oversized records rather than saving a file its importer cannot accept', (t) => {
  const a = fixture(t);
  a.store.db
    .prepare('INSERT INTO document_drafts VALUES(?,?,?)')
    .run(
      'large',
      JSON.stringify({
        id: 'large',
        title: 'Synthetic',
        body: 'x'.repeat(2 * 1024 * 1024),
        references: [],
      }),
      '2026-09-09',
    );
  assert.throws(() => a.data.export(), /export limits/);
});
