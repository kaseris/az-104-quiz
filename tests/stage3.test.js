import { schemaVersion } from '../electron/migrations.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { StudyStore } from '../electron/store.js';
import { DocumentStore } from '../electron/document-store.js';
import {
  extractArticle,
  approvedURL,
  safeLookup,
  publicAddress,
  readBody,
  fetchArticle,
  MAX_BYTES,
} from '../electron/document-source.js';
import { documents } from '../content/documents.js';
import { objectives, skills } from '../content/catalog.js';
import { articleHTML } from './fixtures/reader.js';
const source = documents.find((d) => d.id === 'rbac');
function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-reader-'));
  const path = join(dir, 'study.sqlite');
  let store = new StudyStore(path);
  let reader = new DocumentStore(store, options);
  t.after(() => {
    reader.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    dir,
    path,
    get store() {
      return store;
    },
    get reader() {
      return reader;
    },
    reopen() {
      reader.close();
      store.close();
      store = new StudyStore(path);
      reader = new DocumentStore(store, options);
    },
  };
}
const save = (reader, html = articleHTML(), entry = source) => {
  reader.save(entry, { html });
  return reader.read({ id: entry.id }).article;
};
const highlight = (reader, a) =>
  reader.annotate({
    documentId: 'rbac',
    revision: a.revision,
    sectionId: 'rbac:role-assignments',
    quote: 'A role assignment connects a principal, a role, and a scope.',
    note: 'Review this.',
    kind: 'highlight',
  });
