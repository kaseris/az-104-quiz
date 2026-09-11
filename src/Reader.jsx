import Select from './Select.jsx';
import { createPortal } from 'react-dom';
import { TutorLink } from './Tutor.jsx';
import { createElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Highlighter,
  Search,
  ExternalLink,
  X,
  RefreshCw,
  FileText,
} from 'lucide-react';
const api = window.study.reader;
const normalized = (s) => s.replace(/\s+/g, ' ').trim();
const date = (s) => (s ? new Date(s).toLocaleString() : 'Never');
export function ReaderLink({
  url = '',
  skillId = '',
  objectiveId = '',
  children = 'Read related documentation',
}) {
  return (
    <button
      className="text-link"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('open-reader', { detail: { url, skillId, objectiveId } }),
        )
      }
    >
      <BookOpen size={14} aria-hidden="true" />
      {children}
    </button>
  );
}
function Nodes({ nodes, openLink }) {
  return nodes.map((node, index) => {
    if (typeof node === 'string') return node;
    const contents = <Nodes nodes={node.children || []} openLink={openLink} />;
    if (node.tag === 'a')
      return (
        <a
          key={index}
          href={node.href}
          onClick={(e) => {
            e.preventDefault();
            openLink(node.href);
          }}
        >
          {contents}
        </a>
      );
    if (node.tag === 'table')
      return (
        <div
          key={index}
          className="reader-table"
          tabIndex={0}
          role="region"
          aria-label="Scrollable article table"
        >
          <table>{contents}</table>
        </div>
      );
    const props = { key: index };
    if (node.tag === 'pre') {
      props.tabIndex = 0;
      props.role = 'region';
      props['aria-label'] = 'Scrollable code block';
    }
    if (node.colspan) props.colSpan = node.colspan;
    if (node.rowspan) props.rowSpan = node.rowspan;
    if (node.start) props.start = node.start;
    return createElement(node.tag, props, ['br', 'hr'].includes(node.tag) ? undefined : contents);
  });
}
function DraftEditor({ draft, refresh, run, data }) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState('Saved on this device');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [options, setOptions] = useState([]);
  const [pickerError, setPickerError] = useState('');
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const queue = useRef(Promise.resolve());
  const latest = useRef({ title: draft.title, body: draft.body });
  const pending = useRef(0);
  const save = (patch) => {
    latest.current = { ...latest.current, ...patch };
    const snapshot = { ...latest.current };
    setStatus('Saving…');
    setSaving(true);
    pending.current++;
    queue.current = queue.current
      .catch(() => {})
      .then(() => api.saveDraft({ id: draft.id, ...snapshot }))
      .then(() => {
        if (pending.current === 1) setStatus('Saved on this device');
      })
      .catch((error) => setStatus(`Save failed: ${error.message}`))
      .finally(() => {
        pending.current--;
        if (!pending.current) setSaving(false);
      });
  };
  useEffect(() => {
    if (!picking) return;
    let alive = true;
    api
      .picker({ query })
      .then((list) => {
        if (alive) {
          setOptions(list);
          setIndex(0);
          setPickerError('');
        }
      })
      .catch((e) => {
        if (alive) setPickerError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [picking, query, data]);
  async function add(option) {
    await run(async () => {
      await queue.current;
      await api.draftReference({ id: draft.id, reference: option.reference });
      await refresh();
    });
    setPicking(false);
  }
  return (
    <section className="reader-draft panel" aria-label="Tutor question draft">
      <div className="reader-row">
        <h2>Question draft</h2>
        <TutorLink draftId={draft.id} disabled={saving} />
        <span className="badge">Local draft · ready for tutoring</span>
      </div>
      <p>
        Your question and references stay on this device until you preview and send them in the
        tutor.
      </p>
      <label>
        Draft title
        <input
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value);
            save({ title: e.target.value });
          }}
        />
      </label>
      <label>
        Question
        <textarea
          rows={5}
          aria-label="Question"
          value={body}
          maxLength={20000}
          aria-controls={picking ? 'reference-picker' : undefined}
          onChange={(e) => {
            const value = e.target.value;
            setBody(value);
            save({ body: value });
            const match = value.slice(0, e.target.selectionStart).match(/(?:^|\s)@([^@\n]*)$/);
            setPicking(!!match);
            if (match) setQuery(match[1]);
          }}
          onKeyDown={(e) => {
            if (!picking) return;
            if (e.key === 'Escape') setPicking(false);
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIndex((i) => Math.min(options.length - 1, i + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === 'Enter' && options[index]) {
              e.preventDefault();
              add(options[index]);
            }
          }}
        />
      </label>
      <div className="reader-row">
        <span role="status">{status}</span>
        {status.startsWith('Save failed') && <button onClick={() => save({})}>Retry save</button>}
        <button
          aria-expanded={picking}
          aria-controls={picking ? 'reference-picker' : undefined}
          onClick={() => {
            setPicking(!picking);
            setQuery('');
          }}
        >
          @ Add reference
        </button>
      </div>
      {picking && (
        <div className="reference-picker" id="reference-picker" aria-label="Reference picker">
          <label>
            Find a domain, document, heading, or highlight
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <p className="reader-small">
            Headings and document references require cached content. Use arrow keys and Enter from
            the question, or Tab to a result.
          </p>
          {pickerError && <p role="alert">{pickerError}</p>}
          {!options.length && !pickerError && (
            <p>No matching cached references. Retrieve an article or choose a domain.</p>
          )}
          {options.map((option, i) => (
            <button
              key={option.key}
              className={i === index ? 'picker-active' : ''}
              onClick={() => add(option)}
            >
              {option.title}
              <small>{option.kind}</small>
            </button>
          ))}
        </div>
      )}
      <div className="reference-chips">
        {draft.references.map((ref, i) => (
          <div className="reference-chip" key={i}>
            <span>
              {ref.title} · {ref.status || 'available'}
            </span>
            <button
              aria-label={`Remove reference ${ref.title}`}
              onClick={() =>
                run(async () => {
                  await api.draftReference({ id: draft.id, removeIndex: i });
                  await refresh();
                })
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <details>
        <summary>Context preview ({draft.references.length} references)</summary>
        {draft.references.map((ref, i) => (
          <div className="context-excerpt" key={i}>
            <strong>{ref.title}</strong>
            <p>{ref.excerpt || `Domain reference · outline ${ref.blueprintVersion}`}</p>
            {ref.revision && (
              <small>
                Saved revision {ref.revision.slice(0, 12)} · {ref.status || 'available'}
              </small>
            )}
          </div>
        ))}
      </details>
      <p className="reader-small">Open the tutor to preview your context and send your question.</p>
      <button
        className="text-link"
        disabled={saving}
        onClick={() =>
          run(async () => {
            await api.removeDraft({ id: draft.id });
            await refresh();
          })
        }
      >
        Delete this draft
      </button>
    </section>
  );
}
function SelectionTools({
  selection,
  range,
  article,
  note,
  setNote,
  repairId,
  annotate,
  ask,
  dismiss,
  asking,
  error,
}) {
  const panel = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    let frame;
    const place = () => {
      if (!panel.current || !range || !article?.isConnected) return;
      const margin = 12,
        gap = 10;
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + margin;
      const rightEdge = (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth) - margin;
      const topEdge = Math.max(
        (viewport?.offsetTop || 0) + margin,
        (document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) + gap,
      );
      const bottomEdge = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - margin;
      const bounds = article.getBoundingClientRect();
      const left = Math.max(leftEdge, bounds.left + margin);
      const right = Math.min(rightEdge, bounds.right - margin);
      const width = Math.max(1, Math.min(380, right - left));
      panel.current.style.width = `${width}px`;
      panel.current.style.maxHeight = `${Math.max(1, bottomEdge - topEdge)}px`;
      const rects = [...range.getClientRects()].filter((r) => r.width && r.height);
      const first = rects[0],
        last = rects.at(-1);
      if (!first || !last || last.bottom < topEdge || first.top > bottomEdge || right <= left) {
        setPosition(null);
        return;
      }
      const height = panel.current.getBoundingClientRect().height;
      const below = last.bottom + gap;
      const above = first.top - gap - height;
      const top =
        below + height <= bottomEdge
          ? below
          : above >= topEdge
            ? above
            : Math.max(topEdge, Math.min(below, bottomEdge - height));
      const x = Math.max(left, Math.min(last.left + last.width / 2 - width / 2, right - width));
      setPosition({ left: x, top });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const outside = (event) => {
      if (!panel.current?.contains(event.target)) dismiss();
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        const restore = panel.current?.contains(document.activeElement);
        dismiss();
        if (restore)
          article
            .querySelector(`[data-reader-section="${CSS.escape(selection.sectionId)}"]`)
            ?.focus({ preventScroll: true });
      }
    };
    place();
    const observer = new ResizeObserver(schedule);
    observer.observe(panel.current);
    observer.observe(article);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    viewport?.addEventListener?.('resize', schedule);
    viewport?.addEventListener?.('scroll', schedule);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener?.('resize', schedule);
      viewport?.removeEventListener?.('scroll', schedule);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [range, article, dismiss, selection.sectionId]);
  return createPortal(
    <div
      ref={panel}
      className="selection-tools"
      role="region"
      aria-label="Selected text actions"
      style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
    >
      <p className="selection-quote">
        “{selection.quote.slice(0, 180)}
        {selection.quote.length > 180 ? '…' : ''}”
      </p>
      <label>
        Note or tutor question
        <input
          aria-label="Annotation note"
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="reader-row">
        <button className="secondary" disabled={asking} onClick={() => annotate('highlight')}>
          <Highlighter size={15} />
          {repairId ? 'Save repaired highlight' : 'Save highlight'}
        </button>
        <button className="secondary" disabled={asking} onClick={ask}>
          {asking ? 'Opening tutor…' : 'Ask tutor'}
        </button>
        <button
          className="selection-close icon-button"
          aria-label="Clear selection"
          onClick={dismiss}
        >
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
export default function Reader({ initial = {} }) {
  const [data, setData] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(initial.notice || '');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [domainId, setDomain] = useState('');
  const [objectiveId, setObjective] = useState(initial.objectiveId || '');
  const [skillId, setSkill] = useState('');
  const [selection, setSelection] = useState(null);
  const [asking, setAsking] = useState(false);
  const askInFlight = useRef(false);
  const [note, setNote] = useState('');
  const [repairId, setRepairId] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [clearId, setClearId] = useState(null);
  const [target, setTarget] = useState(initial.sectionId || null);
  const readRevision = useRef(0);
  const articleRef = useRef(null);
  const selectedRange = useRef(null);
  const dismissSelection = useCallback(() => setSelection(null), []);
  const refresh = useCallback(async () => {
    const next = await api.state();
    setData(next);
    return next;
  }, []);
  const run = async (fn) => {
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    }
  };
  const open = useCallback(async (id, revision, sectionId) => {
    const token = ++readRevision.current;
    setLoading(true);
    setSelection(null);
    setTarget(sectionId || null);
    setError('');
    try {
      const next = await api.read({ id, revision });
      if (token === readRevision.current) {
        setView(next);
        setFetching(next.status?.status === 'loading' ? id : '');
      }
    } catch (e) {
      if (token === readRevision.current) setError(e.message);
    } finally {
      if (token === readRevision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    if (initial.id) open(initial.id, initial.revision, initial.sectionId);
  }, [refresh, open, initial]);
  useEffect(() => {
    if (!target || !view?.article) return;
    const el = document.getElementById(`reader-${target}`);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      el.focus({ preventScroll: true });
    } else
      setNotice(
        'The saved section is not present in this revision. Showing the article; the original reference is unchanged.',
      );
  }, [view, target]);
  useEffect(() => {
    if (!globalThis.CSS?.highlights || !globalThis.Highlight || !view?.article || !data) return;
    const ranges = [];
    for (const a of data.annotations.filter(
      (a) =>
        a.documentId === view.source.id &&
        a.kind === 'highlight' &&
        a.status === 'attached' &&
        a.currentRevision === view.article.revision,
    )) {
      const content = document
        .getElementById(`reader-${a.sectionId}`)
        ?.querySelector('.section-content');
      if (!content) continue;
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const map = [];
      let normalizedText = '';
      let node;
      let previousBlock;
      while ((node = walker.nextNode())) {
        const block = node.parentElement.closest('p,li,pre,td,th,dt,dd,blockquote');
        if (
          previousBlock &&
          block !== previousBlock &&
          normalizedText &&
          !normalizedText.endsWith(' ')
        ) {
          normalizedText += ' ';
          map.push({ node, offset: 0 });
        }
        previousBlock = block;
        for (let i = 0; i < node.textContent.length; i++) {
          const char = node.textContent[i];
          if (/\s/.test(char)) {
            if (!normalizedText || normalizedText.endsWith(' ')) continue;
            normalizedText += ' ';
          } else normalizedText += char;
          map.push({ node, offset: i });
        }
      }
      const start = normalizedText.indexOf(a.quote);
      const end = start + a.quote.length - 1;
      if (start >= 0 && map[end]) {
        const range = new Range();
        range.setStart(map[start].node, map[start].offset);
        range.setEnd(map[end].node, map[end].offset + 1);
        ranges.push(range);
      }
    }
    CSS.highlights.set('saved-study-highlights', new Highlight(...ranges));
    return () => CSS.highlights.delete('saved-study-highlights');
  }, [view, data]);
  useEffect(() => {
    if (!fetching) return;
    let active = true;
    const timer = setInterval(() => {
      api
        .read({ id: fetching })
        .then((next) => {
          if (!active || next.status?.status === 'loading') return;
          setFetching('');
          if (view?.source.id === fetching) setView(next);
          refresh().catch((e) => {
            if (active) setError(e.message);
          });
        })
        .catch((e) => {
          if (active) {
            setFetching('');
            setError(e.message);
          }
        });
    }, 500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [fetching, view?.source.id, refresh]);
  async function retrieve() {
    const id = view.source.id;
    setFetching(id);
    await run(async () => {
      try {
        await api.fetch({ id });
      } finally {
        await open(id);
        await refresh();
      }
    });
    setFetching('');
  }
  function captureSelection(event) {
    if (event?.key === 'Escape') {
      setSelection(null);
      return;
    }
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed) {
      setSelection(null);
      return;
    }
    const range = selected.getRangeAt(0);
    const element = (n) => (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement);
    const start = element(range.startContainer)?.closest('[data-reader-section]');
    const end = element(range.endContainer)?.closest('[data-reader-section]');
    if (!start || start !== end || !articleRef.current?.contains(start)) {
      setSelection(null);
      return;
    }
    // Section headings and bookmark controls are not part of the stored source body.
    // Clip a heading-plus-passage selection to its source text before creating a reference.
    const content = start.querySelector('.section-content');
    const bodyRange = document.createRange();
    bodyRange.selectNodeContents(content);
    const clipped = range.cloneRange();
    if (clipped.compareBoundaryPoints(Range.START_TO_START, bodyRange) < 0)
      clipped.setStart(bodyRange.startContainer, bodyRange.startOffset);
    if (clipped.compareBoundaryPoints(Range.END_TO_END, bodyRange) > 0)
      clipped.setEnd(bodyRange.endContainer, bodyRange.endOffset);
    const quote = normalized(clipped.toString());
    if (quote.length < 2) {
      setSelection(null);
      return;
    }
    selectedRange.current = clipped;
    setError('');
    setSelection({
      documentId: view.source.id,
      revision: view.article.revision,
      sectionId: start.dataset.readerSection,
      quote,
    });
  }
  async function annotate(kind, section) {
    const values =
      kind === 'bookmark'
        ? { documentId: view.source.id, revision: view.article.revision, sectionId: section.id }
        : selection;
    await run(async () => {
      await api.annotate({ ...values, kind, note, ...(repairId ? { id: repairId } : {}) });
      setRepairId(null);
      setSelection(null);
      setNote('');
      await refresh();
      setNotice('Annotation saved on this device.');
    });
  }
  async function ask() {
    if (askInFlight.current || !selection) return;
    askInFlight.current = true;
    setAsking(true);
    try {
      await run(async () => {
        const body = note.trim() || 'Explain this selected passage.';
        const draft = await api.saveDraft({ title: 'Question about selected text', body });
        await api.draftReference({ id: draft.id, reference: { kind: 'selection', ...selection } });
        setActiveDraft(draft.id);
        setSelection(null);
        setNote('');
        await refresh();
        window.dispatchEvent(new CustomEvent('open-tutor', { detail: { draftId: draft.id } }));
      });
    } finally {
      askInFlight.current = false;
      setAsking(false);
    }
  }
  const openLink = (url) => {
    if (url.split('#')[0] === view.source.url && url.includes('#')) {
      setTarget(`${view.source.id}:${decodeURIComponent(url.split('#')[1])}`);
      return;
    }
    run(() => api.openLink({ id: view.source.id, revision: view.article?.revision, url }));
  };
  if (!data)
    return (
      <section className="panel stage2-panel">
        <p role={error ? 'alert' : 'status'}>{error || 'Loading documentation library…'}</p>
        {error && <button onClick={() => run(refresh)}>Retry</button>}
      </section>
    );
  const entries = data.documents.filter(
    (d) =>
      (!domainId || d.domainId === domainId) &&
      (!objectiveId || d.objectiveId === objectiveId) &&
      (!skillId || d.skillIds.includes(skillId)),
  );
  const draft = data.drafts.find((d) => d.id === activeDraft) || data.drafts[0];
  return (
    <div className="reader-page page-enter">
      <div className="reader-row">
        <div>
          <div className="eyebrow">YOUR STUDY LIBRARY</div>
          <h1>Read. Connect. Remember.</h1>
          <p>Official documentation, with room for your own understanding.</p>
        </div>
        <span className="badge">
          <BookOpen size={14} />
          No API key needed
        </span>
      </div>
      {error && (
        <div role="alert" className="error-notice">
          {error}
          <button aria-label="Dismiss reader error" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <form
        className="reader-search panel"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            setLoading(true);
            try {
              setResults(await api.search({ query, domainId, objectiveId, skillId }));
            } finally {
              setLoading(false);
            }
          });
        }}
      >
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search cached documentation</span>
          <input
            value={query}
            maxLength={300}
            placeholder="Search cached documentation…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="primary" type="submit">
          Search sections
        </button>
        <label>
          Domain
          <Select
            value={domainId}
            onChange={(e) => {
              setDomain(e.target.value);
              setObjective('');
              setSkill('');
              setResults(null);
            }}
          >
            {[
              <option key="" value="">
                All domains
              </option>,
              ...data.domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              )),
            ]}
          </Select>
        </label>
        <label>
          Objective
          <Select
            value={objectiveId}
            onChange={(e) => {
              setObjective(e.target.value);
              setSkill('');
              setResults(null);
            }}
          >
            <option value="">All objectives</option>
            {data.objectives
              .filter((o) => !domainId || o.domainId === domainId)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
          </Select>
        </label>
        <label>
          Skill
          <Select
            value={skillId}
            onChange={(e) => {
              setSkill(e.target.value);
              setResults(null);
            }}
          >
            <option value="">All skills</option>
            {data.skills
              .filter(
                (s) =>
                  (!domainId || s.domainId === domainId) &&
                  (!objectiveId || s.objectiveId === objectiveId),
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
          </Select>
        </label>
      </form>
      {results && (
        <section className="panel stage2-panel" aria-label="Search results">
          <div className="reader-row">
            <h2>{results.length} matching sections</h2>
            <button onClick={() => setResults(null)}>Close results</button>
          </div>
          <p>Search covers cached articles only.</p>
          {results.map((r) => (
            <button
              className="reader-result"
              key={r.sectionId}
              onClick={() => open(r.documentId, r.revision, r.sectionId)}
            >
              <strong>{r.title}</strong>
              <span>{r.excerpt}</span>
            </button>
          ))}
          {!results.length && (
            <p>Try fewer words, broaden the filters, or retrieve an article below.</p>
          )}
        </section>
      )}
      <div className="reader-layout">
        <aside className="reader-library panel" aria-label="Documentation library">
          <h2>Documentation</h2>
          <p className="reader-small">
            {entries.length} entries · {data.documents.filter((d) => d.cached).length} cached
          </p>
          {entries.map((d) => (
            <button
              className={`reader-entry ${view?.source.id === d.id ? 'selected' : ''}`}
              key={d.id}
              onClick={() => open(d.id)}
            >
              <strong>{d.title}</strong>
              <small>
                {d.cached ? 'Available offline' : 'Not cached · connection needed'}
                {d.state?.error ? ' · Refresh failed' : ''}
              </small>
            </button>
          ))}
          {!entries.length && (
            <p>
              No reviewed reader entry maps to this skill yet. Broaden the filters to explore its
              objective.
            </p>
          )}
          <details className="reader-gaps">
            <summary>{data.missingSkills.length} skills without a reader mapping</summary>
            <ul>
              {data.missingSkills.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          </details>
        </aside>
        <div className="reader-main">
          {loading && <p role="status">Loading…</p>}
          {!view && (
            <section className="reader-empty panel">
              <BookOpen size={40} />
              <h2>A source for every objective</h2>
              <p>
                Choose an article from the library. Retrieve it once to read and search offline,
                save highlights, and collect questions.
              </p>
              <p className="reader-small">
                16 curated entries · 15 objective groups · skill gaps listed separately
              </p>
            </section>
          )}
          {view && (
            <article className="reader-article panel" ref={articleRef}>
              <header>
                <div className="eyebrow">MICROSOFT LEARN</div>
                <h2>{view.article?.title || view.source.title}</h2>
                <p className="reader-small">{view.source.url}</p>
                <div className="reader-row">
                  <button className="secondary" disabled={!!fetching} onClick={retrieve}>
                    <RefreshCw size={14} />
                    {view.article ? 'Refresh article' : 'Retrieve article'}
                  </button>
                  {fetching && (
                    <button onClick={() => run(() => api.cancel({ id: fetching }))}>
                      Cancel retrieval
                    </button>
                  )}
                  <button className="text-link" onClick={() => openLink(view.source.url)}>
                    Open original
                    <ExternalLink size={14} />
                  </button>
                </div>
                <p className="reader-small">
                  Cached: {date(view.version?.fetchedAt)} · Source updated:{' '}
                  {date(view.version?.sourceUpdated)}
                  {view.article ? ' · Available offline' : ' · Content unavailable offline'}
                </p>
                {view.article && view.status?.revision !== view.article.revision && (
                  <p className="notice">
                    You are reading a saved revision. A newer cached version is available in the
                    library; this reference has not been changed.
                  </p>
                )}
                {view.status?.error && (
                  <p role="alert">{view.status.error} Use Retrieve / Refresh to retry.</p>
                )}
                <details className="reader-small">
                  <summary>Source and permissions · {view.source.license}</summary>
                  <p>
                    {view.source.attribution}. {view.source.changes}
                  </p>
                  <button className="text-link" onClick={() => openLink(view.source.licenseUrl)}>
                    Source license
                  </button>
                  <button
                    className="text-link"
                    onClick={() => openLink(view.source.codeLicenseUrl)}
                  >
                    Code samples · MIT license
                  </button>
                  {view.version?.sourceUrl && (
                    <button className="text-link" onClick={() => openLink(view.version.sourceUrl)}>
                      Source repository
                    </button>
                  )}
                  <p>
                    Registry reviewed {view.source.reviewedAt}. Revision{' '}
                    {view.article?.revision.slice(0, 12) || 'not retrieved'}.
                  </p>
                  {view.version?.redirects?.map((r, i) => (
                    <p key={i}>
                      Redirect: {r.from} → {r.to}
                    </p>
                  ))}
                </details>
              </header>
              {!view.article && (
                <p className="reader-empty">
                  Retrieval needs a connection. Saved quotes and drafts remain available below.
                  Unsupported articles can be read using Open original.
                </p>
              )}
              {view.article && (
                <>
                  <nav className="reader-toc" aria-label="Article table of contents">
                    <details open>
                      <summary>In this article</summary>
                      {view.article.sections.map((s) => (
                        <button
                          className="text-link"
                          key={s.id}
                          onClick={() => {
                            setTarget(s.id);
                            document.getElementById(`reader-${s.id}`)?.focus();
                          }}
                        >
                          {s.title}
                        </button>
                      ))}
                    </details>
                  </nav>
                  {repairId && (
                    <p className="notice">
                      Select the correct passage, then save to repair the reference. Its previous
                      quote will remain in the repair record.
                      <button onClick={() => setRepairId(null)}>Cancel repair</button>
                    </p>
                  )}
                  {selection && (
                    <SelectionTools
                      selection={selection}
                      range={selectedRange.current}
                      article={articleRef.current}
                      note={note}
                      setNote={setNote}
                      repairId={repairId}
                      annotate={annotate}
                      ask={ask}
                      dismiss={dismissSelection}
                      asking={asking}
                      error={error}
                    />
                  )}
                  <div onMouseUp={captureSelection} onKeyUp={captureSelection}>
                    {view.article.sections.map((s) => (
                      <section
                        className="reader-section"
                        tabIndex={-1}
                        id={`reader-${s.id}`}
                        data-reader-section={s.id}
                        key={s.id}
                      >
                        <div className="reader-row">
                          <h3>{s.title}</h3>
                          <button
                            className="icon-button"
                            aria-label={`Bookmark ${s.title}`}
                            onClick={() => annotate('bookmark', s)}
                          >
                            <Bookmark size={16} />
                          </button>
                        </div>
                        <div className="section-content">
                          <Nodes nodes={s.nodes} openLink={openLink} />
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </article>
          )}
        </div>
      </div>
      <div className="reader-bottom">
        <section className="panel stage2-panel" aria-label="Saved annotations">
          <h2>Highlights & bookmarks</h2>
          <p className="reader-small">Saved quotes survive refreshes and cache clearing.</p>
          {!data.annotations.length && (
            <p>
              Select text inside an article to save your first highlight, or bookmark a section.
            </p>
          )}
          {data.annotations.map((a) => (
            <div className="saved-annotation" key={a.id}>
              <div className="reader-row">
                <strong>
                  {a.kind === 'bookmark' ? 'Bookmark' : 'Highlight'} · {a.title}
                </strong>
                <span className="badge">{!a.available ? 'Content unavailable' : a.status}</span>
              </div>
              {a.quote && <blockquote>{a.quote}</blockquote>}
              {a.note && <p>{a.note}</p>}
              <div className="reader-row">
                <button onClick={() => open(a.documentId, a.currentRevision, a.sectionId)}>
                  Open saved section
                </button>
                {a.status === 'stale' && (
                  <button
                    onClick={() => {
                      setRepairId(a.id);
                      open(a.documentId);
                    }}
                  >
                    Repair reference
                  </button>
                )}
                <button
                  className="text-link"
                  onClick={() =>
                    run(async () => {
                      await api.removeAnnotation({ id: a.id });
                      await refresh();
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <details>
                <summary>Edit note / repair history</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = new FormData(e.currentTarget).get('note');
                    run(async () => {
                      await api.note({ id: a.id, note: value });
                      await refresh();
                    });
                  }}
                >
                  <textarea
                    name="note"
                    defaultValue={a.note}
                    maxLength={4000}
                    aria-label={`Note for ${a.title}`}
                  />
                  <button>Save note</button>
                </form>
                {a.repairedFrom && (
                  <blockquote>
                    Previous quote: {a.repairedFrom.quote || a.repairedFrom.title}
                  </blockquote>
                )}
              </details>
            </div>
          ))}
        </section>
        <div>
          <section className="panel stage2-panel">
            <div className="reader-row">
              <h2>
                <FileText size={20} /> Tutor drafts
              </h2>
              <button
                onClick={() =>
                  run(async () => {
                    const d = await api.saveDraft({ title: 'Untitled question', body: '' });
                    setActiveDraft(d.id);
                    await refresh();
                  })
                }
              >
                New draft
              </button>
            </div>
            <p>Open the tutor to preview your context and send your question.</p>
            {data.drafts.length > 0 && (
              <label>
                Saved question
                <Select value={draft?.id || ''} onChange={(e) => setActiveDraft(e.target.value)}>
                  {data.drafts.map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.title || 'Untitled question'}
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </section>
          {draft && (
            <DraftEditor key={draft.id} draft={draft} refresh={refresh} run={run} data={data} />
          )}
        </div>
      </div>
      <details className="panel stage2-panel">
        <summary>
          Document cache · {(data.cache.bytes / 1024 / 1024).toFixed(2)} /{' '}
          {data.cache.budget / 1024 / 1024} MiB
        </summary>
        <p>
          Least recently used content is evicted at the limit. Quotes, bookmarks, drafts, and study
          history remain. Removed revisions are marked unavailable.
        </p>
        <button disabled={!!fetching} onClick={() => setClearId('all')}>
          Clear all cached content…
        </button>
        {data.cache.entries.map((entry) => (
          <div className="reader-row cache-entry" key={`${entry.documentId}-${entry.revision}`}>
            <span>
              {data.documents.find((d) => d.id === entry.documentId)?.title} ·{' '}
              {entry.revision.slice(0, 8)} · {Math.ceil(entry.bytes / 1024)} KiB
              <br />
              <small>
                Retrieved {date(entry.fetchedAt)} · last read {date(entry.accessedAt)}
              </small>
            </span>
            <button disabled={!!fetching} onClick={() => setClearId(entry.documentId)}>
              Clear article cache…
            </button>
          </div>
        ))}
      </details>
      {clearId && (
        <section
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="clear-cache-title"
          className="panel stage2-panel"
        >
          <h2 id="clear-cache-title">Clear cached content?</h2>
          <p>
            {clearId === 'all' ? 'All cached articles' : 'All cached revisions of this article'}{' '}
            will need retrieval to read again. Saved quotes, annotations, question drafts, and quiz
            history will remain.
          </p>
          <button
            onClick={() =>
              run(async () => {
                await api.clear({ confirmed: true, ...(clearId === 'all' ? {} : { id: clearId }) });
                setClearId(null);
                if (view) await open(view.source.id);
                await refresh();
              })
            }
          >
            Confirm cache clearing
          </button>
          <button onClick={() => setClearId(null)}>Keep cached content</button>
        </section>
      )}
    </div>
  );
}
