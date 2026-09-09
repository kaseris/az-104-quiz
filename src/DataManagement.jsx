import { useState } from 'react';
const api = window.study;
export default function DataManagement() {
  const [chats, setChats] = useState(false),
    [labEvidence, setLabEvidence] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null),
    [exportPreview, setExportPreview] = useState(null),
    [diagnostics, setDiagnostics] = useState(null);
  const [confirm, setConfirm] = useState(false),
    [erase, setErase] = useState(''),
    [attempts, setAttempts] = useState([]),
    [attempt, setAttempt] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const options = { chats, labEvidence };
  return (
    <section className="panel settings-panel data-management" aria-labelledby="data-title">
      <h2 id="data-title">Data management</h2>
      <p>
        Your study data stays on this device. Backup, import and deletion disable AI and automatic
        generation. Finish active requests first; reactivate AI explicitly afterward.
      </p>
      {error && <p role="alert">{error}</p>}
      <p role="status">{busy ? 'Working…' : message}</p>
      <fieldset disabled={busy}>
        <legend>Backup and portable export</legend>
        <p>
          Recovery backups contain the complete database, including personal content and spending
          records, but no stored API key. Keep them private. Restore only while the app is closed.
        </p>
        <button
          onClick={() =>
            run(async () => {
              const r = await api.data.backup();
              setMessage(r.saved ? 'Recovery backup saved.' : 'Backup cancelled.');
            })
          }
        >
          Save recovery backup
        </button>
        <p>
          Portable exports preserve study records and snapshots. AI settings, billing, jobs,
          credentials and document cache are excluded. Text you wrote may contain sensitive
          information.
        </p>
        <label>
          <input
            type="checkbox"
            checked={chats}
            onChange={(e) => {
              setChats(e.target.checked);
              setExportPreview(null);
            }}
          />{' '}
          Include conversations (may quote personal lab evidence)
        </label>
        <label>
          <input
            type="checkbox"
            checked={labEvidence}
            onChange={(e) => {
              setLabEvidence(e.target.checked);
              setExportPreview(null);
            }}
          />{' '}
          Include personal lab notes, command output and reflection text
        </label>
        <button
          onClick={() => run(async () => setExportPreview(await api.data.exportPreview(options)))}
        >
          Preview export
        </button>
        {exportPreview && (
          <>
            <pre className="context-excerpt">{JSON.stringify(exportPreview, null, 2)}</pre>
            <button
              onClick={() =>
                run(async () => {
                  const r = await api.data.exportSave(options);
                  setMessage(r.saved ? 'Portable export saved.' : 'Export cancelled.');
                })
              }
            >
              Save portable export
            </button>
          </>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Import study data</legend>
        <p>
          Add new records, skip identical records, and block conflicting identities. No existing
          history is overwritten. A recovery backup is created before applying changes. Maximum file
          size: 256 MiB.
        </p>
        <button
          onClick={() =>
            run(async () => {
              setConfirm(false);
              setPreview(null);
              const r = await api.data.importPreview();
              if (!r.cancelled) setPreview(r);
            })
          }
        >
          Choose export to preview
        </button>
        {preview && (
          <>
            <pre className="context-excerpt">
              {JSON.stringify({ counts: preview.counts, conflicts: preview.conflicts }, null, 2)}
            </pre>
            <p>
              {preview.canApply
                ? 'This import can be merged.'
                : `${preview.conflictCount} conflicts. Resolve them before importing.`}
            </p>
            <label>
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />{' '}
              I reviewed the additive merge and recovery backup policy
            </label>
            <button
              disabled={!preview.canApply || !confirm}
              onClick={() =>
                run(async () => {
                  await api.data.importApply({ token: preview.token, confirmed: true });
                  setPreview(null);
                  setMessage(
                    'Import complete. Reopen the app to refresh every view; imported work cannot make paid requests.',
                  );
                })
              }
            >
              Apply import
            </button>
          </>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Delete selected data</legend>
        <p>
          Clear cached articles in Documentation; delete individual conversations in Study tutor.
          Those controls preserve quiz history. Erased content may remain in recovery backups until
          you remove those files yourself.
        </p>
        <button
          onClick={() =>
            run(async () => {
              const r = await api.labs.list();
              setAttempts(r.attempts);
              setErase('labEvidence');
              setConfirm(false);
            })
          }
        >
          Remove personal lab evidence
        </button>
        <button
          onClick={() => {
            setErase('study');
            setConfirm(false);
          }}
        >
          Reset study data
        </button>
        {erase && (
          <div role="group" aria-label="Confirm deletion">
            {erase === 'labEvidence' ? (
              <>
                <label htmlFor="erase-attempt">Lab attempt</label>
                <select
                  id="erase-attempt"
                  value={attempt}
                  onChange={(e) => setAttempt(e.target.value)}
                >
                  <option value="">Choose an attempt</option>
                  {attempts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} · {a.startedAt}
                    </option>
                  ))}
                </select>
                <p>
                  Removes personal notes, output, reflection and cleanup notes. Keeps the attempt,
                  checklist, completion and cleanup status. Copies sent in chats must be deleted
                  separately.
                </p>
              </>
            ) : (
              <p>
                Removes quizzes, custom questions, issues, annotations, drafts, conversations,
                generation history and lab attempts. Keeps cached documents, credentials,
                preferences, and spending reservations. Azure resources are unaffected.
              </p>
            )}
            <label>
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />{' '}
              I understand this deletion and the recovery backup
            </label>
            <button
              disabled={!confirm || (erase === 'labEvidence' && !attempt)}
              onClick={() =>
                run(async () => {
                  await api.data.erase({ kind: erase, id: attempt, confirmed: true });
                  setErase('');
                  setMessage(
                    'Deletion complete. Reopen the app to refresh every view. Recovery backups retain their previous content.',
                  );
                })
              }
            >
              Confirm deletion
            </button>
            <button onClick={() => setErase('')}>Cancel</button>
          </div>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Local diagnostics</legend>
        <p>
          Inspect versions and storage counts before saving. No prompts, history text, credentials
          or telemetry are included.
        </p>
        <button onClick={() => run(async () => setDiagnostics(await api.data.diagnostics()))}>
          Inspect diagnostics
        </button>
        {diagnostics && (
          <>
            <pre className="context-excerpt">{JSON.stringify(diagnostics, null, 2)}</pre>
            <button
              onClick={() =>
                run(async () => {
                  const r = await api.data.diagnosticsSave();
                  setMessage(
                    r.saved ? 'Diagnostics saved. Nothing was uploaded.' : 'Save cancelled.',
                  );
                })
              }
            >
              Save diagnostics
            </button>
          </>
        )}
      </fieldset>
    </section>
  );
}
