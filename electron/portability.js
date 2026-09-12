import { randomUUID, createHash } from 'node:crypto';
import { statSync, chmodSync } from 'node:fs';
import { ensure, validateBank, validateSelection } from './validation.js';
import { validateLabs } from '../content/lab-contract.js';
import { documents } from '../content/documents.js';
import { schemaVersion, migrate } from './migrations.js';
import { DatabaseSync } from 'node:sqlite';

export const exportVersion = 1;
export const limits = Object.freeze({
  bytes: 256 * 1024 * 1024,
  records: 250000,
  recordBytes: 2 * 1024 * 1024,
  depth: 32,
});
const keys = {
  settings: ['key'],
  sessions: ['id'],
  session_items: ['session_id', 'position'],
  exposures: ['family_id'],
  issues: ['id'],
  issue_events: ['id'],
  document_annotations: ['id'],
  document_drafts: ['id'],
  lab_attempts: ['id'],
  tutor_conversations: ['id'],
  portable_messages: ['id'],
  portable_questions: ['id'],
};
const jsonFields = new Set([
  'value',
  'snapshot',
  'selected',
  'config',
  'clock',
  'reason',
  'data',
  'progress',
  'evidence',
  'cleanup',
  'reflection',
]);
const blankEvidence = { checklist: [], notes: '', output: '', problemKind: 'none' };
const blankReflection = { answer: '', assessment: 'unanswered', savedAt: null, comparedAt: null };
const canonical = (v) =>
  JSON.stringify(v, (_k, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, value[k]]),
        )
      : value,
  );
const identity = (table, row) => canonical(keys[table].map((k) => row[k]));
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const secretFields =
  /^(apiKey|api_key|authorization|access_token|refresh_token|provider_id|provider_request_id|providerId|providerRequestId|attachments|attachmentPaths|__proto__|prototype|constructor)$/i;
