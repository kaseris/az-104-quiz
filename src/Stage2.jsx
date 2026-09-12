import Select from './Select.jsx';
import { GenerateLink } from './Generation.jsx';
import ActionButton from './ActionButton.jsx';
import { ReaderLink } from './Reader.jsx';
import { useEffect, useState, useRef } from 'react';
const api = window.study;
const score = (x) =>
  `${x.correct}/${x.total} (${x.total ? Math.round((x.correct / x.total) * 100) : 0}%)`;
function useLocal(load) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [revision, retry] = useState(0);
  useEffect(() => {
    let alive = true;
    load()
      .then((x) => {
        if (alive) {
          setData(x);
          setError('');
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [load, revision]);
  return { data, error, reload: () => retry((x) => x + 1) };
}
const loadProgress = () => api.progress(),
  loadIssues = () => api.issues();
export function Confidence({ value, disabled, onChange }) {
  return (
    <label className="confidence">
      Confidence (optional)
      <Select
        aria-label="Confidence"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Omitted</option>
        <option value="unsure">Unsure</option>
        <option value="somewhat-sure">Somewhat sure</option>
        <option value="confident">Confident</option>
      </Select>
    </label>
  );
}
export function AdvancedSetup({ state, busy, start, initial }) {
  const [mode, setMode] = useState('adaptive'),
    [count, setCount] = useState(10),
    [domainIds, setDomains] = useState(
      initial?.domainId ? [initial.domainId] : state.domains.map((d) => d.id),
    );
  const [objectiveId, setObjective] = useState(initial?.objectiveId ?? ''),
    [skillId, setSkill] = useState(initial?.skillId ?? ''),
    [cooldownHours, setCooldown] = useState(24),
    [repeatHeavy, setRepeat] = useState(false),
    [examGenerated, setExamGenerated] = useState(false),
    [timed, setTimed] = useState(false),
    [durationMinutes, setMinutes] = useState(20),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const config = {
    mode,
    count,
    domainIds,
    objectiveId: mode === 'adaptive' ? objectiveId : null,
    skillId: mode === 'adaptive' ? skillId : null,
    cooldownHours,
    repeatHeavy,
    timed,
    durationMinutes,
    ...(mode === 'exam' ? { includeGenerated: examGenerated } : {}),
  };
  const key = JSON.stringify(config);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPreview(null);
    api
      .preview(JSON.parse(key))
      .then((x) => {
        if (alive) {
          setPreview(x);
          setError('');
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key]);
  return (
    <section className="panel stage2-panel study-surface">
      <h2>Adaptive & exam-style practice</h2>
      <div className="stage2-fields">
        <label>
          Mode
          <Select aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="adaptive">Adaptive practice</option>
            <option value="exam">Exam-style practice</option>
          </Select>
        </label>
        <label>
          Questions
          <Select
            aria-label="Questions"
            value={count}
            onChange={(e) => {
              setCount(Number(e.target.value));
              setMinutes(Number(e.target.value) * 2);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </label>
      </div>
      {mode === 'exam' && (
        <label className="check-line">
          <input
            type="checkbox"
            checked={examGenerated}
            onChange={(e) => setExamGenerated(e.target.checked)}
          />
          Include AI-generated questions in this exam-style session
        </label>
      )}
      {mode === 'adaptive' ? (
        <>
          <fieldset>
            <legend>Domains</legend>
            {state.domains.map((d) => (
              <label className="check-line" key={d.id}>
                <input
                  type="checkbox"
                  checked={domainIds.includes(d.id)}
                  onChange={(e) => {
                    setDomains(
                      e.target.checked
                        ? [...domainIds, d.id]
                        : domainIds.filter((id) => id !== d.id),
                    );
                    setObjective('');
                    setSkill('');
                  }}
                />
                {d.title}
              </label>
            ))}
          </fieldset>
          <div className="stage2-fields">
            <label>
              Objective
              <Select
                aria-label="Objective"
                value={objectiveId}
                onChange={(e) => {
                  setObjective(e.target.value);
                  setSkill('');
                }}
              >
                <option value="">All selected objectives</option>
                {state.objectives
                  .filter((o) => domainIds.includes(o.domainId))
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </Select>
            </label>
            <label>
              Skill
              <Select aria-label="Skill" value={skillId} onChange={(e) => setSkill(e.target.value)}>
                <option value="">All selected skills</option>
                {state.skills
                  .filter(
                    (s) =>
                      domainIds.includes(s.domainId) &&
                      (!objectiveId || s.objectiveId === objectiveId),
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
              </Select>
            </label>
            <label>
              Repeat cooldown (hours)
              <input
                type="number"
                min="0"
                max="720"
                value={cooldownHours}
                onChange={(e) => setCooldown(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={repeatHeavy}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            Repeat-heavy review: allow recently practiced families
          </label>
          <p>
            Selections combine weak skills, due reviews, and unseen material. Each family appears at
            most once.
          </p>
        </>
      ) : (
        <>
          <p>
            Fixed domain distribution. Answers and explanations stay hidden until final submission.
          </p>
          <label className="check-line">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            Timed practice
          </label>
          {timed && (
            <>
              <label>
                Practice duration (minutes)
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={durationMinutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>
              <p>
                Closing the app does not pause the countdown. Clock rollback or unverifiable elapsed
                time makes timing invalid and practice continues untimed. This is an app setting,
                not the official exam duration.
              </p>
            </>
          )}
        </>
      )}
      {loading && <p role="status">Checking eligible questions…</p>}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <>
          <p role="status">
            {preview.available} of {preview.requested} requested questions available.
          </p>
          {preview.missingDomains.length > 0 && (
            <p>Coverage gap: {preview.missingDomains.join(', ')}.</p>
          )}
          {preview.blocked && (
            <p role="alert">
              Exam-style practice requires 100 approved questions covering all objective groups and
              enough distinct families per domain.{' '}
              {preview.shortages
                .map((s) => `${s.domainId}: ${s.available}/${s.required}`)
                .join('; ')}
            </p>
          )}
          <ActionButton
            className="primary"
            disabled={busy || loading || preview.blocked || !preview.available}
            onClick={() => start({ ...config, acceptShorter: true })}
          >
            {preview.limited
              ? `Start shorter ${preview.available}-question session`
              : `Start ${mode} session`}
          </ActionButton>
        </>
      )}
    </section>
  );
}
export function Progress({ practice }) {
  const { data, error, reload } = useLocal(loadProgress);
  if (!data)
    return (
      <section className="panel stage2-panel">
        <p role={error ? 'alert' : 'status'}>{error || 'Loading learning evidence…'}</p>
        {error && <button onClick={reload}>Retry</button>}
      </section>
    );
  return (
    <div className="page-enter">
      <h1>Learning progress</h1>
      <p>
        Study accuracy is evidence, not a pass prediction. Related skills do not multiply attempts.
        Recent results include one latest response per family; independent first attempts are shown
        separately.
      </p>
      <p>
        {data.coverage.missingSkills.length} of {data.coverage.skills} skills have no eligible
        questions. {data.unknownMappings} historical attempts have unknown skill mappings.
      </p>
      {data.domains.map((d) => (
        <section className="panel stage2-panel" key={d.id}>
          <h2>{d.title}</h2>
          <p>
            {d.state} · {score(d.accuracy)} overall · {d.distinctFamilies} distinct families
          </p>
          {data.objectives
            .filter((o) => o.domainId === d.id)
            .map((o) => (
              <details key={o.id} className="progress-objective">
                <summary>
                  {o.title} — {o.state} · {o.bankCount} eligible items
                </summary>
                <p>
                  First responses: {score(o.first)}. Independent unassisted: {score(o.unassisted)}.
                  Unknown assistance: {score(o.unknown)}.
                </p>
                <p>
                  Recent: {score(o.recent)} · Assisted: {score(o.assisted)} · Repeated:{' '}
                  {score(o.repeated)} · {o.distinctQuestions} distinct questions · {o.excluded}{' '}
                  excluded disputed/retired responses.
                </p>
                <p>
                  Last practiced:{' '}
                  {o.lastPracticed ? new Date(o.lastPracticed).toLocaleString() : 'Never'} · Next
                  review: {o.due ? new Date(o.due).toLocaleString() : 'No schedule'} · {o.dueCount}{' '}
                  due families.
                </p>
                <p>
                  Recent family results:{' '}
                  {o.trend.length
                    ? o.trend
                        .map((t) => `${t.correct ? 'Correct' : 'Incorrect'} (${t.mode})`)
                        .join(' → ')
                    : 'No evidence yet'}
                </p>
                <button
                  className="secondary"
                  disabled={!o.bankCount}
                  onClick={() => practice({ domainId: d.id, objectiveId: o.id })}
                >
                  Practice {o.title}
                </button>
                <GenerateLink objectiveId={o.id} />
                <ReaderLink objectiveId={o.id}>Read objective documentation</ReaderLink>
                <ul>
                  {data.skills
                    .filter((s) => s.objectiveId === o.id)
                    .map((s) => (
                      <li key={s.id}>
                        <strong>{s.title}</strong> — {s.state};{' '}
                        {s.bankCount ? `${s.bankCount} items` : 'Coverage gap'}; recent{' '}
                        {score(s.recent)}.{' '}
                        <button
                          className="text-link"
                          disabled={!s.bankCount}
                          onClick={() =>
                            practice({ domainId: d.id, objectiveId: o.id, skillId: s.id })
                          }
                        >
                          Practice skill
                        </button>
                        <ReaderLink skillId={s.id} objectiveId={o.id}>
                          Read skill documentation
                        </ReaderLink>
                      </li>
                    ))}
                </ul>
              </details>
            ))}
        </section>
      ))}
      <details className="panel stage2-panel">
        <summary>How evidence states work</summary>
        <p>
          No responses: unpracticed. Fewer than three distinct families: insufficient evidence. With
          three families, recent accuracy below 70%: needs review. Otherwise, ten independent first
          responses with the latest five at least 20 percentage points above the preceding five:
          improving. All other cases: evidence collected. Due dates are a separate review heuristic.
          No state claims mastery.
        </p>
      </details>
    </div>
  );
}
export function ReportQuestion({ question, run }) {
  const [open, setOpen] = useState(false),
    [category, setCategory] = useState('ambiguity'),
    [note, setNote] = useState(''),
    [sent, setSent] = useState(false);
  return (
    <div className="issue-report">
      {sent ? (
        <p role="status">
          Issue saved locally. This version is excluded from new sessions and weakness evidence
          pending resolution.
        </p>
      ) : (
        <>
          <button className="text-link" onClick={() => setOpen(!open)}>
            Report question issue
          </button>
          {open && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await api.report({
                    questionId: question.id,
                    version: question.version,
                    category,
                    note,
                  });
                  setSent(true);
                });
              }}
            >
              <label>
                Category
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {['ambiguity', 'incorrect-answer', 'outdated-content', 'broken-reference'].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </Select>
              </label>
              <label>
                Notes
                <textarea maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <button className="secondary">Save local issue</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
export function Issues({ run }) {
  const { data, error, reload } = useLocal(loadIssues);
  return (
    <div className="page-enter">
      <h1>Question issues</h1>
      <p>
        Reports stay on this device. Reviewed bank updates supply corrected versions. Retired
        questions stay excluded; historical scores stay unchanged.
      </p>
      {error && (
        <p role="alert">
          {error}
          <button onClick={reload}>Retry</button>
        </p>
      )}
      {!data && !error && <p role="status">Loading issues…</p>}
      {data?.length === 0 && <p>No reported issues.</p>}
      {data?.map((i) => (
        <Issue
          key={i.id}
          issue={i}
          resolve={(status, note) =>
            run(async () => {
              await api.resolve({ id: i.id, status, note });
              reload();
            })
          }
        />
      ))}
    </div>
  );
}
function Issue({ issue, resolve }) {
  const [note, setNote] = useState('');
  return (
    <section className="panel stage2-panel">
      <h2>
        {issue.question_id} · version {issue.version}
      </h2>
      <p>
        {issue.category} · {issue.status}
      </p>
      <p>{issue.note}</p>
      {issue.status === 'pending' && (
        <>
          <label>
            Resolution explanation
            <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="stage2-actions">
            <button
              className="secondary"
              disabled={!note.trim()}
              onClick={() => resolve('dismissed', note)}
            >
              Dismiss and restore
            </button>
            <button
              className="secondary"
              disabled={!note.trim()}
              onClick={() => resolve('retired', note)}
            >
              Retire question
            </button>
          </div>
        </>
      )}
      <ul>
        {issue.events.map((e, i) => (
          <li key={i}>
            {e.status}: {e.note || 'Reported'} ({new Date(e.created_at).toLocaleString()})
          </li>
        ))}
      </ul>
    </section>
  );
}
export function Exam({ session, busy, update, navigate, poll }) {
  const item = session.items[session.cursor],
    q = item.question;
  const opened = useRef(performance.now()),
    initialDuration = useRef(item.durationMs);
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      poll();
    }, 1000);
    return () => clearInterval(timer);
  }, [poll]);
  const save = (selected, confidence = item.confidence) =>
    update('draft', {
      sessionId: session.id,
      questionId: q.id,
      selectedOptionIds: selected,
      confidence,
      durationMs: Math.min(
        604800000,
        initialDuration.current + Math.round(performance.now() - opened.current),
      ),
      revision: item.revision,
    });
  const unanswered = session.items.filter((i) => !i.selectedOptionIds.length).length;
  return (
    <div className="page-enter">
      <div className="stage2-actions">
        <button className="text-link" disabled={busy} onClick={() => navigate('practice')}>
          Save & leave
        </button>
        <span role="status">{busy ? 'Saving…' : 'Saved on this device'}</span>
      </div>
      <p>
        {session.timingStatus === 'timed'
          ? `Time remaining: ${Math.max(0, Math.ceil(session.remainingMs / 60000))} minutes`
          : session.timingStatus === 'invalid'
            ? 'Timing invalid — continuing untimed; excluded from timed comparisons'
            : 'Untimed exam-style practice'}
      </p>
      <section className="panel stage2-panel question-panel study-surface">
        <p>
          Question {session.cursor + 1} of {session.items.length}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {q.title}
        </h1>
        <p>{q.prompt}</p>
        {q.code && (
          <pre>
            <code>{q.code.text}</code>
          </pre>
        )}
        <fieldset>
          <legend>
            Select {q.selectionCount} answer{q.selectionCount > 1 ? 's' : ''}
          </legend>
          {q.options.map((o) => (
            <label
              className={`answer-option ${item.selectedOptionIds.includes(o.id) ? 'chosen' : ''}`}
              key={o.id}
            >
              <input
                type={q.type === 'single' ? 'radio' : 'checkbox'}
                name="exam-answer"
                checked={item.selectedOptionIds.includes(o.id)}
                disabled={busy}
                onChange={() =>
                  save(
                    q.type === 'single'
                      ? [o.id]
                      : item.selectedOptionIds.includes(o.id)
                        ? item.selectedOptionIds.filter((id) => id !== o.id)
                        : [...item.selectedOptionIds, o.id],
                  )
                }
              />
              <span className="answer-text">{o.text}</span>
            </label>
          ))}
        </fieldset>
        <button
          className="text-link"
          disabled={busy || !item.selectedOptionIds.length}
          onClick={() => save([])}
        >
          Clear answer
        </button>
        <Confidence
          value={item.confidence}
          disabled={busy}
          onChange={(v) => save(item.selectedOptionIds, v)}
        />
        <label className="check-line">
          <input
            type="checkbox"
            disabled={busy}
            checked={item.flagged}
            onChange={(e) =>
              update('flag', {
                sessionId: session.id,
                questionId: q.id,
                flagged: e.target.checked,
                revision: item.revision,
              })
            }
          />
          Flag for review
        </label>
      </section>
      <nav className="exam-map" aria-label="Exam questions">
        {session.items.map((i, n) => (
          <button
            key={i.question.id}
            disabled={busy}
            aria-current={n === session.cursor ? 'step' : undefined}
            aria-label={`Question ${n + 1}: ${i.selectedOptionIds.length ? 'answered' : 'unanswered'}${i.flagged ? ', flagged' : ''}`}
            onClick={() => update('navigate', { sessionId: session.id, position: n })}
          >
            {n + 1}
            {i.flagged ? ' ⚑' : i.selectedOptionIds.length ? ' •' : ''}
          </button>
        ))}
      </nav>
      <p>{unanswered} unanswered. Unanswered items count as incorrect.</p>
      {confirm ? (
        <div className="panel stage2-panel" role="alert">
          <p>
            Finalize saved answers? {unanswered} questions are unanswered. You cannot change answers
            after submission.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => update('finalize', { sessionId: session.id, confirmUnanswered: true })}
          >
            Confirm final submission
          </button>
          <button className="secondary" onClick={() => setConfirm(false)}>
            Keep reviewing
          </button>
        </div>
      ) : (
        <button className="primary" disabled={busy} onClick={() => setConfirm(true)}>
          Submit exam
        </button>
      )}
    </div>
  );
}
