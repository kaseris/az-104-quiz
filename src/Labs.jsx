import Select from './Select.jsx';
import LabAdaptations from './LabAdaptations.jsx';
import LabEvidence from './LabEvidence.jsx';
import { useEffect, useRef, useState } from 'react';
import { domains, skills } from '../content/catalog.js';

const api = window.study?.labs;
const statusName = (status) =>
  ({
    in_progress: 'In progress',
    paused: 'Paused',
    awaiting_evidence: 'Awaiting evidence',
    completed: 'Completed · self-reported',
  })[status];
const methodName = (method) => (method === 'cli' ? 'Azure CLI (Bash)' : 'Azure Portal');
const domainName = (id) => domains.find((d) => d.id === id)?.title || id;
const skillName = (id) => skills.find((s) => s.id === id)?.title || id;
function Lines({ items }) {
  return (
    <ol className="lab-lines">
      {items.map((line, i) => (
        <li key={i}>
          <div className="lab-text">{line}</div>
        </li>
      ))}
    </ol>
  );
}
function Preflight({ lab, openLink }) {
  return (
    <div className="lab-preflight">
      <section>
        <h2>Before you start</h2>
        <Lines items={lab.selection} />
        <h3>Prerequisites</h3>
        <Lines items={lab.prerequisites} />
        <h3>Required access</h3>
        {lab.requiredRoles.map((r, i) => (
          <p key={i}>
            <strong>{r.role}</strong>
            <br />
            {r.scope}
          </p>
        ))}
      </section>
      <section>
        <h2>Resources and costs</h2>
        <ul>
          {lab.resources.map((r) => (
            <li key={r.id}>
              <strong>{r.name}</strong> · {r.type}
              <p>{r.purpose}</p>
            </li>
          ))}
        </ul>
        <p>{lab.costs.estimate}</p>
        <Lines items={lab.costs.restrictions} />
        <p className="lab-meta">
          Cost guidance reviewed {lab.costs.reviewedAt}. {lab.duration.setupNote}
        </p>
      </section>
      <section>
        <h2>Cleanup plan</h2>
        <p>{lab.cleanup.keepResources}</p>
        <p>{lab.cleanup.verification}</p>
        <details>
          <summary>Portal cleanup instructions</summary>
          <Lines items={lab.cleanup.portal} />
        </details>
        <details>
          <summary>CLI cleanup instructions</summary>
          <Lines items={lab.cleanup.cli} />
        </details>
      </section>
      <section>
        <h2>Sources and review</h2>
        <p>{lab.provenance.reviewBasis}</p>
        <p>{lab.provenance.notice}</p>
        <p className="lab-meta">
          Lab version {lab.version} · Blueprint {lab.blueprintVersion} · Documentation reviewed{' '}
          {lab.provenance.reviewedAt}
        </p>
        {[...lab.sources, ...lab.costs.sources].map((s, i) => (
          <p key={i}>
            <button className="text-link" onClick={() => openLink(s.url)}>
              {s.title} ↗
            </button>{' '}
            <span className="lab-meta">{s.publisher}</span>
          </p>
        ))}
      </section>
    </div>
  );
}
export default function Labs() {
  const [library, setLibrary] = useState(null);
  const [view, setView] = useState(null);
  const [method, setMethod] = useState('portal');
  const [reviewed, setReviewed] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyMethod, setHistoryMethod] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [evidencePending, setEvidencePending] = useState(false);
  const newAttemptKey = useRef(crypto.randomUUID());
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const running = useRef(false);
  const alive = useRef(true);
  const retry = useRef(null);
  const heading = useRef(null);
  async function run(work) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    setSaved('');
    retry.current = work;
    try {
      await work();
    } catch (e) {
      if (alive.current) setError(e.message || 'Unable to save your lab. Please retry.');
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const load = async () => {
    const result = await api.list();
    if (alive.current) setLibrary(result);
  };
  useEffect(() => {
    alive.current = true;
    run(load);
    return () => {
      alive.current = false;
    };
    // Load once per visit; all subsequent operations are serialized through run.
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [view?.id, view?.lab.id]);
  const open = (p) =>
    run(async () => {
      const result = await api.read(p);
      if (alive.current) {
        setView(result);
        newAttemptKey.current = crypto.randomUUID();
        setEvidencePending(false);
        setReviewed(false);
        setMethod('portal');
      }
    });
  const update = (action, value) =>
    run(async () => {
      const result = await api.update({
        id: view.id,
        action,
        ...(value === undefined ? {} : { value }),
      });
      if (alive.current) {
        setView(result);
        setSaved('Saved on this device');
      }
    });
  const beforeLeaving = () =>
    window.dispatchEvent(new Event('study:before-navigate', { cancelable: true }));
  const back = () => {
    if (!beforeLeaving()) return;
    return run(async () => {
      await load();
      if (alive.current) setView(null);
    });
  };
  const openLink = (url) =>
    run(() => api.openLink({ ...(view.id ? { id: view.id } : { labId: view.lab.id }), url }));
  const active = !!view?.id;
  const paused = view?.status === 'paused';
  const completed = view?.status === 'completed';
  const lockedHelp = view?.status !== 'in_progress';
  const finish = () =>
    run(async () => {
      const result = await api.complete({ id: view.id });
      if (alive.current) {
        setView(result);
        setSaved('Completed as self-reported; cleanup remains separate');
      }
    });
  const lab = view?.lab;
  const progress = view?.progress;
  const pane = progress?.pane || 'goal';
  const items = lab && active ? lab.methods[view.method].walkthrough : [];
  const existing = library?.attempts.find((a) => a.labId === lab?.id);
  const filtered = library?.labs.filter(
    (l) =>
      (domain === 'all' || l.domainId === domain) &&
      `${l.title} ${l.goal} ${skillName(l.primarySkillId)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const history = library?.attempts.filter(
    (a) =>
      (historyStatus === 'all' ||
        (historyStatus === 'cleanup_pending'
          ? a.cleanupStatus === 'pending'
          : a.status === historyStatus)) &&
      (historyMethod === 'all' || a.method === historyMethod) &&
      `${a.title} ${domainName(a.domainId)}`.toLowerCase().includes(historyQuery.toLowerCase()),
  );
  return (
    <div className="labs-page">
      <header className="page-heading">
        <span className="eyebrow">HANDS-ON PRACTICE</span>
        <h1 ref={heading} tabIndex={-1}>
          {lab?.title || 'A small step in Azure.'}
        </h1>
        <p>
          Curated exercises, at your pace. Read and save your place without AI; carry out cloud
          changes yourself in Azure.
        </p>
      </header>
      {error && (
        <div className="error-notice" role="alert">
          <span>{error} Your last saved place is retained.</span>
          <button disabled={busy} onClick={() => run(retry.current)}>
            Retry
          </button>
        </div>
      )}
      <div role="status" className="lab-save-status">
        {busy ? 'Saving or loading…' : saved}
      </div>
      <fieldset className="lab-controls" disabled={busy || evidencePending}>
        {!view ? (
          <>
            {library && (
              <section className="panel lab-panel" aria-label="Local lab recommendations">
                <h2>Suggested from your quiz practice</h2>
                <p>
                  Local suggestions use objectives marked Needs review by quiz evidence. Lab
                  completion and reflection never change quiz accuracy. Browse any released exercise
                  below.
                </p>
                {library.recommendations.length ? (
                  <div className="lab-cards">
                    {library.recommendations.map((r) => (
                      <article className="lab-card" key={r.labId}>
                        <h3>{r.title}</h3>
                        <p>{r.reason}</p>
                        <p>{r.context}</p>
                        <button
                          className="secondary"
                          onClick={() =>
                            open(r.attemptId ? { id: r.attemptId } : { labId: r.labId })
                          }
                        >
                          {r.attemptId ? 'Continue suggested lab' : 'Review suggested lab'}:{' '}
                          {r.title}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    No released exercise currently matches an objective marked Needs review with its
                    lab prerequisites completed. This is not a readiness assessment; you can choose
                    from the library.
                  </p>
                )}
              </section>
            )}
            {library?.attempts.length > 0 && (
              <section className="panel lab-panel">
                <h2>Your saved labs</h2>
                <p>
                  Lab history is separate from quiz results. Completion and cleanup are
                  self-reported.
                </p>
                <div className="lab-filters">
                  <label>
                    Search lab history
                    <input
                      type="search"
                      aria-label="Search lab history"
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                    />
                  </label>
                  <label>
                    History status
                    <Select
                      aria-label="History status"
                      value={historyStatus}
                      onChange={(e) => setHistoryStatus(e.target.value)}
                    >
                      <option value="all">All attempts</option>
                      <option value="in_progress">In progress</option>
                      <option value="paused">Paused</option>
                      <option value="awaiting_evidence">Awaiting evidence</option>
                      <option value="completed">Completed</option>
                      <option value="cleanup_pending">Cleanup pending</option>
                    </Select>
                  </label>
                  <label>
                    History method
                    <Select
                      aria-label="History method"
                      value={historyMethod}
                      onChange={(e) => setHistoryMethod(e.target.value)}
                    >
                      <option value="all">Both methods</option>
                      <option value="portal">Portal</option>
                      <option value="cli">CLI</option>
                    </Select>
                  </label>
                </div>
                {!history.length && <p>No saved attempts match these filters.</p>}
                <p>Each attempt keeps its own instructions, method, evidence and cleanup state.</p>
                <div className="lab-cards">
                  {history.map((a) => (
                    <article key={a.id} className="lab-card">
                      <span className="badge">{statusName(a.status)}</span>
                      <h3>{a.title}</h3>
                      <p>
                        {methodName(a.method)} · Version {a.version} · Started{' '}
                        {new Date(a.startedAt).toLocaleString()}
                      </p>
                      <p>
                        <strong>
                          {a.cleanupStatus === 'completed'
                            ? 'Cleanup completed'
                            : 'Cleanup pending'}
                        </strong>
                      </p>
                      <p className="lab-meta">
                        {a.tutorRequests} AI tutor requests retained · separate from quiz scores
                      </p>
                      <p className="lab-meta">
                        {a.hintsRevealed} hints ·{' '}
                        {a.walkthroughRevealed ? 'Walkthrough opened' : 'Walkthrough unopened'} ·{' '}
                        {a.reflectionCompared
                          ? 'Reflection answer compared'
                          : 'Reflection answer not compared'}
                      </p>
                      <p>
                        Reflection:{' '}
                        {a.reflectionSaved
                          ? {
                              unanswered: 'Not assessed',
                              needs_review: 'Needs more practice',
                              understood: 'Can explain it',
                            }[a.reflectionAssessment]
                          : 'Not recorded'}{' '}
                        ·{' '}
                        {a.problemKind === 'environment'
                          ? 'Environment/access/policy problem'
                          : a.problemKind === 'conceptual'
                            ? 'Understanding/configuration problem'
                            : 'No problem recorded'}
                      </p>
                      {a.completedAt && (
                        <p className="lab-meta">
                          Completed {new Date(a.completedAt).toLocaleString()} · self-reported
                        </p>
                      )}
                      <button className="secondary" onClick={() => open({ id: a.id })}>
                        Open saved lab: {a.title}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <section className="panel lab-panel">
              <h2>Exercise library</h2>
              <p>Two pilots across two domains. More exercises are planned.</p>
              <div className="lab-filters">
                <label>
                  Find an exercise
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search goals or skills"
                  />
                </label>
                <label>
                  Domain
                  <Select
                    aria-label="Domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  >
                    <option value="all">All domains</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              {!library ? (
                <p>
                  {error
                    ? 'The library could not be loaded. Use Retry above.'
                    : 'Loading exercises…'}
                </p>
              ) : filtered.length === 0 ? (
                <p>No exercises match. Try another domain or search.</p>
              ) : (
                <div className="lab-cards">
                  {filtered.map((l) => (
                    <article className="lab-card" key={l.id}>
                      <span className="eyebrow">{domainName(l.domainId)}</span>
                      <h3>{l.title}</h3>
                      <p>{l.goal}</p>
                      <p className="lab-meta">
                        {l.duration.minMinutes}–{l.duration.maxMinutes} min · Portal or CLI
                      </p>
                      <button className="secondary" onClick={() => open({ labId: l.id })}>
                        View exercise: {l.title}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="lab-toolbar">
              <button className="text-link" onClick={back}>
                ← Lab library
              </button>
              <span className="badge">
                {active ? `${statusName(view.status)} · ${methodName(view.method)}` : 'Not started'}
              </span>
              {active && (
                <button
                  className="secondary"
                  onClick={() => {
                    if (beforeLeaving())
                      window.dispatchEvent(
                        new CustomEvent('open-tutor', {
                          detail: { labAttemptId: view.id, mode: 'hint' },
                        }),
                      );
                  }}
                >
                  Optional lab tutor
                </button>
              )}
              {active && !completed && (
                <button
                  className="secondary"
                  onClick={() => update(view.status === 'in_progress' ? 'pause' : 'resume')}
                >
                  {view.status === 'in_progress' ? 'Pause lab' : 'Resume lab'}
                </button>
              )}
              {active && (
                <button
                  className="secondary"
                  onClick={() => {
                    if (beforeLeaving()) open({ labId: lab.id });
                  }}
                >
                  Start another attempt
                </button>
              )}
            </div>
            <section className="panel lab-panel">
              <span className="eyebrow">
                {domainName(lab.domainId)} · {skillName(lab.primarySkillId)}
              </span>
              <h2>Your goal</h2>
              <p className="lab-goal">{lab.goal}</p>
              <p>
                {lab.duration.minMinutes}–{lab.duration.maxMinutes} minutes · Version {lab.version}
              </p>
              {active && (
                <p className="lab-meta">
                  This attempt keeps the instructions you started with. Your place and revealed help
                  are saved; no Azure state is checked.
                </p>
              )}
            </section>
            {!active ? (
              <section className="panel lab-panel">
                <Preflight lab={lab} openLink={openLink} />
                {existing && (
                  <button className="primary" onClick={() => open({ id: existing.id })}>
                    Open your saved attempt
                  </button>
                )}
                <div className="lab-start">
                  <label>
                    Execution method
                    <Select
                      aria-label="Execution method"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      <option value="portal">Azure Portal</option>
                      <option value="cli">Azure CLI (Bash)</option>
                    </Select>
                  </label>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                    />
                    I reviewed prerequisites, costs, dedicated resources and cleanup.
                  </label>
                  <button
                    className="primary"
                    disabled={!reviewed}
                    onClick={() =>
                      run(async () => {
                        const result = await api.start({
                          labId: lab.id,
                          method,
                          preflightReviewed: true,
                          requestKey: newAttemptKey.current,
                        });
                        if (alive.current) {
                          setView(result);
                          setSaved('Started and saved on this device');
                        }
                      })
                    }
                  >
                    Start lab
                  </button>
                </div>
              </section>
            ) : (
              <>
                {paused && (
                  <p className="panel lab-panel" role="status">
                    Your place is saved. Resume to continue. Pausing here does not stop or delete
                    Azure resources.
                  </p>
                )}
                <section className="panel lab-panel">
                  <nav className="lab-tabs" aria-label="Lab views">
                    <button aria-pressed={pane === 'goal'} onClick={() => update('pane', 'goal')}>
                      Goal and hints
                    </button>
                    <button
                      aria-pressed={pane === 'walkthrough'}
                      disabled={lockedHelp && !progress.walkthroughRevealedAt}
                      onClick={() =>
                        update(
                          progress.walkthroughRevealedAt ? 'pane' : 'walkthrough',
                          progress.walkthroughRevealedAt ? 'walkthrough' : undefined,
                        )
                      }
                    >
                      {progress.walkthroughRevealedAt ? 'Walkthrough' : 'Reveal full walkthrough'}
                    </button>
                    <button
                      aria-pressed={pane === 'cleanup'}
                      onClick={() => update('pane', 'cleanup')}
                    >
                      Cleanup
                    </button>
                  </nav>
                  {pane === 'goal' && (
                    <>
                      <h2>Try the goal first</h2>
                      <p>
                        Reveal one hint at a time if you need it. Opening help is recorded in this
                        attempt.
                      </p>
                      <Lines items={lab.hints.slice(0, progress.hintsRevealed)} />
                      <button
                        className="secondary"
                        disabled={lockedHelp || progress.hintsRevealed === lab.hints.length}
                        onClick={() => update('hint', progress.hintsRevealed + 1)}
                      >
                        {progress.hintsRevealed === lab.hints.length
                          ? 'All hints revealed'
                          : 'Reveal next hint'}
                      </button>
                      <h3>Expected results</h3>
                      <Lines items={lab.expectedResults} />
                    </>
                  )}
                  {pane === 'walkthrough' && (
                    <>
                      <h2>{methodName(view.method)} walkthrough</h2>
                      <p>
                        Step {progress.step + 1} of {items.length}. Follow one block at a time. This
                        saves your reading position, not proof of execution.
                      </p>
                      <div
                        className="lab-command"
                        tabIndex={0}
                        aria-label="Current walkthrough step"
                      >
                        {items[progress.step]}
                      </div>
                      <div className="lab-toolbar">
                        <button
                          className="secondary"
                          disabled={paused || progress.step === 0}
                          onClick={() => update('step', progress.step - 1)}
                        >
                          Previous step
                        </button>
                        <button
                          className="primary"
                          disabled={paused || progress.step === items.length - 1}
                          onClick={() => update('step', progress.step + 1)}
                        >
                          Next step
                        </button>
                      </div>
                      <h3>Check the result in Azure</h3>
                      <Lines items={lab.methods[view.method].verification} />
                    </>
                  )}
                  {pane === 'cleanup' && (
                    <>
                      <h2>Clean up your exercise resources</h2>
                      <Lines items={lab.cleanup[view.method]} />
                      <p>{lab.cleanup.verification}</p>
                      <p>{lab.cleanup.keepResources}</p>
                    </>
                  )}
                </section>
                <LabAdaptations key={view.id} attempt={view} />
                <details className="panel lab-panel">
                  <summary>Prerequisites, resources, costs and cleanup</summary>
                  <Preflight lab={lab} openLink={openLink} />
                </details>
                <details className="panel lab-panel">
                  <summary>If something goes wrong</summary>
                  {lab.troubleshooting.map((t) => (
                    <section key={t.kind}>
                      <h3>
                        {t.kind === 'environment'
                          ? 'Environment or access'
                          : 'Check your understanding'}
                      </h3>
                      <p>{t.symptom}</p>
                      <p>{t.action}</p>
                    </section>
                  ))}
                </details>
              </>
            )}
          </>
        )}
      </fieldset>
      {active && (
        <LabEvidence
          key={view.id}
          attempt={view}
          busy={busy}
          onPending={setEvidencePending}
          onSnapshot={(result) => {
            if (alive.current) setView((current) => (current?.id === result.id ? result : current));
          }}
          complete={finish}
          awaiting={() => update('awaiting')}
        />
      )}
    </div>
  );
}
