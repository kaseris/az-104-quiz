import { useEffect, useRef, useState } from 'react';
const api = window.study?.labs;
export default function LabEvidence({ attempt, busy, onSnapshot, onPending, complete, awaiting }) {
  const [draft, setDraft] = useState(attempt.evidence);
  const [cleanup, setCleanup] = useState({
    status: attempt.cleanup.status,
    note: attempt.cleanup.note,
  });
  const [reflection, setReflection] = useState({
    answer: attempt.reflection.answer,
    assessment: attempt.reflection.assessment,
  });
  const dirtyReflection =
    reflection.answer !== attempt.reflection.answer ||
    reflection.assessment !== attempt.reflection.assessment;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const latest = useRef(attempt.evidence);
  const sequence = useRef(0);
  const chain = useRef(Promise.resolve());
  const mounted = useRef(true);
  const failed = useRef(null);
  const navigationBlocked = useRef(false);
  const completed = attempt.status === 'completed';
  const dirtyCleanup =
    cleanup.status !== attempt.cleanup.status || cleanup.note !== attempt.cleanup.note;
  navigationBlocked.current = pending || !!error || dirtyCleanup || dirtyReflection;
  useEffect(() => {
    mounted.current = true;
    const guard = (event) => {
      if (navigationBlocked.current) {
        event.preventDefault();
        setNotice('Save or retry your changes before leaving this attempt.');
      }
    };
    window.addEventListener('study:before-navigate', guard);
    return () => {
      mounted.current = false;
      window.removeEventListener('study:before-navigate', guard);
    };
  }, []);
  function enqueue(kind, value) {
    const n = ++sequence.current;
    setPending(true);
    onPending(true);
    setError('');
    setNotice('Saving locally…');
    // Keep writes ordered while allowing continued typing. Each evidence write contains the full draft.
    chain.current = chain.current
      .catch(() => {})
      .then(() => api[kind]({ id: attempt.id, ...value }))
      .then((result) => {
        if (!mounted.current) return;
        onSnapshot(result);
        if (n === sequence.current) {
          failed.current = null;
          setPending(false);
          onPending(false);
          setError('');
          setNotice('Saved on this device');
        }
      })
      .catch((e) => {
        if (!mounted.current || n !== sequence.current) return;
        failed.current = { kind, value };
        setPending(false);
        onPending(false);
        setError(e.message);
        setNotice('Not saved. Your text remains here; retry before leaving.');
      });
  }
  function change(field, value) {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    setDraft(next);
    enqueue('evidence', next);
  }
  const checklistReady = draft.checklist.length === attempt.lab.evidenceChecklist.length;
  return (
    <section className="panel lab-panel lab-evidence" aria-label="Lab evidence and completion">
      <h2>Your evidence</h2>
      <p>
        Saved locally as you type. Nothing here is sent to AI. Remove credentials, tokens and
        unrelated information before pasting output.
      </p>
      <p role="status">
        {notice ||
          (completed
            ? 'Completed learning record · self-reported'
            : 'Your saved evidence is ready.')}
      </p>
      {error && (
        <div role="alert" className="error-notice">
          <span>{error}</span>
          <button
            className="secondary"
            disabled={pending}
            onClick={() =>
              enqueue(
                failed.current.kind,
                failed.current.kind === 'evidence' ? latest.current : failed.current.value,
              )
            }
          >
            Retry evidence save
          </button>
          <button
            className="secondary"
            disabled={pending}
            onClick={() => {
              latest.current = attempt.evidence;
              setDraft(attempt.evidence);
              setCleanup({ status: attempt.cleanup.status, note: attempt.cleanup.note });
              setReflection({
                answer: attempt.reflection.answer,
                assessment: attempt.reflection.assessment,
              });
              failed.current = null;
              setError('');
              setNotice('Unsaved edits discarded; your saved record is retained.');
            }}
          >
            Discard unsaved edits
          </button>
        </div>
      )}
      <fieldset disabled={busy || completed} className="lab-controls">
        <legend>Completion checklist</legend>
        {attempt.lab.evidenceChecklist.map((item, index) => (
          <label className="check-line" key={index}>
            <input
              type="checkbox"
              checked={draft.checklist.includes(index)}
              onChange={(e) =>
                change(
                  'checklist',
                  e.target.checked
                    ? [...draft.checklist, index]
                    : draft.checklist.filter((n) => n !== index),
                )
              }
            />
            {item}
          </label>
        ))}
        <label>
          Lab notes
          <textarea
            aria-label="Lab notes"
            rows={4}
            maxLength={20000}
            value={draft.notes}
            onChange={(e) => change('notes', e.target.value)}
          />
        </label>
        <label>
          Pasted command output
          <textarea
            aria-label="Pasted command output"
            rows={5}
            maxLength={64000}
            value={draft.output}
            onChange={(e) => change('output', e.target.value)}
          />
        </label>
        <label>
          Problem encountered
          <select
            aria-label="Problem encountered"
            value={draft.problemKind}
            onChange={(e) => change('problemKind', e.target.value)}
          >
            <option value="none">No problem recorded</option>
            <option value="environment">Environment, permissions or policy</option>
            <option value="conceptual">Understanding or configuration mistake</option>
          </select>
        </label>
      </fieldset>
      <p className="lab-meta">
        Help used: {attempt.progress.hintsRevealed} of {attempt.lab.hints.length} hints ·{' '}
        {attempt.progress.walkthroughRevealedAt
          ? 'Walkthrough revealed'
          : 'Walkthrough not revealed'}
        . Quiz accuracy is unaffected.
      </p>
      {completed ? (
        <p>
          <strong>Completed · self-reported</strong>
          <br />
          This learning record is locked. Start another attempt to practice again. Cleanup can still
          be updated below.
        </p>
      ) : (
        <div className="lab-toolbar">
          <button
            className="secondary"
            disabled={
              busy ||
              pending ||
              !!error ||
              dirtyCleanup ||
              dirtyReflection ||
              attempt.status === 'awaiting_evidence'
            }
            onClick={awaiting}
          >
            Awaiting evidence
          </button>
          <button
            className="primary"
            disabled={
              busy || pending || !!error || dirtyCleanup || dirtyReflection || !checklistReady
            }
            onClick={complete}
          >
            Complete as self-reported
          </button>
          <p>
            Complete the checklist first. Completion locks your evidence and help history; it does
            not verify Azure resources or mark cleanup done.
          </p>
        </div>
      )}
      <hr />
      <h2>Reflection</h2>
      <p>{attempt.lab.reflection.prompt}</p>
      <p className="lab-meta">
        Your own assessment, saved only on this device. Reflection may be updated after completion;
        it does not change completed evidence, quiz accuracy or verify Azure.
      </p>
      <fieldset className="lab-controls" disabled={busy || pending}>
        <label>
          Your reflection
          <textarea
            aria-label="Your reflection"
            rows={4}
            maxLength={4000}
            value={reflection.answer}
            onChange={(e) => setReflection({ ...reflection, answer: e.target.value })}
          />
        </label>
        <label>
          Reflection self-assessment
          <select
            aria-label="Reflection self-assessment"
            value={reflection.assessment}
            onChange={(e) => setReflection({ ...reflection, assessment: e.target.value })}
          >
            <option value="unanswered">Not assessed</option>
            <option value="needs_review">I need more practice</option>
            <option value="understood">I can explain it</option>
          </select>
        </label>
        <div className="lab-toolbar">
          <button
            className="secondary"
            disabled={!dirtyReflection || !!error}
            onClick={() => enqueue('reflection', { action: 'save', ...reflection })}
          >
            Save reflection
          </button>
          {dirtyReflection && (
            <>
              <span role="status">Unsaved reflection changes</span>
              <button
                className="text-link"
                onClick={() =>
                  setReflection({
                    answer: attempt.reflection.answer,
                    assessment: attempt.reflection.assessment,
                  })
                }
              >
                Discard reflection changes
              </button>
            </>
          )}
          {!attempt.reflection.comparedAt && (
            <button
              className="secondary"
              disabled={dirtyReflection || !!error}
              onClick={() => enqueue('reflection', { action: 'compare' })}
            >
              Compare with suggested answer
            </button>
          )}
        </div>
      </fieldset>
      {attempt.reflection.savedAt && (
        <p className="lab-meta">
          Reflection saved {new Date(attempt.reflection.savedAt).toLocaleString()}
        </p>
      )}
      {attempt.reflection.comparedAt && (
        <div className="lab-text">
          <h3>Suggested answer</h3>
          {attempt.lab.reflection.expectedAnswer}
          <p className="lab-meta">
            Comparison opened {new Date(attempt.reflection.comparedAt).toLocaleString()}. This
            records exposure, not a grade.
          </p>
        </div>
      )}
      <hr />
      <h2>Cleanup status</h2>
      <p>
        <strong>
          {attempt.cleanup.status === 'completed'
            ? 'Cleanup completed · self-reported'
            : 'Cleanup pending'}
        </strong>
      </p>
      <p>
        Follow the Cleanup instructions above. Learning completion does not stop charges or remove
        resources.
      </p>
      <fieldset className="lab-controls" disabled={busy || pending}>
        <label>
          Resource cleanup
          <select
            aria-label="Resource cleanup"
            value={cleanup.status}
            onChange={(e) => setCleanup({ ...cleanup, status: e.target.value })}
          >
            <option value="pending">Pending — resources remain, are kept, or are unchecked</option>
            <option value="completed">
              Completed — I confirmed no lab resources remain (or none were created)
            </option>
          </select>
        </label>
        <label>
          Cleanup note
          <textarea
            aria-label="Cleanup note"
            maxLength={4000}
            rows={2}
            value={cleanup.note}
            onChange={(e) => setCleanup({ ...cleanup, note: e.target.value })}
          />
        </label>
        <button
          className="secondary"
          disabled={!dirtyCleanup || !!error}
          onClick={() => enqueue('cleanup', cleanup)}
        >
          Save cleanup status
        </button>
        {dirtyCleanup && (
          <>
            <span role="status"> Unsaved cleanup changes</span>
            <button
              className="text-link"
              onClick={() =>
                setCleanup({ status: attempt.cleanup.status, note: attempt.cleanup.note })
              }
            >
              Discard cleanup changes
            </button>
          </>
        )}
      </fieldset>
      {!!attempt.cleanup.history.length && (
        <details>
          <summary>Cleanup changes ({attempt.cleanup.history.length})</summary>
          <ul>
            {attempt.cleanup.history.map((entry, i) => (
              <li key={i}>
                {entry.at} · {entry.status === 'completed' ? 'Completed' : 'Pending'}
                {entry.note && <p className="lab-text">{entry.note}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
