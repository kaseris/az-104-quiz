import Select from './Select.jsx';
import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
const api = window.study;
const money = (n) => `$${Number(n || 0).toFixed(4)}`;
export function GenerateLink({ sessionId, objectiveId }) {
  const [open, setOpen] = useState(false),
    [count, setCount] = useState(3),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="generation-entry">
      <button className="secondary" onClick={() => setOpen(!open)}>
        <Sparkles size={15} aria-hidden="true" />
        Generate targeted practice
      </button>
      {open && (
        <div className="generation-request">
          <p>
            Use relevant mistakes and current documentation. Analysis, generation and independent
            review count toward your existing daily AI limit. Accepted questions join new study
            sessions automatically.
          </p>
          <label>
            Candidates{' '}
            <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </label>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await api.generation.create({
                  ...(sessionId ? { sessionId } : {}),
                  ...(objectiveId ? { objectiveId } : {}),
                  count,
                });
                window.dispatchEvent(new CustomEvent('open-generation'));
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Saving…' : 'Queue generation'}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
export function GeneratedProvenance({ source }) {
  const [error, setError] = useState('');
  return (
    <details className="generated-provenance">
      {error && <p role="alert">{error}</p>}
      <summary>AI-generated · automated review</summary>
      <p>
        Generation: {source.model} · Review: {source.reviewModel} · {source.promptVersion}.
        Automated review does not guarantee correctness.
      </p>
      {(source.evidence || []).map((s) => (
        <div key={s.id}>
          <strong>
            {s.title} · {s.sectionId}
          </strong>
          <p>
            Retrieved {new Date(s.fetchedAt).toLocaleString()} · Revision {s.revision.slice(0, 12)}
          </p>
          <blockquote>{s.excerpt}</blockquote>
          <p>
            {s.attribution || 'Microsoft Corporation and contributors'} ·{' '}
            {s.license || 'Source license retained in Documentation'}
          </p>
          <button
            className="text-link"
            onClick={() =>
              api.reader
                .openLink({ id: s.documentId, revision: s.revision, url: s.url })
                .catch((e) => setError(e.message))
            }
          >
            Open original documentation
          </button>
          {s.licenseUrl && (
            <button
              className="text-link"
              onClick={() =>
                api.reader
                  .openLink({ id: s.documentId, revision: s.revision, url: s.licenseUrl })
                  .catch((e) => setError(e.message))
              }
            >
              Source license
            </button>
          )}
        </div>
      ))}
    </details>
  );
}
export default function Generation() {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [detail, setDetail] = useState(null),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [allowance, setAllowance] = useState(''),
    [confirmRetry, setConfirmRetry] = useState(null);
  const refresh = useCallback(async () => {
    const result = await api.generation.list();
    setData(result);
    if (selected) setDetail(await api.generation.read({ id: selected }));
  }, [selected]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const result = await api.generation.list();
        if (alive) setData(result);
        if (selected) {
          const j = await api.generation.read({ id: selected });
          if (alive) setDetail(j);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    load();
    const timer = setInterval(load, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [selected]);
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return (
      <section className="panel stage2-panel">
        <p role={error ? 'alert' : 'status'}>{error || 'Loading generation queue…'}</p>
        {error && <button onClick={() => run(refresh)}>Retry</button>}
      </section>
    );
  const queued = data.jobs.filter(
    (j) => !['completed', 'failed', 'cancelled'].includes(j.status),
  ).length;
  return (
    <div className="generation-page page-enter">
      <div className="generation-heading">
        <div>
          <span className="eyebrow">PERSONALIZED PRACTICE</span>
          <h1>Question generation</h1>
          <p>Turn reviewed mistakes into new practice, grounded in current documentation.</p>
        </div>
        <span className="badge">{queued} in queue</span>
      </div>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      <section className="panel stage2-panel">
        <h2>Generation settings</h2>
        <p>
          {data.provider.enabled
            ? 'AI active'
            : 'AI inactive — activate in Settings using your stored key.'}{' '}
          · Committed: {money(data.provider.usage.committed)} / {money(data.provider.dailyLimit)} ·
          Future passes reserved: {money(data.provider.usage.held)}
        </p>
        <p>
          Local work stops when the app quits. Reopening restores checkpoints; paid work waits for
          AI reactivation. Lost unstored responses require deliberate retry.
        </p>
        <div className="generation-controls">
          <label>
            Automation daily allowance (USD)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={allowance}
              placeholder={
                data.settings.automationLimit
                  ? String(data.settings.automationLimit)
                  : 'Choose an allowance'
              }
              onChange={(e) => setAllowance(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            disabled={busy || !allowance}
            onClick={() =>
              run(() => api.generation.settings({ automationLimit: Number(allowance) }))
            }
          >
            Save allowance
          </button>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={data.settings.automatic}
            disabled={busy}
            onChange={(e) => run(() => api.generation.settings({ automatic: e.target.checked }))}
          />
          Automatically generate after completed sessions (paid, within the saved allowance)
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={data.settings.includeGenerated}
            disabled={busy}
            onChange={(e) =>
              run(() => api.generation.settings({ includeGenerated: e.target.checked }))
            }
          />
          Include AI-generated questions in new study and adaptive sessions
        </label>
        <p>
          Exam-style sessions use the public bank unless you explicitly include generated questions.
        </p>
        <GenerateLink />
      </section>
      <div className="generation-layout">
        <section className="panel stage2-panel">
          <h2>Jobs</h2>
          {!data.jobs.length && (
            <p>
              No generation jobs yet. Start from a completed session, an objective, or the button
              above.
            </p>
          )}
          {data.jobs.map((j) => (
            <button
              key={j.id}
              className={`generation-job ${selected === j.id ? 'selected' : ''}`}
              onClick={() => {
                setSelected(j.id);
                setConfirmRetry(null);
              }}
              aria-pressed={selected === j.id}
            >
              <strong>
                {['fetching', 'generating', 'validating'].includes(j.status) && (
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                )}
                {j.phase === j.status ? j.status : `${j.phase} · ${j.status}`}
              </strong>
              <span>{j.message}</span>
              <small>
                {Math.max(
                  0,
                  Math.floor(
                    (Date.parse(
                      ['completed', 'cancelled', 'failed', 'paused'].includes(j.status)
                        ? j.updatedAt
                        : new Date().toISOString(),
                    ) -
                      Date.parse(j.createdAt)) /
                      1000,
                  ),
                )}
                s since queued · {j.counts.accepted || 0} accepted · {j.counts.quarantined || 0}{' '}
                quarantined · {j.counts.rejected || 0} rejected
              </small>
              {j.nextRetryAt && (
                <small>Retry after {new Date(j.nextRetryAt).toLocaleTimeString()}</small>
              )}
            </button>
          ))}
        </section>
        <section className="panel stage2-panel">
          <h2>Job details</h2>
          {!detail ? (
            <p>Select a job to inspect its evidence and review.</p>
          ) : (
            <>
              <p role="status">
                {detail.status} · {detail.message}
              </p>
              <div className="generation-controls">
                {!['completed', 'cancelled', 'failed', 'paused'].includes(detail.status) && (
                  <button
                    disabled={busy || detail.pauseRequested}
                    onClick={() => run(() => api.generation.pause({ id: detail.id }))}
                  >
                    Pause
                  </button>
                )}
                {detail.status === 'paused' &&
                  !['unknown', 'incomplete'].includes(detail.reason) && (
                    <button
                      disabled={busy}
                      onClick={() => run(() => api.generation.resume({ id: detail.id }))}
                    >
                      Resume
                    </button>
                  )}
                {['paused', 'failed'].includes(detail.status) && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      ['unknown', 'incomplete'].includes(detail.reason)
                        ? setConfirmRetry(detail.id)
                        : run(() => api.generation.retry({ id: detail.id }))
                    }
                  >
                    Retry
                  </button>
                )}
                {!['completed', 'cancelled', 'failed'].includes(detail.status) && (
                  <button
                    className="danger-link"
                    disabled={busy}
                    onClick={() => run(() => api.generation.cancel({ id: detail.id }))}
                  >
                    Cancel job
                  </button>
                )}
              </div>
              {confirmRetry === detail.id && (
                <div role="alert">
                  <p>
                    The previous request may already have been billed. Retrying can create another
                    paid request.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api.generation.retry({ id: detail.id, confirm: true });
                        setConfirmRetry(null);
                      })
                    }
                  >
                    Confirm paid retry
                  </button>
                  <button onClick={() => setConfirmRetry(null)}>Keep paused</button>
                </div>
              )}
              <p>
                {detail.requests
                  .map(
                    (r) =>
                      `${r.operation}: ${r.status}, ${r.cost === null ? 'reserved ' + money(r.reserved) : money(r.cost)}`,
                  )
                  .join(' · ') || 'No paid requests yet.'}
              </p>
              {detail.candidates.map((c) => (
                <details key={c.id}>
                  <summary>
                    {c.question.title} · {c.status}
                  </summary>
                  <p>{c.question.prompt}</p>
                  <p>{c.findings.join(' ')}</p>
                  <GeneratedProvenance source={c.question.source} />
                  {c.status === 'accepted' && (
                    <button
                      className="danger-link"
                      onClick={() =>
                        run(async () => {
                          const issues = await api.report({
                            questionId: c.id,
                            version: c.question.version,
                            category: 'outdated-content',
                            note: 'Retired from generation review.',
                          });
                          const issue = issues.find(
                            (i) => i.question_id === c.id && i.status === 'pending',
                          );
                          if (issue)
                            await api.resolve({
                              id: issue.id,
                              status: 'retired',
                              note: 'Learner retired generated item.',
                            });
                        })
                      }
                    >
                      Retire from future practice
                    </button>
                  )}
                </details>
              ))}
              <details>
                <summary>Evidence and checkpoints</summary>
                {(detail.sources || []).map((s) => (
                  <blockquote key={s.id}>
                    <strong>
                      {s.id} · {s.title}
                    </strong>
                    <p>{s.excerpt}</p>
                  </blockquote>
                ))}
                <ol>
                  {detail.events.map((e, i) => (
                    <li key={i}>
                      {new Date(e.created_at).toLocaleTimeString()} · {e.message}
                    </li>
                  ))}
                </ol>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
