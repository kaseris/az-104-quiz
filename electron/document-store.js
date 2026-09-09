import { randomUUID } from 'node:crypto';
import { documents, registryVersion, sectionMappings } from '../content/documents.js';
import { domains, objectives, skills, blueprint } from '../content/catalog.js';
import { ensure } from './validation.js';
import { extractArticle, fetchArticle, hash } from './document-source.js';
export const normalize = (s) => s.replace(/\s+/g, ' ').trim();
const json = JSON.stringify;
const text = (value, max, label) => {
  ensure(typeof value === 'string' && value.length <= max, `Invalid ${label}.`);
  return value;
};
export class DocumentStore {
  constructor(store, { fetcher = fetchArticle, budget = 100 * 1024 * 1024 } = {}) {
    this.store = store;
    this.db = store.db;
    this.fetcher = fetcher;
    this.budget = budget;
    this.jobs = new Map();
    this.closed = false;
    this.db
      .prepare(
        "UPDATE document_status SET status='interrupted', error='Retrieval was interrupted. Retry when connected.' WHERE status='loading'",
      )
      .run();
  }
  source(id) {
    const d = documents.find((d) => d.id === id);
    ensure(d, 'Unknown documentation entry.');
    return d;
  }
  state() {
    const statuses = this.db.prepare('SELECT * FROM document_status').all();
    return {
      registryVersion,
      domains,
      objectives,
      skills,
      blueprint,
      documents: documents.map((d) => {
        const state = statuses.find((s) => s.document_id === d.id);
        const cached = !!(state?.revision && this.version(d.id, state.revision)?.payload);
        return { ...d, state: state || null, cached };
      }),
      missingSkills: skills.filter((s) => !documents.some((d) => d.skillIds.includes(s.id))),
      annotations: this.annotations(),
      drafts: this.drafts(),
      cache: this.cacheInfo(),
    };
  }
  version(id, revision) {
    return this.db
      .prepare('SELECT * FROM document_versions WHERE document_id=? AND revision=?')
      .get(id, revision);
  }
  read({ id, revision } = {}) {
    const source = this.source(id);
    const status = this.db.prepare('SELECT * FROM document_status WHERE document_id=?').get(id);
    const version = this.version(id, revision || status?.revision || '');
    if (version?.payload)
      this.db
        .prepare('UPDATE document_versions SET accessed_at=? WHERE document_id=? AND revision=?')
        .run(new Date().toISOString(), id, version.revision);
    return {
      source,
      status: status || null,
      version: version
        ? {
            ...JSON.parse(version.metadata),
            revision: version.revision,
            fetchedAt: version.fetched_at,
          }
        : null,
      article: version?.payload ? JSON.parse(version.payload) : null,
    };
  }
  async fetch({ id } = {}) {
    const source = this.source(id);
    ensure(!this.jobs.has(id), 'This article is already being retrieved.');
    ensure(this.jobs.size < 2, 'Two articles are already being retrieved. Wait or cancel one.');
    const controller = new AbortController();
    this.jobs.set(id, controller);
    try {
      this.db
        .prepare(
          "INSERT INTO document_status(document_id,status) VALUES(?,'loading') ON CONFLICT(document_id) DO UPDATE SET status='loading',error=NULL",
        )
        .run(id);
      const response = await this.fetcher(source.url, { signal: controller.signal });
      controller.signal.throwIfAborted();
      this.save(source, response);
      return this.read({ id });
    } catch (error) {
      if (this.closed) throw new Error('Reader closed during retrieval.');
      const message = controller.signal.aborted
        ? 'Retrieval cancelled. Your cached article is unchanged.'
        : error.code
          ? 'Unable to retrieve or save this article. Check your connection and disk space, then retry.'
          : error.message;
      this.db
        .prepare('UPDATE document_status SET status=?,error=?,checked_at=? WHERE document_id=?')
        .run(
          controller.signal.aborted ? 'cancelled' : 'failed',
          message,
          new Date().toISOString(),
          id,
        );
      throw new Error(message);
    } finally {
      this.jobs.delete(id);
    }
  }
  cancel({ id } = {}) {
    this.source(id);
    this.jobs.get(id)?.abort();
    return true;
  }
  close() {
    this.closed = true;
    for (const job of this.jobs.values()) job.abort();
  }
  save(source, response) {
    const article = extractArticle(response.html, source);
    for (const s of article.sections) s.text = normalize(s.text);
    const payload = json(article);
    const bytes = Buffer.byteLength(payload);
    ensure(bytes <= this.budget, 'Article exceeds the cache budget.');
    const now = new Date().toISOString();
    const metadata = {
      ...source,
      sourceUrl: article.sourceUrl,
      sourceUpdated: article.sourceUpdated,
      extractionVersion: article.extractionVersion,
      finalUrl: response.finalUrl || source.url,
      redirects: response.redirects || [],
      etag: response.etag || null,
      lastModified: response.lastModified || null,
    };
    this.store.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO document_versions VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(document_id,revision) DO UPDATE SET payload=excluded.payload,bytes=excluded.bytes,accessed_at=excluded.accessed_at,fetched_at=excluded.fetched_at,metadata=excluded.metadata`,
        )
        .run(source.id, article.revision, payload, json(metadata), bytes, now, now, now);
      this.db
        .prepare(
          `INSERT INTO document_status(document_id,status,revision,checked_at) VALUES(?,'ready',?,?) ON CONFLICT(document_id) DO UPDATE SET status='ready',revision=excluded.revision,checked_at=excluded.checked_at,error=NULL`,
        )
        .run(source.id, article.revision, now);
      this.db.prepare('DELETE FROM document_search WHERE document_id=?').run(source.id);
      for (const s of article.sections)
        this.db
          .prepare(
            'INSERT INTO document_search(document_id,revision,section_id,title,body) VALUES(?,?,?,?,?)',
          )
          .run(source.id, article.revision, s.id, `${article.title} — ${s.title}`, s.text);
      for (const row of this.db
        .prepare('SELECT * FROM document_annotations WHERE document_id=?')
        .all(source.id)) {
        const a = JSON.parse(row.data);
        const section = article.sections.find((s) => s.id === a.sectionId);
        let attached = false;
        if (a.kind === 'bookmark')
          attached =
            !!section &&
            (a.originalRevision === article.revision || hash(section.text) === a.sectionHash);
        else if (section) {
          const positions = [];
          let pos = -1;
          while ((pos = section.text.indexOf(a.quote, pos + 1)) !== -1) {
            if (
              section.text.slice(Math.max(0, pos - a.prefix.length), pos) === a.prefix &&
              section.text.slice(pos + a.quote.length, pos + a.quote.length + a.suffix.length) ===
                a.suffix
            )
              positions.push(pos);
          }
          if (positions.length === 1) {
            attached = true;
            a.start = positions[0];
            a.end = a.start + a.quote.length;
          }
        }
        a.status = attached ? 'attached' : 'stale';
        if (attached) a.currentRevision = article.revision;
        this.db.prepare('UPDATE document_annotations SET data=? WHERE id=?').run(json(a), a.id);
      }
      this.evict(source.id, article.revision);
    });
  }
  search({ query = '', domainId = '', objectiveId = '', skillId = '' } = {}) {
    text(query, 300, 'search query');
    const terms = query.match(/[\p{L}\p{N}]+/gu)?.slice(0, 20) || [];
    if (!terms.length) return [];
    const allowed = documents
      .filter(
        (d) =>
          (!domainId || d.domainId === domainId) &&
          (!objectiveId || d.objectiveId === objectiveId) &&
          (!skillId || d.skillIds.includes(skillId)),
      )
      .map((d) => d.id);
    if (!allowed.length) return [];
    return this.db
      .prepare(
        `SELECT document_id AS documentId, revision, section_id AS sectionId, title, snippet(document_search,4,'','',' … ',24) AS excerpt FROM document_search WHERE document_search MATCH ? AND document_id IN (${allowed.map(() => '?').join(',')}) ORDER BY bm25(document_search,0,0,0,4,1) LIMIT 50`,
      )
      .all(terms.map((t) => `"${t}"*`).join(' AND '), ...allowed);
  }
  resolve({ url = '', skillId = '', objectiveId = '' } = {}) {
    const exact = documents.find((d) => d.url === url.split('#')[0]);
    const mapping = sectionMappings[skillId];
    const source =
      exact ||
      (mapping && documents.find((d) => d.id === mapping[0])) ||
      documents.find((d) => d.skillIds.includes(skillId));
    if (!source)
      return {
        objectiveId,
        notice: 'Showing the objective library; this reference has no exact reader mapping.',
      };
    const anchor =
      exact && url.includes('#')
        ? decodeURIComponent(url.split('#')[1])
        : mapping?.[0] === source.id
          ? mapping[1]
          : null;
    return {
      id: source.id,
      sectionId: anchor ? `${source.id}:${anchor}` : null,
      notice: anchor ? '' : 'Opening the related article; no exact section is mapped.',
    };
  }
  annotations() {
    return this.db
      .prepare('SELECT data FROM document_annotations ORDER BY created_at DESC')
      .all()
      .map((r) => {
        const a = JSON.parse(r.data);
        return { ...a, available: !!this.version(a.documentId, a.currentRevision)?.payload };
      });
  }
  annotate({
    id,
    kind = 'highlight',
    documentId,
    revision,
    sectionId,
    quote = '',
    note = '',
  } = {}) {
    ensure(['highlight', 'bookmark'].includes(kind), 'Invalid annotation type.');
    text(note, 4000, 'annotation note');
    text(quote, 8000, 'highlight quote');
    const { article } = this.read({ id: documentId, revision });
    ensure(article, 'Retrieve this revision before annotating it.');
    const section = article.sections.find((s) => s.id === sectionId);
    ensure(section, 'Unknown article section.');
    quote = normalize(quote);
    const start = section.text.indexOf(quote);
    if (kind === 'highlight')
      ensure(
        quote.length >= 2 && start >= 0 && section.text.indexOf(quote, start + 1) < 0,
        'Select a unique passage within one section (at least two characters).',
      );
    const previous =
      id && this.db.prepare('SELECT data FROM document_annotations WHERE id=?').get(id);
    if (id) ensure(previous, 'Unknown annotation.');
    const annotation = {
      id: id || randomUUID(),
      kind,
      documentId,
      sectionId,
      title: section.title,
      originalRevision: article.revision,
      currentRevision: article.revision,
      quote: kind === 'highlight' ? quote : '',
      sectionHash: kind === 'bookmark' ? hash(section.text) : undefined,
      prefix: section.text.slice(Math.max(0, start - 40), start),
      suffix: section.text.slice(start + quote.length, start + quote.length + 40),
      start,
      end: start + quote.length,
      note,
      status: 'attached',
      repairedFrom: previous ? JSON.parse(previous.data) : undefined,
    };
    // Keep only the previous original annotation when repairing repeatedly.
    if (annotation.repairedFrom) delete annotation.repairedFrom.repairedFrom;
    this.db
      .prepare(
        'INSERT INTO document_annotations VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET document_id=excluded.document_id,data=excluded.data',
      )
      .run(annotation.id, documentId, json(annotation), new Date().toISOString());
    return annotation;
  }
  note({ id, note } = {}) {
    text(note, 4000, 'annotation note');
    const row = this.db.prepare('SELECT data FROM document_annotations WHERE id=?').get(id);
    ensure(row, 'Unknown annotation.');
    const a = { ...JSON.parse(row.data), note };
    this.db.prepare('UPDATE document_annotations SET data=? WHERE id=?').run(json(a), id);
    return a;
  }
  removeAnnotation({ id } = {}) {
    text(id, 100, 'annotation ID');
    this.db.prepare('DELETE FROM document_annotations WHERE id=?').run(id);
    return true;
  }
  picker({ query = '' } = {}) {
    text(query, 200, 'reference query');
    const q = query.toLowerCase();
    const options = [];
    for (const d of domains)
      options.push({
        key: `domain:${d.id}`,
        kind: 'domain',
        title: d.title,
        reference: { kind: 'domain', id: d.id },
      });
    for (const d of documents) {
      const status = this.db
        .prepare('SELECT revision FROM document_status WHERE document_id=?')
        .get(d.id);
      const version = status?.revision && this.version(d.id, status.revision);
      if (!version?.payload) continue;
      const article = JSON.parse(version.payload);
      options.push({
        key: d.id,
        kind: 'document',
        title: article.title,
        reference: { kind: 'document', documentId: d.id, revision: article.revision },
      });
      for (const section of article.sections)
        options.push({
          key: section.id,
          kind: 'heading',
          title: `${article.title} — ${section.title}`,
          reference: {
            kind: 'section',
            documentId: d.id,
            revision: article.revision,
            sectionId: section.id,
          },
        });
    }
    for (const a of this.annotations().filter((a) => a.kind === 'highlight'))
      options.push({
        key: a.id,
        kind: 'highlight',
        title: `${a.title} — ${a.quote.slice(0, 100)}`,
        reference: { kind: 'highlight', id: a.id },
      });
    return options.filter((o) => o.title.toLowerCase().includes(q)).slice(0, 100);
  }
  reference(input = {}) {
    const { kind, id, documentId, revision, sectionId, quote } = input;
    if (kind === 'domain') {
      const d = domains.find((d) => d.id === id);
      ensure(d, 'Unknown domain.');
      return { kind, id, title: d.title, blueprintVersion: blueprint.version };
    }
    if (kind === 'highlight') {
      const a = this.annotations().find((a) => a.id === id);
      ensure(a, 'Unknown highlight.');
      return {
        kind,
        id,
        documentId: a.documentId,
        revision: a.originalRevision,
        sectionId: a.sectionId,
        title: a.title,
        excerpt: a.quote,
        url: this.source(a.documentId).url,
      };
    }
    ensure(['document', 'section', 'selection'].includes(kind), 'Invalid reference type.');
    const { source, article } = this.read({ id: documentId, revision });
    ensure(
      article && article.revision === revision,
      'Retrieve this article before adding a reference.',
    );
    const section = article.sections.find((s) => s.id === sectionId);
    if (kind !== 'document') ensure(section, 'Unknown section reference.');
    if (kind === 'selection')
      ensure(
        typeof quote === 'string' &&
          quote.length <= 8000 &&
          normalize(quote).length > 1 &&
          section.text.includes(normalize(quote)),
        'Selection is not in this section.',
      );
    return {
      kind,
      documentId,
      revision,
      sectionId: section?.id || null,
      title: section?.title || article.title,
      url: source.url,
      excerpt:
        kind === 'selection'
          ? normalize(quote)
          : (section?.text || article.sections.map((s) => s.text).join('\n')).slice(0, 8000),
    };
  }
  referenceStatus(ref) {
    if (ref.kind === 'domain')
      return ref.blueprintVersion === blueprint.version ? 'available' : 'stale';
    const row = this.version(ref.documentId, ref.revision);
    if (!row?.payload) return 'unavailable';
    const latest = this.db
      .prepare('SELECT revision FROM document_status WHERE document_id=?')
      .get(ref.documentId);
    return latest?.revision === ref.revision ? 'available' : 'stale';
  }
  drafts() {
    return this.db
      .prepare('SELECT * FROM document_drafts ORDER BY updated_at DESC')
      .all()
      .map((r) => ({
        ...JSON.parse(r.data),
        updatedAt: r.updated_at,
        references: JSON.parse(r.data).references.map((ref) => ({
          ...ref,
          status: this.referenceStatus(ref),
        })),
      }));
  }
  saveDraft({ id, title = '', body = '' } = {}) {
    text(title, 200, 'draft title');
    text(body, 20000, 'draft text');
    const row = id && this.db.prepare('SELECT data FROM document_drafts WHERE id=?').get(id);
    if (id) ensure(row, 'Unknown draft.');
    const draft = row ? JSON.parse(row.data) : { id: randomUUID(), references: [] };
    draft.title = title;
    draft.body = body;
    this.db
      .prepare(
        'INSERT INTO document_drafts VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at',
      )
      .run(draft.id, json(draft), new Date().toISOString());
    return draft;
  }
  draftReference({ id, reference, removeIndex } = {}) {
    const row = this.db.prepare('SELECT data FROM document_drafts WHERE id=?').get(id);
    ensure(row, 'Save a draft first.');
    const draft = JSON.parse(row.data);
    if (removeIndex !== undefined) {
      ensure(
        Number.isInteger(removeIndex) && removeIndex >= 0 && removeIndex < draft.references.length,
        'Invalid reference index.',
      );
      draft.references.splice(removeIndex, 1);
    } else {
      ensure(draft.references.length < 20, 'A draft can contain up to 20 references.');
      const next = this.reference(reference);
      if (!draft.references.some((r) => json(r) === json(next))) draft.references.push(next);
    }
    this.db
      .prepare('UPDATE document_drafts SET data=?,updated_at=? WHERE id=?')
      .run(json(draft), new Date().toISOString(), id);
    return draft;
  }
  removeDraft({ id } = {}) {
    text(id, 100, 'draft ID');
    this.db.prepare('DELETE FROM document_drafts WHERE id=?').run(id);
    return true;
  }
  cacheInfo() {
    return {
      budget: this.budget,
      bytes: this.db.prepare('SELECT coalesce(sum(bytes),0) AS bytes FROM document_versions').get()
        .bytes,
      entries: this.db
        .prepare(
          'SELECT document_id AS documentId,revision,bytes,fetched_at AS fetchedAt,accessed_at AS accessedAt FROM document_versions WHERE payload IS NOT NULL ORDER BY accessed_at DESC',
        )
        .all(),
    };
  }
  evict(keepId, keepRevision) {
    let total = this.cacheInfo().bytes;
    for (const row of this.db
      .prepare(
        'SELECT document_id,revision,bytes FROM document_versions WHERE payload IS NOT NULL ORDER BY accessed_at,created_at',
      )
      .all()) {
      if (total <= this.budget) break;
      if (row.document_id === keepId && row.revision === keepRevision) continue;
      this.clearVersion(row.document_id, row.revision);
      total -= row.bytes;
    }
  }
  clearVersion(id, revision) {
    this.db
      .prepare(
        'UPDATE document_versions SET payload=NULL,bytes=0 WHERE document_id=? AND revision=?',
      )
      .run(id, revision);
    this.db
      .prepare('DELETE FROM document_search WHERE document_id=? AND revision=?')
      .run(id, revision);
  }
  clear({ confirmed, id } = {}) {
    ensure(confirmed === true, 'Confirm cache clearing first.');
    if (id) this.source(id);
    ensure(!this.jobs.size, 'Wait for retrieval to finish or cancel it before clearing the cache.');
    this.store.transaction(() => {
      for (const row of this.cacheInfo().entries)
        if (!id || row.documentId === id) this.clearVersion(row.documentId, row.revision);
    });
    return this.cacheInfo();
  }
}
