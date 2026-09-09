import { useEffect, useRef, useState } from 'react';
const api = window.study;
export default function LabAdaptations({ attempt }) {
  const [expanded, setExpanded] = useState(false),
    [jobs, setJobs] = useState([]),
    [style, setStyle] = useState('beginner');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(null);
  const [confirmRetry, setConfirmRetry] = useState(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    const load = () =>
      api.labAdaptations
        .list({ attemptId: attempt.id })
        .then((rows) => {
          if (live.current) setJobs(rows);
        })
        .catch((e) => {
          if (live.current) setError(e.message);
        });
    load();
    const timer = setInterval(load, 1500);
    return () => {
      live.current = false;
      clearInterval(timer);
    };
  }, [attempt.id]);
  async function run(work) {
    setBusy(true);
    setError('');
    try {
      await work();
      const rows = await api.labAdaptations.list({ attemptId: attempt.id });
      if (live.current) setJobs(rows);
    } catch (e) {
      if (live.current) setError(e.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <section className="panel lab-panel" aria-label="Optional lab adaptations">
      <h2>Optional adapted guidance</h2>
      <p>
        Tailor explanations, hints and reflection to your learning style. Your saved objective,
        Azure steps, resources and cleanup stay fixed. Generation and independent AI review use your
        existing spending limit. This is AI-reviewed guidance, not Azure verification.
      </p>
      <button className="secondary" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide adaptation request' : 'Prepare an adaptation'}
      </button>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {expanded && (
        <fieldset className="lab-controls" disabled={busy}>
          <label>
            Learning style{' '}
            <select
              aria-label="Adaptation learning style"
              value={style}
              onChange={(e) => {
                setStyle(e.target.value);
                setPreview(null);
              }}
            >
              <option value="beginner">Beginner explanation</option>
              <option value="concise">Concise refresher</option>
              <option value="challenge">More challenging reflection</option>
            </select>
          </label>
          <p>
            No notes, pasted output, reflection responses, quiz results or previous conversations
            are shared. The preview contains only the frozen exercise, your chosen style and
            approved documentation excerpts. Preparing it may retrieve documentation; it makes no AI
            request.
          </p>
          <button
            className="secondary"
            onClick={() =>
              run(async () =>
                setPreview(await api.labAdaptations.preview({ attemptId: attempt.id, style })),
              )
            }
          >
            Preview adaptation context
          </button>
          {preview && (
            <div>
              <h3>Review before queueing</h3>
              <p>
                Two paid passes: {preview.settings.generationModel} generates;{' '}
                {preview.settings.reviewModel} reviews. Maximum output:{' '}
                {preview.settings.maxOutputTokens} tokens per pass. The queue reserves allowance for
                both and pauses if the remaining budget is insufficient.
              </p>
              <details>
                <summary>Frozen exercise and style to send</summary>
                <pre className="lab-command">
                  {JSON.stringify({ style: preview.style, exercise: preview.base }, null, 2)}
                </pre>
              </details>
              {preview.sources.map((s) => (
                <details key={s.id}>
                  <summary>
                    [{s.id}] {s.title}
                  </summary>
                  <p>
                    {s.url} · Retrieved {s.fetchedAt}
                  </p>
                  <blockquote>{s.excerpt}</blockquote>
                </details>
              ))}
              <button
                className="primary"
                onClick={() =>
                  run(async () => {
                    await api.labAdaptations.create({ id: preview.id, confirm: true });
                    setPreview(null);
                    setExpanded(false);
                  })
                }
              >
                Queue paid adaptation and review
              </button>
            </div>
          )}
        </fieldset>
      )}
      {busy && <p role="status">Saving or retrieving documentation…</p>}
      {jobs
        .filter((j) => j.phase !== 'preview')
        .map((j) => (
          <article className="lab-card" key={j.id}>
            <h3>
              {j.style} guidance · {j.status}
            </h3>
            <p role="status">{j.message}</p>
            <p className="lab-meta">
              Created {new Date(j.createdAt).toLocaleString()} · {j.base.method} · Exercise version{' '}
              {j.base.version}
            </p>
            {!['completed', 'cancelled', 'failed', 'paused'].includes(j.status) && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => run(() => api.generation.pause({ id: j.id }))}
              >
                Pause adaptation
              </button>
            )}
            {j.status === 'paused' &&
              !['unknown', 'incomplete', 'validation'].includes(j.reason) && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => run(() => api.generation.resume({ id: j.id }))}
                >
                  Resume adaptation
                </button>
              )}
            {(j.status === 'failed' ||
              (j.status === 'paused' &&
                ['unknown', 'incomplete', 'validation'].includes(j.reason))) && (
              <button className="secondary" disabled={busy} onClick={() => setConfirmRetry(j.id)}>
                Review retry
              </button>
            )}
            {confirmRetry === j.id && (
              <div>
                <p>
                  The earlier request may already have been billed. A retry may incur another
                  charge; unknown usage stays reserved.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api.generation.retry({ id: j.id, confirm: true });
                      setConfirmRetry(null);
                    })
                  }
                >
                  Confirm paid retry
                </button>
                <button className="text-link" onClick={() => setConfirmRetry(null)}>
                  Keep paused
                </button>
              </div>
            )}
            {!['completed', 'cancelled'].includes(j.status) && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => run(() => api.generation.cancel({ id: j.id }))}
              >
                Cancel adaptation
              </button>
            )}
            {j.review && (
              <p>
                <strong>Independent AI review: {j.verdict || 'pending'}</strong> · {j.review.reason}
              </p>
            )}
            {j.verdict === 'accepted' && !j.openedAt && !j.dismissedAt && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => run(() => api.labAdaptations.open({ id: j.id }))}
              >
                Open reviewed guidance
              </button>
            )}
            {j.status === 'completed' && !j.dismissedAt && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => run(() => api.labAdaptations.dismiss({ id: j.id }))}
              >
                Dismiss adaptation
              </button>
            )}
            {j.dismissedAt && <p>Dismissed; the original exercise remains available.</p>}
            {j.candidate && (
              <div>
                <p className="badge">
                  AI-generated · independently AI-reviewed · not Azure-verified
                </p>
                <p className="lab-text">{j.candidate.explanation}</p>
                {j.candidate.hints.map((hint, i) => (
                  <details key={i}>
                    <summary>Adapted hint {i + 1}</summary>
                    <p>{hint}</p>
                  </details>
                ))}
                <h4>Adapted reflection</h4>
                <p>{j.candidate.reflectionPrompt}</p>
                <details>
                  <summary>Suggested reflection answer</summary>
                  <p>{j.candidate.reflectionAnswer}</p>
                </details>
                <details>
                  <summary>Sources and review provenance</summary>
                  <p>
                    Generated by {j.settings.generationModel}; reviewed by {j.settings.reviewModel}{' '}
                    at {j.reviewedAt}. {j.settings.promptVersion}. Opened {j.openedAt}. Automated
                    review can miss errors; use the unchanged original walkthrough for every Azure
                    action.
                  </p>
                  {j.sources.map((s) => (
                    <div key={s.id}>
                      <strong>
                        [{s.id}] {s.title}
                      </strong>
                      <p>
                        {s.url} · {s.revision} · Retrieved {s.fetchedAt}
                      </p>
                      <blockquote>{s.excerpt}</blockquote>
                      <p>
                        {s.attribution} · {s.license}
                      </p>
                    </div>
                  ))}
                </details>
              </div>
            )}
          </article>
        ))}
    </section>
  );
}