test('registry covers every objective, mappings are valid, identities and URLs are unique', () => {
  assert.equal(new Set(documents.map((d) => d.objectiveId)).size, objectives.length);
  assert.equal(new Set(documents.map((d) => d.id)).size, documents.length);
  assert.equal(new Set(documents.map((d) => d.url)).size, documents.length);
  for (const d of documents) {
    approvedURL(d.url);
    assert.ok(d.skillIds.every((id) => skills.some((s) => s.id === id)));
    assert.ok(d.licenseUrl);
  }
});
test('extraction preserves prose, lists, code, tables, anchors and revision stability', () => {
  const article = extractArticle(articleHTML(), source);
  const content = JSON.stringify(article);
  assert.equal(article.sections.length, 4);
  assert.ok(content.includes('"tag":"table"'));
  assert.ok(content.includes('"tag":"pre"'));
  assert.ok(content.includes('"tag":"ul"'));
  assert.ok(article.sections[3].text.includes("param location string = 'eastus'"));
  assert.equal(extractArticle(articleHTML(), source).revision, article.revision);
  assert.notEqual(
    extractArticle(articleHTML({ passage: 'Changed meaning.' }), source).revision,
    article.revision,
  );
  assert.equal(article.sections[1].id, 'rbac:role-assignments');
  assert.ok(!content.includes('Unrelated chrome'));
});
test('malicious markup cannot become executable reader content or unsafe links', () => {
  const extra = `<script>window.study.saveKey('evil')</script><img src="http://127.0.0.1/x" onerror="evil()" alt="Diagram"><a href="javascript:evil()">Bad link</a><svg onload="evil()"><script>evil()</script></svg><iframe src="https://evil.test"></iframe><form><input></form><p onclick="evil()">Safe text</p>`;
  const output = JSON.stringify(extractArticle(articleHTML({ extra }), source));
  for (const value of [
    'evil()',
    'window.study',
    '127.0.0.1',
    'javascript:',
    '"tag":"script"',
    '"tag":"iframe"',
    '"tag":"form"',
    'onclick',
    'onerror',
  ])
    assert.ok(!output.includes(value), value);
  assert.ok(output.includes('View media in original'));
  assert.ok(output.includes('Safe text'));
});
test('missing permissions evidence, unsupported layout, excessive input and unknown repository fail closed', () => {
  assert.throws(
    () => extractArticle(articleHTML().replace('azure-docs/blob', 'unknown/blob'), source),
    /evidence/,
  );
  assert.throws(
    () => extractArticle(articleHTML().replace('id="main"', 'id="other"'), source),
    /layout/,
  );
  assert.throws(() => extractArticle('x'.repeat(MAX_BYTES + 1), source), /limit/);
});
test('approved URLs and public DNS prevent loopback, mapped IPv6, credentials and unsafe redirects', async () => {
  for (const url of [
    'http://learn.microsoft.com/en-us/azure/test',
    'https://localhost/x',
    'https://learn.microsoft.com:444/en-us/azure/x',
    'https://user@learn.microsoft.com/en-us/azure/x',
    'https://learn.microsoft.com.evil.test/en-us/azure/x',
    'file:///tmp/x',
  ])
    assert.throws(() => approvedURL(url));
  for (const ip of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '100.64.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
    '0.0.0.0',
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  await assert.rejects(
    safeLookup('learn.microsoft.com', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
    /prohibited/,
  );
});
test('decoded response size is bounded including compression and unsupported encoding', async () => {
  const response = (body, encoding) => {
    const r = Readable.from([body]);
    r.headers = { 'content-encoding': encoding };
    return r;
  };
  assert.equal(await readBody(response(gzipSync('hello'), 'gzip')), 'hello');
  await assert.rejects(readBody(response(gzipSync('a'.repeat(500)), 'gzip'), 100), /limit/);
  await assert.rejects(readBody(response(Buffer.from('a'), 'unknown')), /encoding/);
});
test('timeout and cancellation also bound unresolved DNS without sending requests', async () => {
  const resolver = () => new Promise(() => {});
  await assert.rejects(fetchArticle(source.url, { resolver, timeout: 20 }), /timed out/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    fetchArticle(source.url, { signal: controller.signal, resolver }),
    /cancelled/,
  );
});
test('section search returns excerpts and respects domain/objective/skill filters', (t) => {
  const { reader } = fixture(t);
  save(reader);
  const matches = reader.search({ query: 'principal role' });
  assert.ok(matches.length);
  assert.equal(matches[0].sectionId, 'rbac:role-assignments');
  assert.ok(matches[0].excerpt.includes('principal'));
  assert.equal(reader.search({ query: 'principal', domainId: 'storage' }).length, 0);
  assert.equal(
    reader.search({ query: 'principal', skillId: 'identity.access.assignments' }).length,
    1,
  );
  assert.deepEqual(reader.search({ query: '" OR * :' }), reader.search({ query: 'OR' }));
  assert.deepEqual(reader.search({ query: '' }), []);
});
test('highlights, bookmarks, note edits, and drafts survive restart with exact pinned references', (t) => {
  const f = fixture(t);
  const a = save(f.reader);
  const h = highlight(f.reader, a);
  f.reader.annotate({
    documentId: source.id,
    revision: a.revision,
    sectionId: a.sections[0].id,
    kind: 'bookmark',
  });
  f.reader.note({ id: h.id, note: 'Changed note' });
  const draft = f.reader.saveDraft({ title: 'Explain scopes', body: 'Why does this matter?' });
  f.reader.draftReference({ id: draft.id, reference: { kind: 'highlight', id: h.id } });
  f.reader.draftReference({ id: draft.id, reference: { kind: 'domain', id: 'identity' } });
  f.reopen();
  assert.equal(f.reader.annotations().length, 2);
  assert.equal(f.reader.annotations().find((a) => a.id === h.id).note, 'Changed note');
  const d = f.reader.drafts()[0];
  assert.equal(d.body, 'Why does this matter?');
  assert.equal(d.references[0].revision, a.revision);
  assert.equal(d.references[0].excerpt, h.quote);
  assert.ok(d.references[1].blueprintVersion);
});
test('refresh reattaches unambiguous unchanged context but preserves originals on changed meaning', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  const h = highlight(reader, a);
  const b = save(reader, articleHTML({ extra: '<p>A new unrelated final paragraph.</p>' }));
  let restored = reader.annotations()[0];
  assert.equal(restored.status, 'attached');
  assert.equal(restored.currentRevision, b.revision);
  assert.equal(restored.originalRevision, a.revision);
  save(reader, articleHTML({ passage: 'Role assignments no longer have the original wording.' }));
  restored = reader.annotations()[0];
  assert.equal(restored.status, 'stale');
  assert.equal(restored.quote, h.quote);
  assert.equal(restored.currentRevision, b.revision);
});
test('ambiguous and missing-section matches stay stale; repair retains previous quote', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  const h = highlight(reader, a);
  const changed = save(
    reader,
    articleHTML({ passage: 'A different and unique statement about Azure scopes.' }),
  );
  const repaired = reader.annotate({
    id: h.id,
    documentId: source.id,
    revision: changed.revision,
    sectionId: 'rbac:role-assignments',
    quote: 'A different and unique statement about Azure scopes.',
  });
  assert.equal(repaired.repairedFrom.quote, h.quote);
  assert.throws(
    () =>
      reader.annotate({
        documentId: source.id,
        revision: changed.revision,
        sectionId: 'missing',
        quote: 'hello',
      }),
    /section/,
  );
  const duplicate = save(reader, articleHTML({ passage: 'repeat repeat' }));
  assert.throws(
    () =>
      reader.annotate({
        documentId: source.id,
        revision: duplicate.revision,
        sectionId: 'rbac:role-assignments',
        quote: 'repeat',
      }),
    /unique/,
  );
});
test('failed retrieval and cancelled refresh preserve the existing article and search', async (t) => {
  const f = fixture(t, {
    fetcher: async () => {
      throw new Error('Test offline');
    },
  });
  const a = save(f.reader);
  await assert.rejects(f.reader.fetch({ id: source.id }), /offline/);
  assert.equal(f.reader.read({ id: source.id }).article.revision, a.revision);
  assert.ok(f.reader.search({ query: 'principal' }).length);
  f.reader.fetcher = async (_url, { signal }) =>
    new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(new Error('cancelled'))),
    );
  const pending = f.reader.fetch({ id: source.id });
  f.reader.cancel({ id: source.id });
  await assert.rejects(pending, /cancelled/);
  assert.equal(f.reader.read({ id: source.id }).article.revision, a.revision);
  assert.equal(
    f.reader.state().documents.find((d) => d.id === source.id).state.status,
    'cancelled',
  );
});
test('cache clearing retains annotations and drafts, marks unavailable and removes search', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  highlight(reader, a);
  const d = reader.saveDraft({ title: 'Saved' });
  reader.draftReference({
    id: d.id,
    reference: {
      kind: 'section',
      documentId: source.id,
      revision: a.revision,
      sectionId: a.sections[0].id,
    },
  });
  assert.throws(() => reader.clear({}), /Confirm/);
  reader.clear({ confirmed: true });
  assert.equal(reader.read({ id: source.id }).article, null);
  assert.equal(reader.annotations()[0].available, false);
  assert.equal(reader.drafts()[0].references[0].status, 'unavailable');
  assert.equal(reader.search({ query: 'principal' }).length, 0);
  assert.equal(reader.cacheInfo().bytes, 0);
});
test('LRU eviction is bounded and recovery of a cached revision restores search', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  highlight(reader, a);
  const bytes = reader.cacheInfo().bytes;
  reader.budget = bytes + 100;
  save(reader, articleHTML({ extra: '<p>New revision.</p>' }));
  assert.ok(reader.cacheInfo().bytes <= reader.budget);
  assert.equal(reader.version(source.id, a.revision).payload, null);
  assert.equal(reader.annotations().length, 1);
  reader.clear({ confirmed: true });
  save(reader);
  assert.ok(reader.search({ query: 'principal' }).length);
});
test('unknown IDs and forged excerpts cannot be saved; draft CRUD keeps references bounded', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  const d = reader.saveDraft({ body: 'Draft' });
  assert.throws(() => reader.read({ id: 'https://evil.test' }), /Unknown/);
  assert.throws(
    () =>
      reader.draftReference({
        id: d.id,
        reference: {
          kind: 'selection',
          documentId: source.id,
          revision: a.revision,
          sectionId: a.sections[0].id,
          quote: 'invented statement',
        },
      }),
    /Selection/,
  );
  reader.draftReference({
    id: d.id,
    reference: { kind: 'document', documentId: source.id, revision: a.revision },
  });
  reader.saveDraft({ id: d.id, body: 'Updated', title: 'Question' });
  assert.equal(reader.drafts()[0].references.length, 1);
  reader.draftReference({ id: d.id, removeIndex: 0 });
  assert.equal(reader.drafts()[0].references.length, 0);
  reader.removeDraft({ id: d.id });
  assert.equal(reader.drafts().length, 0);
});
test('picker covers domains, documents, headings, highlights and resolution has explicit fallbacks', (t) => {
  const { reader } = fixture(t);
  const a = save(reader);
  highlight(reader, a);
  const kinds = new Set(reader.picker().map((p) => p.kind));
  for (const kind of ['domain', 'document', 'heading', 'highlight']) assert.ok(kinds.has(kind));
  assert.equal(
    reader.resolve({ skillId: 'identity.access.assignments' }).sectionId,
    'rbac:role-assignments',
  );
  assert.ok(reader.resolve({ objectiveId: 'identity.users' }).notice);
});
test('v2 migration preserves session rows, makes a backup, and interrupted retrieval recovers', (t) => {
  const f = fixture(t);
  const before = f.store.start({ domainId: 'all', count: 5 });
  f.store.db.exec(
    'DROP TABLE IF EXISTS portable_messages; DROP TABLE IF EXISTS portable_questions; DROP TABLE lab_attempts; DROP TABLE generated_questions; DROP TABLE generation_candidates; DROP TABLE generation_holds; DROP TABLE generation_events; DROP TABLE generation_triggers; DROP TABLE generation_jobs; DROP TABLE tutor_previews; DROP TABLE ai_requests; DROP TABLE tutor_conversations; DROP TABLE document_search; DROP TABLE document_status; DROP TABLE document_versions; DROP TABLE document_annotations; DROP TABLE document_drafts; PRAGMA user_version=2;',
  );
  f.reopen();
  assert.equal(f.store.session(before.id).items.length, before.items.length);
  assert.ok(readdirSync(f.dir).some((p) => p.includes('.v2.')));
  assert.equal(f.store.db.prepare('PRAGMA user_version').get().user_version, schemaVersion);
  f.store.db
    .prepare("INSERT INTO document_status(document_id,status) VALUES('rbac','loading')")
    .run();
  f.reopen();
  assert.equal(f.reader.read({ id: source.id }).status.status, 'interrupted');
});
test('stage 3 migration failure rolls back without changing the existing database', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'az104-v2-failure-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'study.sqlite');
  let db = new DatabaseSync(path);
  db.exec('CREATE TABLE document_versions(marker TEXT); PRAGMA user_version=2');
  db.close();
  assert.throws(() => new StudyStore(path));
  db = new DatabaseSync(path);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 2);
  assert.equal(
    db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='document_status'").get().n,
    0,
  );
  db.close();
  assert.ok(readdirSync(dir).some((p) => p.includes('.backup')));
});

