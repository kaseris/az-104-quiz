import { randomUUID } from 'node:crypto';
import { ensure } from './validation.js';
export const schemaVersion = 9;
const migrations = [
  `
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY, started_at TEXT NOT NULL, completed_at TEXT,
        domain_id TEXT NOT NULL, blueprint_version TEXT NOT NULL, cursor INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX one_active_session ON sessions ((1)) WHERE completed_at IS NULL;
      CREATE TABLE session_items (
        session_id TEXT NOT NULL REFERENCES sessions(id), position INTEGER NOT NULL,
        question_id TEXT NOT NULL, snapshot TEXT NOT NULL, selected TEXT NOT NULL DEFAULT '[]',
        submitted_at TEXT, correct INTEGER, duration_ms INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(session_id, position), UNIQUE(session_id, question_id)
      );


`,
  `ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'study';
ALTER TABLE sessions ADD COLUMN scoring_version TEXT NOT NULL DEFAULT 'exact-v1';
ALTER TABLE sessions ADD COLUMN config TEXT NOT NULL DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN deadline INTEGER;
ALTER TABLE sessions ADD COLUMN timing_status TEXT NOT NULL DEFAULT 'untimed';
ALTER TABLE sessions ADD COLUMN clock TEXT;
ALTER TABLE session_items ADD COLUMN confidence TEXT;
ALTER TABLE session_items ADD COLUMN assistance TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE session_items ADD COLUMN prior_exposure INTEGER;
ALTER TABLE session_items ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_items ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_items ADD COLUMN reason TEXT;
CREATE TABLE exposures (family_id TEXT PRIMARY KEY, first_seen TEXT NOT NULL);
CREATE TABLE issues (id TEXT PRIMARY KEY, question_id TEXT NOT NULL, version INTEGER NOT NULL,
 category TEXT NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
 resolution TEXT, replacement_version INTEGER);
CREATE TABLE issue_events (id INTEGER PRIMARY KEY, issue_id TEXT NOT NULL REFERENCES issues(id),
 status TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
`,
  `CREATE TABLE document_status (document_id TEXT PRIMARY KEY, status TEXT NOT NULL, revision TEXT, checked_at TEXT, error TEXT);
CREATE TABLE document_versions (document_id TEXT NOT NULL, revision TEXT NOT NULL, payload TEXT, metadata TEXT NOT NULL, bytes INTEGER NOT NULL, fetched_at TEXT NOT NULL, accessed_at TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(document_id,revision));
CREATE VIRTUAL TABLE document_search USING fts5(document_id UNINDEXED,revision UNINDEXED,section_id UNINDEXED,title,body, tokenize='unicode61 remove_diacritics 2');
CREATE TABLE document_annotations (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE document_drafts (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE tutor_conversations (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE tutor_previews (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE, data TEXT NOT NULL);
CREATE TABLE ai_requests (id TEXT PRIMARY KEY, conversation_id TEXT REFERENCES tutor_conversations(id) ON DELETE SET NULL, day TEXT NOT NULL, status TEXT NOT NULL, model TEXT NOT NULL, reserved REAL NOT NULL, cost REAL, input_tokens INTEGER, output_tokens INTEGER, payload TEXT NOT NULL, context TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', error TEXT, provider_id TEXT, created_at TEXT NOT NULL, pricing_version TEXT NOT NULL, prompt_version TEXT NOT NULL);
CREATE INDEX ai_conversation ON ai_requests(conversation_id,created_at);`,
  `CREATE TABLE generation_jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE generation_events (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES generation_jobs(id), status TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE generation_triggers (session_id TEXT PRIMARY KEY REFERENCES sessions(id), job_id TEXT REFERENCES generation_jobs(id));
CREATE TABLE generation_holds (job_id TEXT PRIMARY KEY REFERENCES generation_jobs(id), amount REAL NOT NULL CHECK(amount>=0));
CREATE TABLE generation_candidates (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES generation_jobs(id), status TEXT NOT NULL, data TEXT NOT NULL, findings TEXT NOT NULL);
CREATE TABLE generated_questions (id TEXT PRIMARY KEY REFERENCES generation_candidates(id), publication_key TEXT NOT NULL UNIQUE, data TEXT NOT NULL);
ALTER TABLE ai_requests ADD COLUMN job_id TEXT REFERENCES generation_jobs(id);
ALTER TABLE ai_requests ADD COLUMN operation TEXT NOT NULL DEFAULT 'tutor';
ALTER TABLE ai_requests ADD COLUMN error_kind TEXT;
ALTER TABLE ai_requests ADD COLUMN retry_after INTEGER;
ALTER TABLE ai_requests ADD COLUMN provider_request_id TEXT;
CREATE INDEX generation_requests ON ai_requests(job_id,created_at);`,
  `CREATE TABLE lab_attempts (
    id TEXT PRIMARY KEY, lab_id TEXT NOT NULL UNIQUE, snapshot TEXT NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('portal','cli')),
    status TEXT NOT NULL CHECK(status IN ('in_progress','paused')),
    progress TEXT NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE lab_attempts_next (
    id TEXT PRIMARY KEY, lab_id TEXT NOT NULL, snapshot TEXT NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('portal','cli')),
    status TEXT NOT NULL CHECK(status IN ('in_progress','paused','awaiting_evidence','completed')),
    progress TEXT NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '{"checklist":[],"notes":"","output":"","problemKind":"none"}',
    cleanup TEXT NOT NULL DEFAULT '{"status":"pending","note":"","updatedAt":null,"history":[]}',
    completed_at TEXT, completion_basis TEXT CHECK(completion_basis IS NULL OR completion_basis='self_reported'),
    request_key TEXT UNIQUE
  );
  INSERT INTO lab_attempts_next(id,lab_id,snapshot,method,status,progress,started_at,updated_at)
    SELECT id,lab_id,snapshot,method,status,progress,started_at,updated_at FROM lab_attempts;
  DROP TABLE lab_attempts;
  ALTER TABLE lab_attempts_next RENAME TO lab_attempts;
  CREATE INDEX lab_attempts_lab ON lab_attempts(lab_id,started_at);`,
  `ALTER TABLE lab_attempts ADD COLUMN reflection TEXT NOT NULL DEFAULT '{"answer":"","assessment":"unanswered","savedAt":null,"comparedAt":null}';`,
  `CREATE TABLE portable_questions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE portable_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE, data TEXT NOT NULL);`,
];
export function migrate(db, filename) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  ensure(
    version <= schemaVersion,
    'This database was created by a newer app. Please update Study Desk.',
  );
  if (version === schemaVersion) return;
  if (version > 0 && filename !== ':memory:') {
    const backup = `${filename}.v${version}.${randomUUID()}.backup`;
    db.prepare('VACUUM INTO ?').run(backup);
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = version; i < schemaVersion; i++) db.exec(migrations[i]);
    db.exec(`PRAGMA user_version = ${schemaVersion}; COMMIT;`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
