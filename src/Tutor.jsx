import { useState, useEffect, useCallback, useRef } from 'react';
const api = window.study;
const money = (n) => (typeof n === 'number' ? `$${n.toFixed(4)}` : 'Unknown');
export function TutorLink({ sessionId, questionId, mode = 'explain', draftId, disabled = false }) {
  return (
    <button
      className="text-link"
      disabled={disabled}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('open-tutor', { detail: { sessionId, questionId, mode, draftId } }),
        )
      }
    >
      {mode === 'hint' ? 'Ask for a hint' : 'Ask the tutor'}
    </button>
  );
}
export function ProviderSettings({ openTutor, parentBusy = false }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(''),
    [output, setOutput] = useState(4000),
    [model, setModel] = useState('gpt-5.6-terra'),
    [generationModel, setGenerationModel] = useState('gpt-5.6-sol'),
    [reviewModel, setReviewModel] = useState('gpt-6-astra'),
    [consent, setConsent] = useState(false);
  const refresh = useCallback(async () => {
    const d = await api.provider.status();
    setData(d);
    setLimit(d.dailyLimit ?? '');
    setOutput(d.maxOutputTokens);
    setModel(d.model);
    setGenerationModel(d.generationModel);
    setReviewModel(d.reviewModel);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(`${e.kind ? e.kind + ': ' : ''}${e.message}`);
    } finally {
      await refresh().catch(() => {});
      setBusy(false);
    }
  };
  const locked = busy || parentBusy || !data;
  const save = () =>
    api.provider.settings({
      dailyLimit: Number(limit),
      maxOutputTokens: Number(output),
      model,
      generationModel,
      reviewModel,
    });
  return (
    <section className="panel tutor-settings" aria-label="AI activation">
      <h2>{data?.enabled ? 'Your tutor is connected.' : 'Activate your tutor.'}</h2>
      {data?.enabled && (
        <button className="primary" onClick={openTutor}>
          Open study tutor
        </button>
      )}
      <p>
        Your question, included documentation, selected quiz or lab evidence and recent conversation
        turns are sent to OpenAI when you send a tutor message or request generation (including
        opted-in automatic generation). API billing is separate from ChatGPT. Conversations stay on
        this device. Provider abuse-monitoring retention can still apply with response storage
        disabled.
      </p>
      <p className="badge" role="status">
        {busy
          ? 'Checking connection…'
          : data?.enabled
            ? 'AI ACTIVE'
            : data?.validated
              ? 'MODEL ACCESS VALIDATED · AI INACTIVE'
              : 'AI INACTIVE · UNVERIFIED'}
      </p>
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <div className="tutor-settings-grid">
        <label>
          Tutoring model
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={locked}>
            {(data?.models || [{ id: 'gpt-5.6-terra' }]).map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        </label>
        <label>
          Generation model
          <select
            value={generationModel}
            onChange={(e) => setGenerationModel(e.target.value)}
            disabled={locked}
          >
            {(data?.models || []).map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        </label>
        <label>
          Independent review model
          <select
            value={reviewModel}
            onChange={(e) => setReviewModel(e.target.value)}
            disabled={locked}
          >
            {(data?.models || []).map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        </label>
        <label>
          Daily app limit (USD)
          <input
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="Choose a limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            disabled={locked}
          />
        </label>
        <label>
          Maximum output tokens
          <input
            type="number"
            min="256"
            max="16000"
            step="1"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            disabled={locked}
          />
        </label>
      </div>
      <p className="small-muted">
        Daily limits use UTC. Unknown usage remains reserved across days. Estimates include
        conservative cache-write allowance and are not your final provider bill.
      </p>
      <label className="tutor-consent">
        <input
          type="checkbox"
          disabled={locked}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I understand the context sharing and separate API charges, including a small activation
        test.
      </label>
      <div className="reader-row">
        <button className="secondary" disabled={locked || !limit} onClick={() => run(save)}>
          Save AI settings
        </button>
        <button
          className="secondary"
          disabled={locked || !data?.credentials.hasKey}
          onClick={() => run(() => api.provider.validate())}
        >
          Check model access
        </button>
        <button
          className="primary"
          disabled={locked || !limit || !consent || !data?.credentials.hasKey}
          onClick={() =>
            run(async () => {
              await save();
              await api.provider.activate({ consent: true });
            })
          }
        >
          Activate & test connection
        </button>
        <button className="danger-link" onClick={() => run(() => api.provider.disable())}>
          Disable AI / stop
        </button>
      </div>
      <p>
        Committed today: <strong>{money(data?.usage.committed)}</strong> ·{' '}
        {data?.usage.unknown || 0} requests with unknown usage.
      </p>
      <p className="small-muted">
        Generation: {data?.generationModel} · Review: {data?.reviewModel}. These roles are used by
        the generation queue. Removing or disabling the key stops new requests; already submitted
        work may still be billed.
      </p>
    </section>
  );
}
function Answer({ request, onCitation }) {
  const sources = request.context.sources || [];
  const parts = request.text.split(/(\[S\d+\])/g);
  const hasCitation = /\[S\d+\]/.test(request.text);
  return (
    <article className="tutor-answer">
      <h3>
        {request.context.mode === 'hint' ? 'Hint' : 'Explanation'}{' '}
        <span className="badge">{request.status}</span>
      </h3>
      <p className="small-muted">
        {request.status === 'historical' ? 'Imported history; billing was not transferred. ' : ''}
        {request.model} · {request.input_tokens ?? '?'} input / {request.output_tokens ?? '?'}{' '}
        output tokens ·{' '}
        {request.cost == null
          ? `Reserved ${money(request.reserved)} · usage unknown`
          : `Estimated ${money(request.cost)}`}
      </p>
      <div className="tutor-prose">
        {parts.map((part, i) => {
          const marker = part.match(/^\[(S\d+)\]$/)?.[1];
          return marker ? (
            sources.some((s) => s.citation === marker) ? (
              <button className="text-link" key={i} onClick={() => onCitation(request.id, marker)}>
                {part}
              </button>
            ) : (
              <span key={i} className="tutor-warning">
                {part} (unsupported reference)
              </span>
            )
          ) : (
            part
          );
        })}
      </div>
      {request.text && !hasCitation && request.status === 'completed' && (
        <p className="tutor-warning">
          No verified citation was included. Documentation claims in this response are not verified.
        </p>
      )}
      {request.error && <p role="status">{request.error}</p>}
      {request.context.lab && (
        <details>
          <summary>Lab context sent</summary>
          <pre className="context-excerpt">{JSON.stringify(request.context.lab, null, 2)}</pre>
        </details>
      )}
      <details>
        <summary>Evidence sent ({sources.length} excerpts)</summary>
        {sources.map((s) => (
          <div key={s.citation}>
            <button className="text-link" onClick={() => onCitation(request.id, s.citation)}>
              [{s.citation}] {s.title}
            </button>
            <p>
              {s.explicit ? 'Your reference' : 'Retrieved context'} · {s.status}
            </p>
          </div>
        ))}
      </details>
    </article>
  );
}
export default function Tutor({ initial = {} }) {
  const [list, setList] = useState([]),
    [c, setC] = useState(null),
    [body, setBody] = useState(''),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState(null),
    [confirm, setConfirm] = useState(false),
    [options, setOptions] = useState([]),
    [query, setQuery] = useState('');
  const saveQueue = useRef(Promise.resolve());
  const load = useCallback(async (id) => {
    setList(await api.tutor.list());
    if (id) {
      const d = await api.tutor.read({ id });
      setC(d);
      return d;
    }
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const entries = await api.tutor.list();
      if (!live) return;
      const selected = Object.keys(initial).length ? await api.tutor.create(initial) : entries[0];
      if (!live) return;
      setList(await api.tutor.list());
      if (selected) {
        const d = await api.tutor.read({ id: selected.id });
        if (live) {
          setC(d);
          setBody(d.body);
        }
      }
    })().catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, [initial]);
  const id = c?.id;
  useEffect(() => {
    if (!id) return;
    return api.tutor.subscribe(id, () => {
      load(id).catch((e) => setError(e.message));
    });
  }, [id, load]);
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const select = async (id) => {
    await saveQueue.current;
    const d = await load(id);
    setBody(d.body);
    setPreview(null);
    setSource(null);
    setConfirm(false);
  };
  const create = () =>
    run(async () => {
      const d = await api.tutor.create();
      await select(d.id);
    });
  const active = c?.requests.find((r) => ['reserved', 'submitted', 'streaming'].includes(r.status));
  const openCitation = (requestId, citation) =>
    run(async () => setSource(await api.tutor.citation({ requestId, citation })));
  return (
    <div className="page-enter tutor-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LEARN WITH EVIDENCE</div>
          <h1>Your study tutor.</h1>
          <p>Ask about a passage, work through a misconception, and follow the source.</p>
        </div>
        <button className="secondary" disabled={busy} onClick={create}>
          New conversation
        </button>
      </div>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      <p>
        Write a question, preview the included context, then send it to your tutor. AI activation is
        managed in Settings; saved conversations remain available without a key.
      </p>
      {!!list.length && (
        <label>
          Conversation
          <select
            value={c?.id || ''}
            disabled={busy}
            onChange={(e) => run(() => select(e.target.value))}
          >
            {list.map((x) => (
              <option value={x.id} key={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {!c && (
        <section className="panel tutor-empty">
          <h2>A question is a good place to start.</h2>
          <p>Create a conversation, or choose “Ask the tutor” in a documentation draft or quiz.</p>
        </section>
      )}
      {c && (
        <>
          <section aria-label="Conversation history">
            {c.requests.map((r) => (
              <div key={r.id}>
                <p className="tutor-question">{r.context.question}</p>
                <Answer request={r} onCitation={openCitation} />
                {!['completed', 'submitted', 'streaming', 'reserved'].includes(r.status) && (
                  <button
                    className="text-link"
                    disabled={busy || !!active}
                    onClick={() =>
                      run(async () => {
                        await api.tutor.retry({ id: c.id, requestId: r.id });
                        await select(c.id);
                      })
                    }
                  >
                    Prepare retry (new request)
                  </button>
                )}
              </div>
            ))}
          </section>
          {active && (
            <div className="reader-row" role="status">
              <span>Receiving answer… Partial text is saved.</span>
              <button
                className="secondary"
                onClick={() => run(() => api.tutor.cancel({ id: active.id }))}
              >
                Stop response
              </button>
            </div>
          )}
          {source && (
            <section className="panel tutor-source" aria-label="Cited source">
              <button className="text-link" onClick={() => setSource(null)}>
                Close source
              </button>
              <h2>
                [{source.citation}] {source.title}
              </h2>
              <p>
                {source.status} · Revision {source.revision?.slice(0, 12)}
              </p>
              <p className="small-muted">
                {source.url} · {source.sectionId}
              </p>
              <blockquote>{source.excerpt}</blockquote>
              <p>
                This is the retained excerpt supplied to the model. A valid reference identifies
                evidence; it does not guarantee the model’s interpretation.
              </p>
            </section>
          )}
          <section className="panel tutor-composer" aria-label="Tutor composer">
            {c.labAttemptId && (
              <section aria-label="Lab context sharing">
                <h2>Optional lab tutoring</h2>
                <p>
                  Linked to your saved lab version and execution method. Review the context before
                  sending to OpenAI. Your existing activation, daily spending limit and output limit
                  apply. Tutoring cannot change lab instructions, grade evidence or verify cleanup.
                </p>
                <p>
                  Notes, output and reflection are excluded by default. Select only what is needed,
                  then edit out secrets or unrelated details below. Prior conversation turns are not
                  sent for lab requests. Clear any private details from your question too.
                </p>
                {['notes', 'output', 'reflection'].map((field) => (
                  <div key={field}>
                    <label className="lab-share-toggle">
                      <input
                        type="checkbox"
                        disabled={busy || !!active}
                        checked={Object.hasOwn(c.labEvidence || {}, field)}
                        onChange={(e) =>
                          run(async () => {
                            const selected = Object.keys(c.labEvidence || {}).filter(
                              (k) => k !== field,
                            );
                            if (e.target.checked) selected.push(field);
                            await saveQueue.current;
                            await api.tutor.update({ id: c.id, labInclude: selected });
                            await load(c.id);
                            setPreview(null);
                          })
                        }
                      />
                      Include lab {field}
                    </label>
                    {Object.hasOwn(c.labEvidence || {}, field) && (
                      <label>
                        Shared {field} (editable copy)
                        <textarea
                          aria-label={`Shared lab ${field}`}
                          rows={3}
                          disabled={busy || !!active}
                          maxLength={field === 'output' ? 64000 : field === 'notes' ? 20000 : 4000}
                          value={c.labEvidence[field]}
                          onChange={(e) => {
                            const labEvidence = { ...c.labEvidence, [field]: e.target.value };
                            setC({ ...c, labEvidence });
                            setPreview(null);
                            saveQueue.current = saveQueue.current
                              .catch(() => {})
                              .then(() => api.tutor.update({ id: c.id, labEvidence }))
                              .catch((err) =>
                                setError('Evidence copy save failed: ' + err.message),
                              );
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </section>
            )}
            <label>
              Response style
              <select
                disabled={busy || !!active}
                value={c.mode}
                onChange={(e) =>
                  run(async () => {
                    await api.tutor.update({ id: c.id, mode: e.target.value });
                    await load(c.id);
                    setPreview(null);
                  })
                }
              >
                <option value="explain">Explanation</option>
                <option value="hint">Conceptual hint</option>
              </select>
            </label>
            <label>
              Your question
              <textarea
                aria-label="Your question"
                rows="4"
                maxLength={20000}
                value={body}
                disabled={!!active}
                onChange={(e) => {
                  const value = e.target.value;
                  setBody(value);
                  setPreview(null);
                  saveQueue.current = saveQueue.current
                    .catch(() => {})
                    .then(() => api.tutor.update({ id: c.id, body: value }))
                    .catch((err) => setError('Draft save failed: ' + err.message));
                }}
              />
            </label>
            <div className="reference-chips">
              {c.references.map((r, i) => (
                <button
                  className="reference-chip"
                  disabled={busy || !!active}
                  key={i}
                  onClick={() =>
                    run(async () => {
                      await api.tutor.update({ id: c.id, removeIndex: i });
                      await load(c.id);
                      setPreview(null);
                    })
                  }
                >
                  @{r.title} · Remove
                </button>
              ))}
            </div>
            <div className="reader-row">
              <label>
                Add @ reference
                <input value={query} maxLength={200} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <button
                className="secondary"
                disabled={busy || !!active}
                onClick={() => run(async () => setOptions(await api.reader.picker({ query })))}
              >
                Find references
              </button>
            </div>
            {!!options.length && (
              <ul className="tutor-picker">
                {options.slice(0, 20).map((o) => (
                  <li key={o.key}>
                    <button
                      className="text-link"
                      disabled={busy || !!active}
                      onClick={() =>
                        run(async () => {
                          await api.tutor.update({ id: c.id, reference: o.reference });
                          await load(c.id);
                          setOptions([]);
                          setPreview(null);
                        })
                      }
                    >
                      {o.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="reader-row">
              <button
                className={preview ? 'secondary' : 'primary'}
                disabled={busy || !!active || !body.trim()}
                onClick={() =>
                  run(async () => {
                    await saveQueue.current;
                    await api.tutor.update({
                      id: c.id,
                      body,
                      ...(c.labAttemptId ? { labEvidence: c.labEvidence || {} } : {}),
                    });
                    setPreview(await api.tutor.preview({ id: c.id }));
                  })
                }
              >
                Preview context
              </button>
              {preview && (
                <button
                  className="primary"
                  disabled={busy || !!active}
                  onClick={() =>
                    run(async () => {
                      await api.tutor.send({
                        previewId: preview.id,
                        requestId: crypto.randomUUID(),
                      });
                      setBody('');
                      setPreview(null);
                      await load(c.id);
                    })
                  }
                >
                  Send to tutor
                </button>
              )}
              <span role="status">
                {busy
                  ? 'Preparing context…'
                  : active
                    ? 'An answer is in progress.'
                    : preview
                      ? 'Step 2 of 2: review the context below, then Send to tutor.'
                      : body.trim()
                        ? 'Step 1 of 2: select Preview context to review what will be sent. No AI request is made yet.'
                        : 'Write your question, then select Preview context.'}
              </span>
            </div>
            {preview && (
              <details open>
                <summary>
                  Context preview · upper bound {preview.inputBound.toLocaleString()} tokens
                </summary>
                {preview.warnings.map((w, i) => (
                  <p className="tutor-warning" key={i}>
                    {w}
                  </p>
                ))}
                {preview.lab && (
                  <>
                    <h3>Lab context to be sent</h3>
                    <pre className="context-excerpt">{JSON.stringify(preview.lab, null, 2)}</pre>
                  </>
                )}
                {preview.quiz && (
                  <pre className="context-excerpt">{JSON.stringify(preview.quiz, null, 2)}</pre>
                )}
                {preview.sources.map((s) => (
                  <div key={s.citation}>
                    <h3>
                      [{s.citation}] {s.title}
                    </h3>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        run(async () =>
                          setPreview(
                            await api.tutor.exclude({
                              previewId: preview.id,
                              citation: s.citation,
                            }),
                          ),
                        )
                      }
                    >
                      Exclude this excerpt
                    </button>
                    <p>
                      {s.explicit ? 'Your reference' : 'Retrieved context'} · {s.status}
                    </p>
                    <blockquote>{s.excerpt}</blockquote>
                  </div>
                ))}
                <details>
                  <summary>Recent conversation included</summary>
                  <pre className="context-excerpt">
                    {JSON.stringify(preview.input.slice(0, -1), null, 2)}
                  </pre>
                </details>
              </details>
            )}
          </section>
          <p className="small-muted">
            Conversation estimated cost:{' '}
            {money(c.requests.reduce((sum, r) => sum + (r.cost ?? r.reserved), 0))}, including
            reservations for unknown usage.
          </p>
          <button
            className="danger-link"
            disabled={busy || !!active}
            onClick={() => setConfirm(true)}
          >
            Delete conversation…
          </button>
          {confirm && (
            <div className="panel tutor-source">
              <p>
                Delete this conversation, its drafts and retained evidence? Billing totals remain
                without the conversation content.
              </p>
              <button className="secondary" onClick={() => setConfirm(false)}>
                Keep conversation
              </button>
              <button
                className="danger-link"
                onClick={() =>
                  run(async () => {
                    await api.tutor.remove({ id: c.id, confirm: true });
                    setC(null);
                    setConfirm(false);
                    await load();
                  })
                }
              >
                Confirm conversation deletion
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
