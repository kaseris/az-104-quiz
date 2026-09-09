import DataManagement from './DataManagement.jsx';
import Labs from './Labs.jsx';
import Generation, { GenerateLink, GeneratedProvenance } from './Generation.jsx';
import Tutor, { ProviderSettings, TutorLink } from './Tutor.jsx';
import Reader, { ReaderLink } from './Reader.jsx';
import { AdvancedSetup, Confidence, Progress, Issues, ReportQuestion, Exam } from './Stage2.jsx';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  ExternalLink,
  Flag,
  GraduationCap,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Network,
  RotateCcw,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';

const icons = {
  shield: ShieldCheck,
  database: Database,
  server: Server,
  network: Network,
  activity: Activity,
};
const date = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const domainName = (state, id) =>
  state.domains.find((d) => d.id === id)?.title ?? 'All five domains';
const api = window.study;

function Mark({ small = false }) {
  return (
    <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true">
      <Layers size={small ? 19 : 25} strokeWidth={1.7} />
    </span>
  );
}
function Badge({ children, muted = false }) {
  return <span className={`badge ${muted ? 'muted' : ''}`}>{children}</span>;
}
function SourceButton({ url, children, run }) {
  return (
    <button className="text-link" onClick={() => run(() => api.openReference(url))}>
      {children}
      <ExternalLink size={13} aria-hidden="true" />
    </button>
  );
}
function ErrorNotice({ error, dismiss }) {
  return (
    error && (
      <div className="error-notice" role="alert">
        <CircleHelp size={18} />
        <span>{error}</span>
        <button className="icon-button" aria-label="Dismiss error" onClick={dismiss}>
          <X size={16} />
        </button>
      </div>
    )
  );
}