function bounded(value, depth = 0) {
  ensure(depth <= limits.depth, 'Import nesting is too deep.');
  if (Array.isArray(value)) {
    ensure(value.length <= limits.records, 'Import array is too large.');
    value.forEach((v) => bounded(v, depth + 1));
  } else if (plain(value)) {
    for (const [key, v] of Object.entries(value)) {
      ensure(
        !secretFields.test(key),
        'Credentials, provider identifiers, attachments and unsafe object fields are not supported.',
      );
      bounded(v, depth + 1);
    }
  } else
    ensure(
      value === null || ['string', 'number', 'boolean'].includes(typeof value),
      'Invalid import value.',
    );
}
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (plain(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !secretFields.test(k))
        .map(([k, v]) => [k, scrub(v)]),
    );
  return value;
}
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
function normalized(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      jsonFields.has(k) && typeof v === 'string'
        ? (() => {
            try {
              return parse(v);
            } catch {
              return v;
            }
          })()
        : v,
    ]),
  );
}
export class Portability {
  constructor(
    store,
    { filename, appVersion = '0.6.0', runtime = {}, diagnosticErrors = () => [] } = {},
  ) {
    this.store = store;
    this.db = store.db;
    this.filename = filename;
    this.appVersion = appVersion;
    this.runtime = runtime;
    this.diagnosticErrors = diagnosticErrors;
  }
  backup(destination) {
    ensure(
      typeof destination === 'string' && destination !== this.filename,
      'Choose a new backup file.',
    );
    this.db.prepare('VACUUM INTO ?').run(destination);
    if (process.platform !== 'win32') chmodSync(destination, 0o600);
    return true;
  }
  recoveryBackup() {
    if (!this.filename || this.filename === ':memory:') return null;
    const path = `${this.filename}.recovery.${randomUUID()}.backup`;
    this.backup(path);
    return path;
  }
  export({ chats = false, labEvidence = false } = {}) {
    ensure(
      typeof chats === 'boolean' && typeof labEvidence === 'boolean',
      'Invalid export options.',
    );
    const records = Object.fromEntries(Object.keys(keys).map((table) => [table, []]));
    for (const table of Object.keys(keys)) {
      if (['portable_questions', 'portable_messages', 'settings'].includes(table)) continue;
      if (table === 'tutor_conversations' && !chats) continue;
      records[table] = this.db
        .prepare(`SELECT * FROM ${table}`)
        .all()
        .map((row) => {
          const out = { ...row };
          for (const k of Object.keys(out))
            if (jsonFields.has(k) && typeof out[k] === 'string') {
              try {
                out[k] = JSON.stringify(scrub(JSON.parse(out[k])));
              } catch {
                /* Non-JSON selection reasons are plain text. */
              }
            }
          if (table === 'lab_attempts' && !labEvidence) {
            const e = JSON.parse(out.evidence),
              c = JSON.parse(out.cleanup);
            out.evidence = JSON.stringify({ ...blankEvidence, checklist: e.checklist });
            out.reflection = JSON.stringify({ ...JSON.parse(out.reflection), answer: '' });
            out.cleanup = JSON.stringify({
              ...c,
              note: '',
              history: c.history.map((h) => ({ ...h, note: '' })),
            });
          }
          if (table === 'tutor_conversations' && !labEvidence) {
            const c = JSON.parse(out.data);
            c.labEvidence = {};
            out.data = JSON.stringify(c);
          }
          return out;
        });
    }
    records.settings = this.db.prepare("SELECT * FROM settings WHERE key='includeGenerated'").all();
    records.portable_questions = this.db
      .prepare('SELECT data FROM generated_questions UNION ALL SELECT data FROM portable_questions')
      .all()
      .map(({ data }) => {
        const q = scrub(JSON.parse(data));
        return { id: q.id, data: JSON.stringify(q) };
      });
    if (chats) records.portable_messages = this.messages(labEvidence);
    const bundle = {
      format: 'az104-study-desk',
      version: exportVersion,
      databaseVersion: schemaVersion,
      appVersion: this.appVersion,
      options: { chats, labEvidence },
      records,
    };
    const rows = Object.values(records).flat();
    ensure(
      rows.length <= limits.records &&
        rows.every((r) => Buffer.byteLength(JSON.stringify(r)) <= limits.recordBytes) &&
        Buffer.byteLength(JSON.stringify(bundle)) <= limits.bytes,
      'This profile exceeds portable export limits. Save a recovery backup instead.',
    );
    return bundle;
  }
  messages(labEvidence = false) {
    const messages = this.db
      .prepare('SELECT * FROM portable_messages')
      .all()
      .map((r) => ({ ...r }));
    for (const r of this.db
      .prepare(
        'SELECT id,conversation_id,status,model,text,context,created_at FROM ai_requests WHERE conversation_id IS NOT NULL',
      )
      .all()) {
      const context = scrub(JSON.parse(r.context));
      if (!labEvidence && context.lab) {
        // Sent lab text can quote personal evidence; keep only metadata unless explicitly included.
        context.lab = { title: context.lab.title, attemptId: context.lab.attemptId };
      }
      messages.push({
        id: r.id,
        conversation_id: r.conversation_id,
        data: JSON.stringify({
          id: r.id,
          status: 'historical',
          model: r.model,
          text: r.text,
          context,
          created_at: r.created_at,
          originalStatus: r.status,
          cost: 0,
          reserved: 0,
          input_tokens: null,
          output_tokens: null,
          error: null,
        }),
      });
    }
    return messages;
  }
  validate(bundle) {
    ensure(
      plain(bundle) &&
        bundle.format === 'az104-study-desk' &&
        bundle.version === exportVersion &&
        bundle.databaseVersion === schemaVersion,
      'Unsupported export format or schema version. Use a compatible Study Desk release.',
    );
    ensure(
      Object.keys(bundle).every((k) =>
        ['format', 'version', 'databaseVersion', 'appVersion', 'options', 'records'].includes(k),
      ),
      'Unknown export field.',
    );
    ensure(Buffer.byteLength(JSON.stringify(bundle)) <= limits.bytes, 'Import exceeds 256 MiB.');
    bounded(bundle);
    ensure(
      plain(bundle.options) &&
        typeof bundle.options.chats === 'boolean' &&
        typeof bundle.options.labEvidence === 'boolean',
      'Invalid export options.',
    );
    ensure(
      plain(bundle.records) &&
        Object.keys(bundle.records).length === Object.keys(keys).length &&
        Object.keys(bundle.records).every((t) => keys[t]),
      'Unsupported import tables.',
    );
    let total = 0;
    for (const [table, rows] of Object.entries(bundle.records)) {
      ensure(Array.isArray(rows), 'Invalid import records.');
      total += rows.length;
      ensure(total <= limits.records, 'Import exceeds 250,000 records.');
      const columns = this.db.prepare(`PRAGMA table_info(${table})`).all();
      const ids = new Set();
      for (const row of rows) {
        ensure(
          plain(row) &&
            Object.keys(row).length === columns.length &&
            columns.every((c) => Object.hasOwn(row, c.name)),
          `Invalid ${table} columns.`,
        );
        ensure(
          Buffer.byteLength(JSON.stringify(row)) <= limits.recordBytes,
          'An import record exceeds 2 MiB.',
        );
        for (const c of columns) {
          const v = row[c.name];
          ensure(
            v === null
              ? !c.notnull && !c.pk
              : c.type === 'INTEGER'
                ? Number.isSafeInteger(v)
                : c.type === 'REAL'
                  ? Number.isFinite(v)
                  : typeof v === 'string',
            `Invalid ${table} field type.`,
          );
          if (v !== null && jsonFields.has(c.name)) {
            if (c.name === 'reason') {
              try {
                bounded(JSON.parse(v));
              } catch {
                /* Plain selection reason. */
              }
            } else bounded(JSON.parse(v));
          }
        }
        for (const key of keys[table])
          ensure(
            typeof row[key] === 'number' || (row[key].length > 0 && row[key].length <= 200),
            'Invalid record identity.',
          );
        const id = identity(table, row);
        ensure(!ids.has(id), 'Duplicate import identity.');
        ids.add(id);
        this.validateRow(table, row);
      }
    }
    const records = bundle.records;
    const indexes = Object.fromEntries(
      Object.keys(keys).map((t) => [t, new Set(records[t].map((r) => r.id))]),
    );
    const has = (table, _field, value) => indexes[table].has(value);
    const sessionItems = new Map();
    for (const i of records.session_items) {
      if (!sessionItems.has(i.session_id)) sessionItems.set(i.session_id, []);
      sessionItems.get(i.session_id).push(i);
    }
    // Exports are self-contained: never resolve missing references against unrelated local records.
    for (const row of records.session_items)
      ensure(has('sessions', 'id', row.session_id), 'Missing session reference.');
    for (const row of records.issue_events)
      ensure(has('issues', 'id', row.issue_id), 'Missing issue reference.');
    for (const row of records.portable_messages)
      ensure(
        has('tutor_conversations', 'id', row.conversation_id),
        'Missing conversation reference.',
      );
    for (const row of records.tutor_conversations) {
      const c = JSON.parse(row.data);
      if (c.quiz)
        ensure(
          records.session_items.some(
            (i) => i.session_id === c.quiz.sessionId && i.question_id === c.quiz.questionId,
          ),
          'Missing conversation quiz reference.',
        );
      if (c.labAttemptId)
        ensure(has('lab_attempts', 'id', c.labAttemptId), 'Missing conversation lab reference.');
    }
    for (const s of records.sessions) {
      const items = (sessionItems.get(s.id) || []).sort((a, b) => a.position - b.position);
      ensure(
        items.length > 0 && items.length <= 50 && items.every((r, i) => r.position === i),
        'Invalid session item positions.',
      );
      ensure(
        new Set(items.map((i) => i.question_id)).size === items.length,
        'Duplicate question in session.',
      );
      ensure(s.cursor >= 0 && s.cursor < items.length, 'Invalid session cursor.');
    }
    ensure(
      records.sessions.filter((r) => !r.completed_at).length <= 1,
      'Multiple active sessions cannot be imported.',
    );
    ensure(
      bundle.options.chats ||
        (!records.tutor_conversations.length && !records.portable_messages.length),
      'Unexpected chat content.',
    );
    // Enforce SQLite CHECK, UNIQUE and foreign-key constraints in a disposable database before preview.
    const staging = new DatabaseSync(':memory:');
    try {
      staging.exec('PRAGMA foreign_keys=ON');
      migrate(staging, ':memory:');
      staging.exec('BEGIN');
      for (const table of Object.keys(keys)) {
        const rows = records[table];
        if (!rows.length) continue;
        const cols = Object.keys(rows[0]);
        const insert = staging.prepare(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        );
        for (const row of rows) insert.run(...cols.map((c) => row[c]));
      }
      staging.exec('COMMIT');
    } catch {
      throw new Error('Import violates database integrity constraints. No data was changed.');
    } finally {
      staging.close();
    }
    return bundle;
  }
  validateRow(table, row) {
    if (table === 'settings')
      ensure(
        row.key === 'includeGenerated' && typeof JSON.parse(row.value) === 'boolean',
        'Only local practice preferences may be imported.',
      );
    if (table === 'portable_questions') {
      const q = JSON.parse(row.data);
      validateBank([q]);
      ensure(q.id === row.id, 'Question identity mismatch.');
    }
    if (table === 'session_items') {
      const q = JSON.parse(row.snapshot);
      validateBank([q]);
      validateSelection(q, JSON.parse(row.selected), true);
      ensure(
        q.id === row.question_id && [null, 0, 1].includes(row.correct) && row.position >= 0,
        'Invalid question snapshot.',
      );
    }
    if (table === 'sessions')
      ensure(
        ['study', 'adaptive', 'exam'].includes(row.mode) && plain(JSON.parse(row.config)),
        'Invalid session settings.',
      );
    if (table === 'lab_attempts') {
      const l = JSON.parse(row.snapshot);
      validateLabs([l]);
      const e = JSON.parse(row.evidence),
        p = JSON.parse(row.progress),
        c = JSON.parse(row.cleanup),
        r = JSON.parse(row.reflection);
      ensure(
        l.id === row.lab_id && ['portal', 'cli'].includes(row.method),
        'Invalid lab snapshot.',
      );
      ensure(
        plain(e) &&
          Array.isArray(e.checklist) &&
          typeof e.notes === 'string' &&
          typeof e.output === 'string' &&
          ['none', 'environment', 'conceptual'].includes(e.problemKind),
        'Invalid lab evidence.',
      );
      ensure(
        plain(p) &&
          Number.isInteger(p.step) &&
          Number.isInteger(p.hintsRevealed) &&
          Array.isArray(p.hintRevealedAt) &&
          ['goal', 'walkthrough', 'cleanup'].includes(p.pane) &&
          p.step >= 0 &&
          p.hintsRevealed >= 0,
        'Invalid lab progress.',
      );
      ensure(
        plain(c) &&
          ['pending', 'completed'].includes(c.status) &&
          typeof c.note === 'string' &&
          Array.isArray(c.history),
        'Invalid cleanup record.',
      );
      ensure(
        plain(r) &&
          typeof r.answer === 'string' &&
          ['unanswered', 'needs_review', 'understood'].includes(r.assessment),
        'Invalid reflection.',
      );
    }
    if (
      [
        'document_annotations',
        'document_drafts',
        'tutor_conversations',
        'portable_messages',
      ].includes(table)
    ) {
      const d = JSON.parse(row.data);
      ensure(plain(d) && d.id === row.id, 'Invalid content identity.');
      if (table === 'document_drafts' || table === 'tutor_conversations')
        ensure(
          typeof d.body === 'string' && typeof d.title === 'string' && Array.isArray(d.references),
          'Invalid draft or conversation.',
        );
      if (table === 'document_annotations') {
        ensure(
          row.document_id === d.documentId && documents.some((s) => s.id === d.documentId),
          'Invalid annotation document.',
        );
        ensure(
          ['highlight', 'bookmark'].includes(d.kind) &&
            [
              'sectionId',
              'title',
              'quote',
              'note',
              'prefix',
              'suffix',
              'originalRevision',
              'currentRevision',
            ].every((k) => typeof d[k] === 'string'),
          'Invalid annotation shape.',
        );
        ensure(
          Number.isInteger(d.start) && Number.isInteger(d.end) && d.start >= 0 && d.end >= d.start,
          'Invalid annotation range.',
        );
      }
      if (table === 'document_drafts' || table === 'tutor_conversations') {
        ensure(
          d.references.length <= 20 &&
            d.references.every((r) => plain(r) && typeof r.kind === 'string'),
          'Invalid retained references.',
        );
      }
      if (table === 'portable_messages')
        ensure(
          d.status === 'historical' &&
            typeof d.text === 'string' &&
            plain(d.context) &&
            Array.isArray(d.context.sources || []) &&
            (d.context.sources || []).every(
              (s) =>
                plain(s) &&
                typeof s.citation === 'string' &&
                typeof s.title === 'string' &&
                typeof s.excerpt === 'string',
            ),
          'Invalid historical message.',
        );
    }
  }
  preview(bundle) {
    this.validate(bundle);
    const conflicts = [],
      counts = {};
    const historical = new Map(
      bundle.records.portable_messages.length
        ? this.messages(bundle.options.labEvidence).map((r) => [r.id, r])
        : [],
    );
    for (const [table, rows] of Object.entries(bundle.records)) {
      const local = new Map(
        this.db
          .prepare(`SELECT * FROM ${table}`)
          .all()
          .map((r) => [identity(table, r), r]),
      );
      counts[table] = { add: 0, skip: 0 };
      for (const row of rows) {
        let existing = local.get(identity(table, row));
        if (table === 'portable_questions') {
          const q = this.store.bank.find((q) => q.id === row.id);
          if (q) existing = { id: q.id, data: JSON.stringify(q) };
        }
        if (table === 'portable_messages') {
          const r = historical.get(row.id);
          if (r) existing = r;
        }
        if (existing) {
          if (canonical(normalized(existing)) !== canonical(normalized(row)))
            conflicts.push({ table, id: identity(table, row) });
          else counts[table].skip++;
        } else counts[table].add++;
      }
    }
    const active = this.db.prepare('SELECT id FROM sessions WHERE completed_at IS NULL').get();
    if (active && bundle.records.sessions.some((s) => !s.completed_at && s.id !== active.id))
      conflicts.push({
        table: 'sessions',
        id: 'Another quiz is active. Finish it before importing.',
      });
    return {
      counts,
      conflicts: conflicts.slice(0, 100),
      conflictCount: conflicts.length,
      canApply: !conflicts.length,
      policy:
        'Add new records; skip identical records; block differing identities. AI and automation remain disabled.',
      digest: createHash('sha256').update(canonical(bundle)).digest('hex'),
    };
  }
  apply(bundle) {
    const preview = this.preview(bundle);
    ensure(
      preview.canApply,
      'Import conflicts must be resolved before applying. No data was changed.',
    );
    this.recoveryBackup();
    this.store.transaction(() => {
      for (const [table, fields] of Object.entries(keys)) {
        const rows = bundle.records[table];
        for (const row of rows) {
          if (table === 'portable_questions' && this.store.bank.some((q) => q.id === row.id))
            continue;
          if (
            table === 'portable_messages' &&
            this.db.prepare('SELECT id FROM ai_requests WHERE id=?').get(row.id)
          )
            continue;
          const where = fields.map((f) => `${f}=?`).join(' AND ');
          if (
            this.db
              .prepare(`SELECT 1 FROM ${table} WHERE ${where}`)
              .get(...fields.map((f) => row[f]))
          )
            continue;
          const columns = Object.keys(row);
          this.db
            .prepare(
              `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
            )
            .run(...columns.map((c) => row[c]));
        }
      }
    });
    this.store.refreshBank();
    return preview;
  }
  erase({ kind, id, confirmed } = {}) {
    ensure(
      confirmed === true && ['labEvidence', 'study'].includes(kind),
      'Confirm the deletion scope.',
    );
    if (kind === 'labEvidence')
      ensure(
        typeof id === 'string' && this.db.prepare('SELECT id FROM lab_attempts WHERE id=?').get(id),
        'Choose an existing lab attempt.',
      );
    this.recoveryBackup();
    this.store.transaction(() => {
      if (kind === 'labEvidence') {
        const row = this.db.prepare('SELECT evidence,cleanup FROM lab_attempts WHERE id=?').get(id);
        const c = JSON.parse(row.cleanup);
        this.db
          .prepare('UPDATE lab_attempts SET evidence=?,reflection=?,cleanup=? WHERE id=?')
          .run(
            JSON.stringify({ ...blankEvidence, checklist: JSON.parse(row.evidence).checklist }),
            JSON.stringify(blankReflection),
            JSON.stringify({ ...c, note: '', history: c.history.map((h) => ({ ...h, note: '' })) }),
            id,
          );
      } else {
        // Paid reservations survive reset, but personal request payloads do not.
        this.db.exec(
          "UPDATE ai_requests SET conversation_id=NULL,job_id=NULL,payload='{}',context='{}',text='',error=NULL,provider_id=NULL,provider_request_id=NULL;",
        );
        // Preserve holds as reservations before deleting their foreign-key parents.
        for (const hold of this.db.prepare('SELECT * FROM generation_holds').all()) {
          this.db
            .prepare(
              `INSERT INTO ai_requests(id,day,status,model,reserved,payload,context,created_at,pricing_version,prompt_version)
            VALUES(?,?,'interrupted','retained-reservation',?,'{}','{}',?,'retained','retained')`,
            )
            .run(
              randomUUID(),
              new Date().toISOString().slice(0, 10),
              hold.amount,
              new Date().toISOString(),
            );
        }
        for (const t of [
          'generation_holds',
          'generation_triggers',
          'generated_questions',
          'generation_candidates',
          'generation_events',
          'generation_jobs',
          'portable_messages',
          'tutor_previews',
          'tutor_conversations',
          'issue_events',
          'issues',
          'session_items',
          'sessions',
          'exposures',
          'document_annotations',
          'document_drafts',
          'lab_attempts',
          'portable_questions',
        ])
          this.db.exec(`DELETE FROM ${t}`);
      }
    });
    this.store.refreshBank();
    return true;
  }
  diagnostics() {
    const counts = Object.fromEntries(
      Object.keys(keys).map((t) => [t, this.db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n]),
    );
    return {
      appVersion: this.appVersion,
      databaseVersion: schemaVersion,
      exportVersion,
      platform: process.platform,
      architecture: process.arch,
      runtime: this.runtime,
      databaseBytes:
        this.filename && this.filename !== ':memory:' ? statSync(this.filename).size : 0,
      counts,
      errors: this.diagnosticErrors(),
      telemetry: false,
    };
  }
}
