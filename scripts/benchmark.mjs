import { performance } from 'node:perf_hooks';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir, cpus, platform, arch, release } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { StudyStore } from '../electron/store.js';
import { DocumentStore } from '../electron/document-store.js';
import { questions } from '../content/questions.js';
import { labs } from '../content/labs.js';
const dir = mkdtempSync(join(tmpdir(), 'az104-benchmark-')),
  path = join(dir, 'study.sqlite');
let store;
try {
  store = new StudyStore(path);
  store.transaction(() => {
    const session = store.db.prepare(
      "INSERT INTO sessions(id,started_at,completed_at,domain_id,blueprint_version) VALUES(?,'2026-01-01','2026-01-02','all',?)",
    );
    const item = store.db.prepare(
      "INSERT INTO session_items(session_id,position,question_id,snapshot,selected,submitted_at,correct,duration_ms) VALUES(?,?,?,?,?,'2026-01-02',1,2000)",
    );
    for (let i = 0; i < 10000; i++) {
      session.run(`benchmark-${i}`, questions[0].blueprintVersion);
      for (let j = 0; j < 10; j++) {
        const q = questions[j];
        item.run(`benchmark-${i}`, j, q.id, JSON.stringify(q), JSON.stringify(q.correctOptionIds));
      }
    }
    const conversation = store.db.prepare(
      "INSERT INTO tutor_conversations VALUES(?,?,'2026-01-01')",
    );
    const lab = store.db.prepare(
      "INSERT INTO lab_attempts(id,lab_id,snapshot,method,status,progress,started_at,updated_at) VALUES(?,?,?,'portal','paused',?,'2026-01-01','2026-01-01')",
    );
    for (let i = 0; i < 1000; i++) {
      conversation.run(
        `chat-${i}`,
        JSON.stringify({
          id: `chat-${i}`,
          title: 'Synthetic conversation',
          body: 'Synthetic question',
          references: [],
          mode: 'explain',
          quiz: null,
        }),
      );
      lab.run(
        `lab-${i}`,
        labs[0].id,
        JSON.stringify(labs[0]),
        JSON.stringify({
          pane: 'goal',
          step: 0,
          hintsRevealed: 0,
          hintRevealedAt: [],
          walkthroughRevealedAt: null,
        }),
      );
    }
    const insert = store.db.prepare(
      'INSERT INTO document_search(document_id,revision,section_id,title,body) VALUES(?,?,?,?,?)',
    );
    const body = 'Azure role assignment synthetic searchable content. '.repeat(2000);
    for (let i = 0; i < 1024; i++)
      insert.run('rbac', 'benchmark', `section-${i}`, 'Role assignments', body);
    const bytes = 100 * 1024 * 1024;
    store.db
      .prepare(
        "INSERT INTO document_versions VALUES('rbac','benchmark',?, ?,?,'2026-01-01','2026-01-01','2026-01-01')",
      )
      .run(
        JSON.stringify({
          title: 'Synthetic cache',
          sections: [],
          padding: 'x'.repeat(bytes - 100),
        }),
        '{}',
        bytes,
      );
  });
  store.close();
  store = null;
  const start = performance.now();
  store = new StudyStore(path);
  const state = store.state();
  const startup = performance.now() - start;
  assert.equal(state.sessions.length, 10000);
  const reader = new DocumentStore(store),
    search = [];
  for (let i = 0; i < 30; i++) {
    const t = performance.now();
    reader.search({ query: 'role assignment' });
    search.push(performance.now() - t);
  }
  const session = store.start({ count: 5 }),
    question = session.items[0].question,
    quiz = [];
  for (let i = 0; i < 30; i++) {
    const t = performance.now();
    store.draft({
      sessionId: session.id,
      questionId: question.id,
      selectedOptionIds: [question.options[0].id],
      durationMs: 1,
    });
    quiz.push(performance.now() - t);
  }
  const p95 = (a) => a.sort((a, b) => a - b)[Math.ceil(a.length * 0.95) - 1];
  const report = {
    hardware: cpus()[0].model,
    platform: platform(),
    osRelease: release(),
    arch: arch(),
    node: process.version,
    profile: { sessions: 10000, answers: 100000, conversations: 1000, labs: 1000, cacheMiB: 100 },
    databaseBytes: statSync(path).size,
    startupStoreAndStateMs: startup,
    searchP95Ms: p95(search),
    quizSaveP95Ms: p95(quiz),
    note: 'Store/API timings. Packaged UI startup and visual responsiveness are separately tested.',
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/benchmark.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.ok(startup < 5000, 'Store startup budget exceeded');
  assert.ok(report.searchP95Ms < 300, 'Search budget exceeded');
  assert.ok(report.quizSaveP95Ms < 100, 'Quiz budget exceeded');
} finally {
  store?.close();
  rmSync(dir, { recursive: true, force: true });
}