export default function App() {
  const [state, setState] = useState(null);
  const [practiceFilter, setPracticeFilter] = useState(null);
  const [screen, setScreen] = useState('overview');
  useEffect(() => {
    const open = () => setScreen('generation');
    window.addEventListener('open-generation', open);
    return () => window.removeEventListener('open-generation', open);
  }, []);
  const [readerRoute, setReaderRoute] = useState({});
  const [tutorRoute, setTutorRoute] = useState({});
  useEffect(() => {
    const listener = (e) => {
      setTutorRoute({ ...e.detail, routeKey: undefined });
      setScreen('tutor');
    };
    window.addEventListener('open-tutor', listener);
    return () => window.removeEventListener('open-tutor', listener);
  }, []);
  useEffect(() => {
    const listener = (event) =>
      api.reader
        .resolve(event.detail)
        .then((route) => {
          setReaderRoute(route);
          setScreen('documentation');
        })
        .catch((e) => setError(e.message));
    window.addEventListener('open-reader', listener);
    return () => window.removeEventListener('open-reader', listener);
  }, []);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const running = useRef(false);
  const operationRevision = useRef(0);
  useEffect(() => {
    let live = true;
    if (api)
      api
        .getState()
        .then((s) => {
          if (live) setState(s);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const reload = () => {
      setSession(null);
      api
        .getState()
        .then(setState)
        .catch((e) => setError(e.message));
    };
    window.addEventListener('study:data-changed', reload);
    return () => window.removeEventListener('study:data-changed', reload);
  }, []);
  async function run(work) {
    if (running.current) return;
    running.current = true;
    operationRevision.current++;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      return await work();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    setState(await api.getState());
  }
  const navigate = (next) => {
    if (!window.dispatchEvent(new Event('study:before-navigate', { cancelable: true }))) return;
    setScreen(next);
    setError('');
    setNotice('');
  };
  const openSession = (id) =>
    run(async () => {
      setSession(await api.session(id));
      setScreen('session');
    });
  const start = (config) =>
    run(async () => {
      setSession(await api.start(config));
      await refresh();
      setScreen('session');
    });
  const updateSession = (method, payload) =>
    run(async () => {
      setSession(await api[method](payload));
      await refresh();
    });

  const activeSessionId = session?.id;
  const pollExam = useCallback(async () => {
    if (!activeSessionId || running.current) return;
    const revision = operationRevision.current;
    try {
      const latest = await api.session(activeSessionId);
      if (revision === operationRevision.current) {
        setSession(latest);
        if (latest.completedAt) setState(await api.getState());
      }
    } catch (e) {
      if (revision === operationRevision.current) setError(e.message);
    }
  }, [activeSessionId]);

  if (!api)
    return (
      <div className="launch-message">
        <Mark />
        <h1>Open your Study Desk.</h1>
        <p>
          This is a desktop app. Launch it from the project with <code>npm start</code> to use your
          local quiz database.
        </p>
      </div>
    );
  if (!state)
    return (
      <div className="launch-message">
        <Mark />
        <h1>Opening your desk…</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={() => run(refresh)}>
              Try again
            </button>
          </>
        ) : (
          <LoaderCircle className="spin" aria-label="Loading" />
        )}
      </div>
    );
  if (!state.onboarded)
    return (
      <Onboarding
        state={state}
        busy={busy}
        error={error}
        dismiss={() => setError('')}
        onContinue={(key, sessionConsent) =>
          run(async () => {
            setState(await api.onboard({ apiKey: key, sessionConsent }));
            if (key) setScreen('settings');
          })
        }
      />
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-drag" />
        <div className="brand">
          <Mark small />
          <span>
            Study Desk<span className="brand-subtitle">AZURE ADMINISTRATOR</span>
          </span>
        </div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            ['overview', LayoutDashboard, 'Overview'],
            ['practice', ListChecks, 'Practice quizzes'],
            ['history', History, 'Session history'],
            ['progress', Target, 'Learning progress'],
            ['issues', Flag, 'Question issues'],
            ['documentation', BookOpen, 'Documentation'],
            ['tutor', Sparkles, 'Study tutor'],
            ['generation', Activity, 'Question generation'],
            ['labs', Zap, 'Hands-on labs'],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              disabled={busy}
              className={`nav-item ${screen === id || (id === 'practice' && screen === 'session') ? 'active' : ''}`}
              aria-current={
                screen === id || (id === 'practice' && screen === 'session') ? 'page' : undefined
              }
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === 'practice' && state.activeId && (
                <span className="nav-dot" aria-label="Session in progress" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="status-dot" />
            <span>
              Yours, on this device<small>Progress is saved locally</small>
            </span>
          </div>
          <button
            disabled={busy}
            className={`nav-item ${screen === 'settings' ? 'active' : ''}`}
            aria-current={screen === 'settings' ? 'page' : undefined}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={18} />
            Settings & sources
          </button>
          <div className="sidebar-version">
            STUDY DESK <span>v0.5 · Unsigned preview</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            AZ-104 <ChevronRight size={13} />{' '}
            <strong>
              {screen === 'session'
                ? session?.completedAt
                  ? 'Session review'
                  : 'Practice session'
                : {
                    overview: 'Overview',
                    practice: 'Practice quizzes',
                    history: 'Session history',
                    progress: 'Learning progress',
                    issues: 'Question issues',
                    documentation: 'Documentation',
                    tutor: 'Study tutor',
                    generation: 'Question generation',
                    labs: 'Hands-on labs',
                    settings: 'Settings & sources',
                  }[screen]}
            </strong>
          </span>
          <span className="offline-pill">
            <span className="status-dot" />
            {screen === 'documentation'
              ? 'Local library · retrieve online'
              : screen === 'tutor' || screen === 'generation'
                ? 'Local history · AI online'
                : 'Offline practice'}
          </span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <ErrorNotice error={error} dismiss={() => setError('')} />
          {notice && (
            <div className="notice" role="status">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          )}
          {screen === 'overview' && (
            <Overview state={state} busy={busy} navigate={navigate} resume={openSession} />
          )}
          {screen === 'practice' && (
            <>
              <Practice state={state} busy={busy} start={start} resume={openSession} />
              {!state.activeId && (
                <AdvancedSetup
                  key={JSON.stringify(practiceFilter)}
                  initial={practiceFilter}
                  state={state}
                  busy={busy}
                  start={start}
                />
              )}
            </>
          )}
          {screen === 'session' &&
            session &&
            (session.completedAt ? (
              <Review state={state} session={session} run={run} navigate={navigate} />
            ) : session.mode === 'exam' ? (
              <Exam
                key={`${session.id}-${session.cursor}`}
                session={session}
                busy={busy}
                update={updateSession}
                navigate={navigate}
                poll={pollExam}
              />
            ) : (
              <Quiz
                key={`${session.id}-${session.cursor}`}
                session={session}
                state={state}
                busy={busy}
                update={updateSession}
                run={run}
                navigate={navigate}
              />
            ))}
          {screen === 'progress' && (
            <Progress
              practice={(filter) => {
                setPracticeFilter(filter);
                navigate('practice');
              }}
            />
          )}
          {screen === 'documentation' && (
            <Reader key={JSON.stringify(readerRoute)} initial={readerRoute} />
          )}
          {screen === 'tutor' && <Tutor key={JSON.stringify(tutorRoute)} initial={tutorRoute} />}
          {screen === 'generation' && <Generation />}
          {screen === 'labs' && <Labs />}
          {screen === 'issues' && <Issues run={run} />}
          {screen === 'history' && (
            <SessionHistory state={state} busy={busy} open={openSession} navigate={navigate} />
          )}
          {screen === 'settings' && (
            <Settings
              openTutor={() => navigate('tutor')}
              state={state}
              busy={busy}
              run={run}
              save={(key) =>
                run(async () => {
                  setState(await api.saveKey(key));
                  setNotice('Key stored. Choose a spending limit and activate AI below.');
                  return true;
                })
              }
              remove={() =>
                run(async () => {
                  setState(await api.removeKey());
                  setNotice('API key removed from this device.');
                })
              }
            />
          )}
        </main>
        <footer className="workspace-footer">
          <span>Independent practice for the Microsoft Azure Administrator exam.</span>
          <span>Outline · April 2026</span>
        </footer>
      </div>
    </div>
  );
}

function Onboarding({ state, busy, error, dismiss, onContinue }) {
  const [key, setKey] = useState('');
  const [sessionConsent, setSessionConsent] = useState(false);
  return (
    <div className="onboarding">
      <section className="welcome-panel">
        <div className="onboarding-drag" />
        <div className="brand">
          <Mark />
          <span>
            Study Desk<span className="brand-subtitle">AZURE ADMINISTRATOR</span>
          </span>
        </div>
        <div className="welcome-copy">
          <span className="eyebrow">A SPACE TO BUILD YOUR KNOWLEDGE</span>
          <h1>
            Small sessions.
            <br />
            Stronger foundations.
          </h1>
          <p>
            Work through the questions.
            <br />
            Understand the why.
            <br />
            Take the next step with confidence.
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-line" />
          <div className="art-tile tile-one">
            <ShieldCheck size={30} />
          </div>
          <div className="art-tile tile-two">
            <Database size={30} />
          </div>
          <div className="art-tile tile-three">
            <Network size={30} />
          </div>
        </div>
        <div className="welcome-foot">
          <GraduationCap size={19} />
          Built for your AZ-104 journey
        </div>
      </section>
      <section className="setup-panel">
        <div className="setup-content">
          <Badge muted>WELCOME TO YOUR STUDY DESK</Badge>
          <h2>Start where you are.</h2>
          <p className="lead">Your first practice session is ready. No account needed.</p>
          <div className="included">
            <CheckCircle2 />
            <div>
              <strong>{state.totalQuestions} curated practice questions</strong>
              <p>All five domains, explanations, and progress saved on this device.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = key;
              setKey('');
              onContinue(value, sessionConsent);
            }}
          >
            <div className="field-heading">
              <label htmlFor="first-api-key">
                <KeyRound size={16} /> OpenAI API key
              </label>
              <span>OPTIONAL</span>
            </div>
            <input
              id="first-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your API key"
              maxLength={4096}
              disabled={busy}
              aria-describedby="key-explainer"
            />
            <p id="key-explainer" className="field-help">
              Store your key, then choose a spending limit and activate your tutor in Settings. No
              provider request is made during this step.{' '}
              {state.credentials.secureAvailable
                ? 'Stored encrypted on this device.'
                : 'Secure storage is unavailable; a key will only be kept for this app session.'}
            </p>
            {!state.credentials.secureAvailable && (
              <label>
                <input
                  type="checkbox"
                  checked={sessionConsent}
                  onChange={(e) => setSessionConsent(e.target.checked)}
                />
                Accept session-only key storage
              </label>
            )}
            <ErrorNotice error={error} dismiss={dismiss} />
            <button className="secondary setup-save" disabled={busy || !key.trim()} type="submit">
              {busy ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />}Store
              key & continue
            </button>
          </form>
          <div className="setup-divider">
            <span>or jump straight in</span>
          </div>
          <button
            className="primary wide"
            disabled={busy}
            onClick={() => {
              setKey('');
              onContinue('');
            }}
          >
            Continue without AI
            <ArrowRight size={18} />
          </button>
          <p className="setup-footnote">You can add or remove a key later in Settings.</p>
        </div>
      </section>
    </div>
  );
}