test('redirect policy, redirect count, HTTP errors and MIME checks apply before import', async () => {
  const { EventEmitter } = await import('node:events');
  const resolver = async () => [{ address: '8.8.8.8', family: 4 }];
  function transport(responses, calls) {
    return (url, options, callback) => {
      calls.push(url.href);
      const req = new EventEmitter();
      req.end = () =>
        queueMicrotask(() => {
          const data = responses.shift();
          const response = Readable.from([Buffer.from(data.body || '')]);
          response.statusCode = data.status;
          response.headers = data.headers || {};
          options.lookup('learn.microsoft.com', { all: false }, (error, address) => {
            assert.equal(error, null);
            assert.equal(address, '8.8.8.8');
          });
          callback(response);
        });
      return req;
    };
  }
  let calls = [];
  await assert.rejects(
    fetchArticle(source.url, {
      resolver,
      requester: transport(
        [{ status: 302, headers: { location: 'https://127.0.0.1/secrets' } }],
        calls,
      ),
    }),
    /approved/,
  );
  assert.equal(calls.length, 1);
  calls = [];
  const redirects = Array.from({ length: 4 }, () => ({
    status: 302,
    headers: { location: '/en-us/azure/next' },
  }));
  await assert.rejects(
    fetchArticle(source.url, { resolver, requester: transport(redirects, calls) }),
    /too many/,
  );
  assert.equal(calls.length, 4);
  await assert.rejects(
    fetchArticle(source.url, { resolver, requester: transport([{ status: 404 }], []) }),
    /HTTP 404/,
  );
  await assert.rejects(
    fetchArticle(source.url, {
      resolver,
      requester: transport([{ status: 200, headers: { 'content-type': 'application/pdf' } }], []),
    }),
    /format/,
  );
  const result = await fetchArticle(source.url, {
    resolver,
    requester: transport(
      [
        { status: 302, headers: { location: '/en-us/azure/next' } },
        { status: 200, headers: { 'content-type': 'text/html' }, body: '<p>hello</p>' },
      ],
      [],
    ),
  });
  assert.equal(result.redirects.length, 1);
  assert.equal(result.finalUrl, 'https://learn.microsoft.com/en-us/azure/next');
  assert.equal(result.html, '<p>hello</p>');
});
test('duplicate contextual matches and removed anchors never silently reattach', (t) => {
  const { reader } = fixture(t);
  const passage = `${'prefix '.repeat(12)}unique quote${' suffix'.repeat(12)}`;
  const a = save(reader, articleHTML({ passage }));
  reader.annotate({
    documentId: source.id,
    revision: a.revision,
    sectionId: 'rbac:role-assignments',
    quote: 'unique quote',
  });
  save(reader, articleHTML({ passage: `${passage} ${passage}` }));
  assert.equal(reader.annotations()[0].status, 'stale');
  save(reader, articleHTML({ passage }).replace('id="role-assignments"', 'id="renamed-section"'));
  assert.equal(reader.annotations()[0].status, 'stale');
});