function Overview({ state, busy, navigate, resume }) {
  const completed = state.sessions.filter((s) => s.completedAt);
  const answered = state.sessions.reduce((sum, s) => sum + s.answered, 0);
  const correct = state.sessions.reduce((sum, s) => sum + s.correct, 0);
  const active = state.sessions.find((s) => s.id === state.activeId);
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR LEARNING, ONE SESSION AT A TIME</div>
          <h1>Make room for progress.</h1>
          <p>A focused place to prepare for your AZ-104 exam.</p>
        </div>
        <Badge>
          <span className="status-dot" />
          STARTER EDITION
        </Badge>
      </div>
      <section className="practice-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            {active ? 'PICK UP WHERE YOU LEFT OFF' : 'TODAY IS A GOOD DAY TO PRACTICE'}
          </span>
          <h2>{active ? 'Your session is waiting.' : 'Build a little momentum.'}</h2>
          <p>
            {active
              ? `${active.answered} of ${active.total} answers saved. Continue at your own pace.`
              : 'A short quiz. A clearer understanding. Practice across the five Azure administrator domains.'}
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => (active ? resume(active.id) : navigate('practice'))}
          >
            {active ? 'Resume session' : 'Set up a practice quiz'}
            <ArrowRight size={17} />
          </button>
          <div className="hero-meta">
            <Clock3 size={14} />
            Untimed study<span>·</span>
            <Check size={14} />
            Explanations after every answer
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-symbol">
            <Layers size={49} strokeWidth={1.2} />
          </div>
          <div className="orbit-node node-one">
            <ShieldCheck size={22} />
          </div>
          <div className="orbit-node node-two">
            <Database size={21} />
          </div>
          <span className="art-coordinate">AZ / 104</span>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          label="QUESTIONS ANSWERED"
          value={answered}
          detail="Across all your sessions"
          icon={ListChecks}
        />
        <Stat
          label="ANSWER ACCURACY"
          value={answered ? `${pct(correct, answered)}%` : '—'}
          detail={
            answered
              ? `${correct} correct of ${answered} submitted`
              : 'Your first answer starts the story'
          }
          icon={Target}
        />
        <Stat
          label="SESSIONS COMPLETED"
          value={completed.length}
          detail="A step forward, every time"
          icon={Flag}
        />
      </div>
      <div className="overview-columns">
        <section className="panel domain-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE EXAM LANDSCAPE</span>
              <h2>Five domains to explore</h2>
            </div>
            <span className="small-muted">Exam weight</span>
          </div>
          <DomainRows state={state} />
          <div className="panel-foot">
            {state.totalQuestions} reviewed questions · Skill coverage is shown in Learning progress
          </div>
        </section>
        <section className="panel recent-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR TRACK RECORD</span>
              <h2>Recent sessions</h2>
            </div>
          </div>
          {state.sessions.length ? (
            <div className="recent-list">
              {state.sessions.slice(0, 3).map((s) => (
                <button
                  className="recent-row"
                  key={s.id}
                  disabled={busy}
                  onClick={() => resume(s.id)}
                >
                  <span className="recent-icon">
                    {s.completedAt ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}
                  </span>
                  <span>
                    <strong>{domainName(state, s.domainId)}</strong>
                    <small>
                      {date(s.startedAt)} · {s.answered}/{s.total} answered
                    </small>
                  </span>
                  <b>
                    {s.completedAt ? `${pct(s.correct, s.total)}%` : <ChevronRight size={17} />}
                  </b>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-recent">
              <span className="empty-icon">
                <History size={26} strokeWidth={1.5} />
              </span>
              <h3>Your first chapter starts here.</h3>
              <p>Completed quizzes and saved sessions will appear here.</p>
            </div>
          )}
          <button className="panel-footer-button" onClick={() => navigate('history')}>
            View session history
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    </div>
  );
}
function Stat({ label, value, detail, icon: Icon }) {
  return (
    <section className="stat">
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <Icon size={20} strokeWidth={1.6} />
    </section>
  );
}
function DomainRows({ state }) {
  return (
    <div className="domain-rows">
      {state.domains.map((d) => {
        const Icon = icons[d.icon];
        return (
          <div className="domain-row" key={d.id}>
            <span className="domain-icon" style={{ color: d.color }}>
              <Icon size={20} strokeWidth={1.6} />
            </span>
            <span className="domain-info">
              <strong>{d.title}</strong>
              <small>{d.count} eligible questions</small>
            </span>
            <span className="domain-weight">{d.weight}</span>
          </div>
        );
      })}
    </div>
  );
}

function Practice({ state, busy, start, resume }) {
  const [domain, setDomain] = useState('all');
  const [count, setCount] = useState(10);
  const available =
    domain === 'all' ? state.totalQuestions : state.domains.find((d) => d.id === domain).count;
  const actual = Math.min(domain === 'all' ? count : 4, available);
  return (
    <div className="page-enter narrow-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRACTICE WITH PURPOSE</div>
          <h1>A session that fits your day.</h1>
          <p>Choose your focus. Take your time. Learn from every answer.</p>
        </div>
      </div>
      {state.activeId ? (
        <section className="panel resume-panel">
          <Clock3 size={28} />
          <div>
            <h2>You have a session in progress.</h2>
            <p>
              Your questions and answers are saved. Finish this session before starting another.
            </p>
          </div>
          <button className="primary" disabled={busy} onClick={() => resume(state.activeId)}>
            Resume session
            <ArrowRight size={17} />
          </button>
        </section>
      ) : (
        <div className="setup-grid">
          <form
            className="panel quiz-setup"
            onSubmit={(e) => {
              e.preventDefault();
              start({ count: domain === 'all' ? count : 4, domainId: domain });
            }}
          >
            <fieldset>
              <legend>
                <span className="step-number">01</span>Choose your focus
              </legend>
              <label className={`focus-choice ${domain === 'all' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="domain"
                  value="all"
                  checked={domain === 'all'}
                  onChange={() => setDomain('all')}
                />
                <Layers size={21} />
                <span>
                  <strong>All five domains</strong>
                  <small>A broad mix from the reviewed bank</small>
                </span>
                <span className="option-count">{state.totalQuestions}</span>
              </label>
              {state.domains.map((d) => {
                const Icon = icons[d.icon];
                return (
                  <label className={`focus-choice ${domain === d.id ? 'selected' : ''}`} key={d.id}>
                    <input
                      type="radio"
                      name="domain"
                      value={d.id}
                      checked={domain === d.id}
                      onChange={() => setDomain(d.id)}
                    />
                    <Icon size={20} style={{ color: d.color }} />
                    <span>
                      <strong>{d.title}</strong>
                      <small>{d.description}</small>
                    </span>
                    <span className="option-count">{d.count}</span>
                  </label>
                );
              })}
            </fieldset>
            <fieldset className="length-field">
              <legend>
                <span className="step-number">02</span>Pick a session length
              </legend>
              {domain === 'all' ? (
                <div className="length-options">
                  {[5, 10, 20].map((n) => (
                    <label className={count === n ? 'selected' : ''} key={n}>
                      <input
                        type="radio"
                        name="length"
                        checked={count === n}
                        onChange={() => setCount(n)}
                      />
                      <strong>{n}</strong>
                      <span>questions</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="small-muted">
                  This domain has {available} questions. Your focused session includes up to four.
                </p>
              )}
            </fieldset>
            <button type="submit" className="primary wide" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}Start{' '}
              {actual}-question quiz
            </button>
          </form>
          <aside className="session-guide">
            <Badge muted>STUDY MODE</Badge>
            <h2>Learn as you go.</h2>
            <ul>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>Understand each answer</strong>
                  <small>See explanations and official references after submitting.</small>
                </span>
              </li>
              <li>
                <Clock3 />
                <span>
                  <strong>Take it at your pace</strong>
                  <small>No timer pressure. Pause and return whenever you need.</small>
                </span>
              </li>
              <li>
                <ArrowDownToLine />
                <span>
                  <strong>Keep your progress</strong>
                  <small>Selections and submitted answers are saved to this device.</small>
                </span>
              </li>
            </ul>
            <div className="sample-note">
              <BookOpen size={19} />
              <p>
                These are adapted public practice questions. The bank samples the syllabus; it is
                not a full mock exam or a pass prediction.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Quiz({ session, state, busy, update, run, navigate }) {
  const item = session.items[session.cursor];
  const q = item.question;
  const started = useRef(performance.now());
  const initialDuration = useRef(item.durationMs);
  const duration = () =>
    Math.min(
      604800000,
      initialDuration.current + Math.max(0, Math.round(performance.now() - started.current)),
    );
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const payload = (selected = item.selectedOptionIds) => ({
    sessionId: session.id,
    questionId: q.id,
    selectedOptionIds: selected,
    durationMs: duration(),
    revision: item.revision,
    confidence: item.confidence,
  });
  const select = (id) => {
    const selected =
      q.type === 'single'
        ? [id]
        : item.selectedOptionIds.includes(id)
          ? item.selectedOptionIds.filter((x) => x !== id)
          : [...item.selectedOptionIds, id];
    update('draft', payload(selected));
  };
  const correctIds = item.review?.correctOptionIds ?? [];
  return (
    <div className="page-enter quiz-page">
      <p className="small-muted">{item.reason}</p>
      <ReportQuestion question={q} run={run} />
      <TutorLink
        sessionId={session.id}
        questionId={q.id}
        mode={item.submittedAt ? 'explain' : 'hint'}
      />
      {!item.submittedAt && (
        <Confidence
          value={item.confidence}
          disabled={busy}
          onChange={(confidence) => update('draft', { ...payload(), confidence })}
        />
      )}
      <div className="quiz-topline">
        <button className="back-link" disabled={busy} onClick={() => navigate('practice')}>
          <ArrowLeft size={16} />
          Save & leave
        </button>
        <span className="saved-label" role="status">
          <CheckCircle2 size={14} />
          {busy ? 'Saving…' : 'Saved on this device'}
        </span>
      </div>
      <div className="quiz-progress-label">
        <span>
          QUESTION <b>{String(session.cursor + 1).padStart(2, '0')}</b> /{' '}
          {String(session.items.length).padStart(2, '0')}
        </span>
        <span>Untimed study session</span>
      </div>
      <progress
        className="quiz-progress"
        value={session.answered}
        max={session.items.length}
        aria-label="Questions answered"
      />
      <div className="question-layout">
        <section className="panel question-panel">
          <div className="question-meta">
            <Badge muted>{domainName(state, q.domainId)}</Badge>
            <span>
              {q.type === 'multiple' ? `SELECT ${q.selectionCount} ANSWERS` : 'SINGLE ANSWER'}
            </span>
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {q.title}
          </h1>
          <p className="question-prompt">{q.prompt}</p>
          {q.code && (
            <div className="code-block">
              <span>{q.code.language.toUpperCase()}</span>
              <pre>
                <code>{q.code.text}</code>
              </pre>
            </div>
          )}
          <fieldset className="answers" disabled={busy || Boolean(item.submittedAt)}>
            <legend className="sr-only">
              {q.type === 'multiple' ? `Select ${q.selectionCount} answers` : 'Choose one answer'}
            </legend>
            {q.options.map((option, index) => {
              const selected = item.selectedOptionIds.includes(option.id);
              const right = correctIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`answer-option ${selected ? 'chosen' : ''} ${item.submittedAt && right ? 'correct' : ''} ${item.submittedAt && selected && !right ? 'incorrect' : ''}`}
                >
                  <input
                    type={q.type === 'single' ? 'radio' : 'checkbox'}
                    name="answer"
                    checked={selected}
                    onChange={() => select(option.id)}
                  />
                  <span className="answer-letter" aria-hidden="true">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="answer-text">{option.text}</span>
                  {item.submittedAt &&
                    (right ? (
                      <span className="answer-result">
                        <Check size={15} />
                        Correct
                      </span>
                    ) : selected ? (
                      <span className="answer-result">
                        <X size={15} />
                        Your answer
                      </span>
                    ) : null)}
                </label>
              );
            })}
          </fieldset>
          {item.review && <AnswerExplanation item={item} run={run} />}
          <div className="question-actions">
            <span>
              {item.submittedAt
                ? 'Answer saved. Take a moment to review.'
                : q.type === 'multiple'
                  ? `${item.selectedOptionIds.length} of ${q.selectionCount} selected · Exact match scoring`
                  : 'Choose an answer to continue.'}
            </span>
            {item.submittedAt ? (
              <button
                className="primary"
                disabled={busy}
                onClick={() => update('advance', { sessionId: session.id, questionId: q.id })}
              >
                {session.cursor === session.items.length - 1 ? 'Finish & review' : 'Next question'}
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="primary"
                disabled={
                  busy ||
                  (q.type === 'multiple'
                    ? item.selectedOptionIds.length !== q.selectionCount
                    : !item.selectedOptionIds.length)
                }
                onClick={() => update('submit', payload())}
              >
                {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Check
                answer
              </button>
            )}
          </div>
        </section>
        <aside className="question-aside">
          <span className="eyebrow">YOUR SESSION</span>
          <div className="question-map" aria-label="Question progress">
            {session.items.map((it, i) => (
              <span
                key={it.question.id}
                className={`${i === session.cursor ? 'current' : ''} ${it.submittedAt ? `done ${it.correct ? 'correct' : 'incorrect'}` : ''}`}
                aria-label={`Question ${i + 1}: ${it.submittedAt ? (it.correct ? 'correct' : 'incorrect') : i === session.cursor ? 'current' : 'upcoming'}`}
                aria-current={i === session.cursor ? 'step' : undefined}
              >
                {it.submittedAt ? (
                  it.correct ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <X size={15} aria-hidden="true" />
                  )
                ) : (
                  i + 1
                )}
              </span>
            ))}
          </div>
          <div className="aside-tip">
            <BookOpen size={23} strokeWidth={1.5} />
            <h3>Look for the constraint.</h3>
            <p>
              Scope, permissions, and availability often make the difference between two plausible
              answers.
            </p>
          </div>
          <div className="aside-source">
            <LockKeyhole size={14} />
            No API key needed
            <br />
            <span>Questions and explanations are bundled with the app.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
function AnswerExplanation({ item, run }) {
  const r = item.review;
  return (
    <section
      className={`answer-explanation ${item.correct ? 'right' : 'wrong'}`}
      aria-label="Answer explanation"
    >
      <h2>
        {item.correct ? <CheckCircle2 size={21} /> : <CircleHelp size={21} />}
        {item.correct ? 'That’s right.' : 'A useful one to revisit.'}
      </h2>
      <p>{r.explanation}</p>
      <ReportQuestion question={item.question} run={run} />
      <details>
        <summary>Why the other choices don’t fit</summary>
        <ul>
          {r.options
            .filter((o) => !r.correctOptionIds.includes(o.id))
            .map((o) => (
              <li key={o.id}>
                <strong>{o.text}</strong>
                <span>{o.rationale}</span>
              </li>
            ))}
        </ul>
      </details>
      <div className="reference-links">
        {r.references.map((ref) => (
          <div key={ref.url}>
            <ReaderLink
              url={ref.url}
              skillId={item.question.primarySkillId}
              objectiveId={item.question.objectiveId}
            >
              {ref.title} · Read documentation
            </ReaderLink>
            <SourceButton url={ref.url} run={run}>
              Open original
            </SourceButton>
          </div>
        ))}
      </div>
      <div className="question-attribution">
        {r.source.kind === 'ai-generated' ? (
          <GeneratedProvenance source={r.source} />
        ) : (
          <>
            Adapted from {r.source.author} · {r.source.section} · MIT
            <SourceButton url={r.source.url} run={run}>
              Question source
            </SourceButton>
          </>
        )}
      </div>
    </section>
  );
}
function Review({ session, state, run, navigate }) {
  const [onlyMissed, setOnlyMissed] = useState(false);
  const wrong = session.items.length - session.correct;
  const visible = onlyMissed ? session.items.filter((i) => !i.correct) : session.items;
  return (
    <div className="page-enter review-page">
      <button className="back-link" onClick={() => navigate('history')}>
        <ArrowLeft size={16} />
        Session history
      </button>
      <section className="review-banner">
        <div>
          <Badge>SESSION COMPLETE</Badge>
          <h1>Another step forward.</h1>
          <p>
            {domainName(state, session.domainId)} · {session.items.length} questions ·{' '}
            {date(session.completedAt)}
          </p>
          <button className="primary" onClick={() => navigate('practice')}>
            Practice again
            <RotateCcw size={16} />
          </button>
          <GenerateLink sessionId={session.id} />
        </div>
        <div className="score-block">
          <strong>
            {pct(session.correct, session.items.length)}
            <span>%</span>
          </strong>
          <span>
            {session.correct} of {session.items.length} correct
          </span>
          <small>Practice accuracy · not an exam score</small>
        </div>
      </section>
      <div className="review-domain-grid">
        {state.domains.map((d) => {
          const items = session.items.filter((i) => i.question.domainId === d.id);
          if (!items.length) return null;
          const correct = items.filter((i) => i.correct).length;
          return (
            <div key={d.id}>
              <span>{d.title}</span>
              <strong>
                {correct}
                <small> / {items.length}</small>
              </strong>
              <progress
                max={items.length}
                value={correct}
                aria-label={`${d.title} correct answers`}
              />
            </div>
          );
        })}
      </div>
      <div className="section-heading review-list-heading">
        <div>
          <h2>Review your answers</h2>
          <p>Follow the reasoning, then explore the source.</p>
        </div>
        <div className="segmented">
          <button
            aria-pressed={!onlyMissed}
            className={!onlyMissed ? 'selected' : ''}
            onClick={() => setOnlyMissed(false)}
          >
            All {session.items.length}
          </button>
          <button
            aria-pressed={onlyMissed}
            className={onlyMissed ? 'selected' : ''}
            onClick={() => setOnlyMissed(true)}
          >
            Missed {wrong}
          </button>
        </div>
      </div>
      {!visible.length && (
        <div className="panel success-empty">
          <CheckCircle2 size={27} />
          <h3>No missed questions in this session.</h3>
          <p>Keep exploring different topics to deepen your understanding.</p>
        </div>
      )}
      {visible.map((item) => (
        <details className="panel review-item" key={item.question.id}>
          <summary>
            <span className={`review-status ${item.correct ? 'right' : 'wrong'}`}>
              {item.correct ? <Check size={18} /> : <X size={18} />}
            </span>
            <span>
              <strong>{item.question.title}</strong>
              <small>{domainName(state, item.question.domainId)}</small>
            </span>
            <span className="review-verdict">{item.correct ? 'Correct' : 'Revisit'}</span>
            <ChevronRight size={17} className="details-chevron" />
          </summary>
          <div className="review-body">
            <p className="question-prompt">{item.question.prompt}</p>
            {item.question.code && (
              <pre className="review-code">
                <code>{item.question.code.text}</code>
              </pre>
            )}
            <ul className="review-options">
              {item.question.options.map((o) => (
                <li
                  key={o.id}
                  className={item.review.correctOptionIds.includes(o.id) ? 'right' : ''}
                >
                  <span>{o.text}</span>
                  <small>
                    {item.review.correctOptionIds.includes(o.id) ? 'Correct answer' : ''}
                    {item.selectedOptionIds.includes(o.id) ? ' · Your choice' : ''}
                  </small>
                </li>
              ))}
            </ul>
            <AnswerExplanation item={item} run={run} />
            <TutorLink sessionId={session.id} questionId={item.question.id} />
          </div>
        </details>
      ))}
    </div>
  );
}

function SessionHistory({ state, busy, open, navigate }) {
  const [modeFilter, setModeFilter] = useState('all');
  const shown = state.sessions.filter((s) => modeFilter === 'all' || s.mode === modeFilter);
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY SESSION COUNTS</div>
          <h1>Your study journal.</h1>
          <p>Return to your answers and see what you’ve learned.</p>
        </div>
        <button className="secondary" onClick={() => navigate('practice')}>
          Practice quiz
          <ArrowRight size={16} />
        </button>
      </div>
      <label className="confidence">
        Session mode
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option value="all">All modes</option>
          <option value="study">Study</option>
          <option value="adaptive">Adaptive</option>
          <option value="exam">Exam-style</option>
        </select>
      </label>
      <p>
        Adaptive accuracy reflects personalized selection. Exam comparisons use matching blueprint,
        allocation, size, scoring and timing settings.
      </p>
      {!shown.length ? (
        <section className="panel empty-history">
          <History size={38} strokeWidth={1.3} />
          <h2>A fresh page.</h2>
          <p>Your first quiz will appear here, ready to revisit.</p>
          <button className="primary" onClick={() => navigate('practice')}>
            Start practicing
            <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        <div className="panel history-list">
          <div className="history-labels">
            <span>SESSION</span>
            <span>PROGRESS</span>
            <span>RESULT</span>
            <span />
          </div>
          {shown.map((s) => (
            <button className="history-row" disabled={busy} key={s.id} onClick={() => open(s.id)}>
              <span>
                <strong>{domainName(state, s.domainId)}</strong>
                <small>
                  {date(s.startedAt)} · {s.mode} · {s.timingStatus}
                </small>
              </span>
              <span>
                <b>
                  {s.answered}/{s.total}
                </b>
                <small>
                  {s.completedAt ? 'Completed' : 'In progress'} · {s.priorExposureCount} previously
                  exposed
                </small>
              </span>
              <span>
                {s.completedAt ? (
                  <span>
                    <strong>{pct(s.correct, s.total)}%</strong>
                    <small>
                      {s.mode === 'exam' &&
                        s.comparisonKey &&
                        (() => {
                          const previous = state.sessions.find(
                            (x) =>
                              x.completedAt &&
                              x.startedAt < s.startedAt &&
                              x.comparisonKey === s.comparisonKey,
                          );
                          return previous
                            ? `${pct(s.correct, s.total) - pct(previous.correct, previous.total)} points vs previous comparable session`
                            : 'No comparable earlier result';
                        })()}
                    </small>
                  </span>
                ) : (
                  <Badge muted>Resume</Badge>
                )}
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function Settings({ state, busy, run, save, remove, openTutor }) {
  const [key, setKey] = useState('');
  const [sessionConsent, setSessionConsent] = useState(false);
  const c = state.credentials;
  return (
    <div className="page-enter narrow-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>Settings & sources.</h1>
          <p>Your connection, your content, and what comes next.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="section-heading">
          <div className="icon-title">
            <KeyRound size={22} />
            <h2>OpenAI connection</h2>
          </div>
          <Badge muted>{c.hasKey ? 'KEY STORED' : 'NO KEY STORED'}</Badge>
        </div>
        <p>
          Practice and cached reading remain available without AI. Storing a key does not activate
          AI; use the activation controls below.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const value = key;
            setKey('');
            await save({ key: value, sessionConsent });
          }}
        >
          <label htmlFor="settings-key">
            {c.hasKey ? 'Replace API key' : 'API key (optional)'}
          </label>
          <div className="key-form">
            <input
              id="settings-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your API key"
              maxLength={4096}
              disabled={busy}
            />
            <button className="primary" type="submit" disabled={busy || !key.trim()}>
              Store key
            </button>
          </div>
        </form>
        {!c.secureAvailable && (
          <label>
            <input
              type="checkbox"
              checked={sessionConsent}
              onChange={(e) => setSessionConsent(e.target.checked)}
            />
            Accept session-only key storage before storing a key
          </label>
        )}
        <div className="credential-foot">
          <span>
            <LockKeyhole size={14} />
            {c.storage === 'session'
              ? 'Kept in memory until you quit the app.'
              : c.secureAvailable
                ? 'Stored encrypted using your operating system.'
                : 'Secure storage unavailable. Keys are kept for this session only.'}
          </span>
          {c.hasKey && (
            <button className="danger-link" disabled={busy} onClick={remove}>
              Remove stored key
            </button>
          )}
        </div>
      </section>
      <DataManagement />
      <ProviderSettings
        parentBusy={busy}
        key={String(c.hasKey) + c.storage + c.revision}
        openTutor={openTutor}
      />
      <section className="panel settings-panel">
        <div className="section-heading">
          <div className="icon-title">
            <BookOpen size={22} />
            <h2>About the reviewed bank</h2>
          </div>
          <Badge muted>{state.totalQuestions} QUESTIONS</Badge>
        </div>
        <p>
          Adapted from Tim Warner’s public AZ-104 practice material under the MIT license. Wording,
          classifications, and explanations were reviewed against Microsoft documentation on
          September 6, 2026. These are independent practice items, not live exam questions.
        </p>
        <SourceButton url={state.blueprint.url} run={run}>
          Microsoft AZ-104 study guide · April 17, 2026
        </SourceButton>
        <div className="coverage-note">
          <strong>
            {state.coverage.covered} of {state.coverage.total} objective groups sampled
          </strong>
          <p>
            Question counts do not imply complete skill coverage. See Learning progress for
            uncovered skills. Objective groups without an eligible question:
          </p>
          <ul>
            {state.coverage.missing.map((o) => (
              <li key={o.id}>{o.title}</li>
            ))}
          </ul>
        </div>
        <details className="license-details">
          <summary>Attribution and MIT license</summary>
          <p>Copyright (c) 2021, Tim Warner</p>
          <p>
            Permission is hereby granted, free of charge, to any person obtaining a copy of this
            software and associated documentation files (the “Software”), to deal in the Software
            without restriction, including without limitation the rights to use, copy, modify,
            merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
            permit persons to whom the Software is furnished to do so, subject to the following
            conditions:
          </p>
          <p>
            The above copyright notice and this permission notice shall be included in all copies or
            substantial portions of the Software.
          </p>
          <p>
            THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
            LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
            OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
            OTHER DEALINGS IN THE SOFTWARE.
          </p>
        </details>
      </section>
      <section className="settings-roadmap">
        <Sparkles size={20} />
        <div>
          <h3>Coming later</h3>
          <p>
            Additional reviewed exercises and signed installers are planned for later releases.
            Guided attempts, evidence and cleanup tracking are available in Hands-on labs.
          </p>
        </div>
      </section>
    </div>
  );
}
