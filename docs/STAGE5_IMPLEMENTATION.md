# Stage 5 delivery — Durable targeted practice

Application **0.5.0**, database schema **5**, question contract **v3**, generation prompts **v2**, document registry **docs-2026-09-06-v2**.

**Status: implemented and verified.** Stage 4 is accepted as complete for now by the learner's explicit decision; its broader tutor evaluation remains deferred, not represented as performed. Stages 6–7 remain unimplemented.

## Delivered behavior

- **5A / S5-10–S5-15:** durable jobs, events, request checkpoints, pause/resume/cancel, failure recovery, one provider request at a time, and interactive tutor priority at request boundaries. A submitted request is never aborted merely to prioritize tutoring.
- **5B / S5-01–S5-04:** manual generation from session review, objective progress, and the queue; opt-in automatic generation with its own allowance under the shared app limit; completed-session trigger deduplication and overlapping queued-target coalescing; frozen learner evidence and approved source excerpts; separate misconception analysis and source-question issue reporting.
- **5C / S5-05–S5-07:** strict bounded output, local schema and cross-field checks, independent blind solve, separate answer/rationale/relevance/ambiguity review, duplicate rejection and family matching, quarantine, and no automatic regeneration of rejected candidates.
- **5D / S5-08–S5-09:** transactional idempotent publication, durable generated bank, AI labeling and inspectable evidence, shared issue reporting/retirement, study/adaptive opt-out, explicit exam inclusion, and immutable active sessions.
- **5E / S5-16–S5-17:** shared request usage and future-pass reservations, bounded processing, yielding similarity scans, failure-injection tests, actual Electron workflows, and live five-domain evaluation.

## User workflow and defaults

Activate AI in Settings with the existing protected key and saved daily limit. Generation and independent-review models can be changed in the same settings panel. New jobs freeze those choices; existing jobs retain their original settings and actual paid payloads.

Choose **Generate targeted practice** from completed review or an objective, select 1–5 candidates (default 3), and queue the job. Accepted questions automatically become available for new study/adaptive sessions. **Question generation** provides job controls, counts, source excerpts, review findings, usage, and retirement. A completed job can legitimately have zero accepted questions.

Automatic generation starts disabled. Enabling it requires a positive automation allowance no larger than the global daily limit. Only sessions completed after enabling are considered; sessions without eligible mistakes are skipped. Repeated completion observations cannot create duplicate work. Turning automation off pauses its unfinished jobs.

Jobs use a selected completed session or the latest 30 days of relevant evidence. Up to 50 responses are considered and up to three eligible mistakes are frozen for bounded analysis. The snapshot retains actual options, selections, confidence, assistance, prior exposure, question version, and family. Disputed, retired, and superseded questions cannot establish a weakness. Related queued targets are combined before freezing evidence; a batch does not promise to address every historical mistake.

Retrieval prefers exact skill mappings, then objective mappings only where a skill mapping is absent. It refreshes at most three approved articles, retains at most six ranked excerpts, and honors curated section mappings. Excerpts retain offsets, revision hashes, timestamps, URLs, and attribution. Metric-alert creation documentation was added after live evaluation identified the monitoring gap. Evidence older than 24 hours pauses further work and asks for a new job, preserving the old evidence.

Generation and review use the saved role assignments without fallback. There are four paid passes: analysis, generation, blind solve, and review. Analysis with no supported misconception or generation with no valid candidates skips unnecessary remaining passes. Review payloads include authored question fields rather than repeating provenance bundles. Input remains bounded to the provider's conservative 16,000-token estimate, output to the saved 256–16,000 token setting, and streamed text to 200 KB. Oversized contexts pause with a narrower-target/smaller-batch instruction.

## Durability, interfaces, and accounting

Schema 5 adds jobs, events, completion triggers, future-pass holds, candidates/findings, and published questions. Checkpoints/evidence are versioned JSON in durable job records; provider intents and results remain in the shared `ai_requests` ledger, linked by job and operation. Request and response IDs are retained when available. Migrations use the existing transactional migration and pre-upgrade backup mechanism.

The preload exposes a fixed `generation` interface: `list`, `read`, `settings`, `create`, `pause`, `resume`, `retry`, and `cancel`. Main-process methods validate targets and controls; renderer-supplied source excerpts, models, or answers cannot authorize publication. Session configuration gains validated `includeGenerated`. Question provenance has distinct public-adaptation and AI-generated branches; generated items are never described as MIT public adaptations or human-reviewed content.

Before paid dispatch, the queue holds conservative allowance for all remaining passes. Dispatch atomically converts the relevant hold into a request reservation and records the request checkpoint. Completed usage replaces that request reservation; future holds are recomputed without double-counting. Pausing/cancelling releases future-work holds, while unresolved submitted usage remains committed across UTC days. Tutoring and generation use the same global limit; automatic jobs additionally consume their explicit allowance. Expired pricing or inaccessible models cannot silently trigger fallback.

Local work stops on quit. Every launch still requires AI activation with the stored key; jobs waiting only for activation resume afterward. Deliberately paused jobs stay paused. Saved completed provider results are consumed locally before considering another submission. Confirmed unsent intents can resume safely. Unknown paid outcomes pause for a deliberate retry with a billing notice. `store:false` and `background:false` remain unchanged; a response ID is not presented as a recoverable remote result.

Only confirmed rate-limit rejections receive automatic retries, capped at three with exponential backoff and `Retry-After`. Network/5xx ambiguity is not treated as confirmed non-submission. Authentication, quota, model access, budget, stale evidence, and incomplete/refused outputs have explicit recoverable states. Pause finishes a safe checkpoint; cancellation blocks publication even if a late response arrives. If SQLite cannot save a terminal failure, an in-memory failure state stops the UI spinner and preserves the opportunity to recover the stored request after storage is repaired.

Publication rechecks cancellation, source-question eligibility, independent answer agreement, evidence IDs, family identity, and duplicates inside one transaction. Unique publication keys prevent repeated insertion. Historical attempts are never regraded. Similar variants share families through semantic review, with a conservative normalized token-overlap fallback of 0.65. Exact normalized prompt copies are rejected.

## Verification

- **99 Node tests passed**, including 34 stage 5 tests. Coverage includes migrations from stages 1/4, preserved active sessions, every paid-phase restart boundary, completed-result reuse, unknown usage, quota/authentication/model-access failure, cancellation during responses and immediately before publication, rate-limit retry caps, source expiry, unsavable checkpoints, duplicate/ambiguous/unsupported output, family grouping, generated filters, and retirement.
- ESLint and production build passed.
- **6 real Electron workflows passed**, including live Microsoft Learn retrieval. Generation coverage includes keyboard activation, reduced-motion mode, UI publication, narrow-window layout, navigation during provider work, immutable active quiz contents, and restart without paid activation. Screenshots were visually inspected. The navigation responsiveness assertion allows 1.5 seconds; it is a workflow regression threshold, not a general performance guarantee.
- Live generation/review used the learner's stored key and saved Sol/Astra assignments, current Microsoft Learn sources, and synthetic learner mistakes in isolated profiles. The normal profile received only evaluation accounting records; synthetic attempts and generated evaluation items were not inserted into the learner's bank.
- Four bounded evaluation runs recorded **$0.7975225** in conservative app-estimated usage, **no unresolved usage**, and remained within the existing **$2 daily limit**. The temporary reservations were reconciled to actual reported token usage. This is app accounting, not a provider invoice.

| Domain     | Final evaluation outcome                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Identity   | Independent solve found a second valid option; candidate rejected.                                |
| Storage    | Accepted a GRS troubleshooting scenario; retained its existing question family.                   |
| Compute    | Accepted a two-answer zone-placement scenario; exact cardinality and existing family preserved.   |
| Networking | Accepted an NSG scenario involving new versus established connections; existing family preserved. |
| Monitoring | Correctly identified frequency/lookback confusion; rejected a trivial timing-value rewrite.       |

The accepted answers/explanations and rejection findings were inspected against retained excerpts. The first live run exposed weak retrieval and repetitive generation; subsequent changes added bank context, improved section selection, corrected the metric-alert anchor, and preserved meaningful variation within existing families. Rejection remained enabled. No high-severity defect was found in the final accepted sample; automated review does not guarantee factual correctness.

Evidence: `STAGE5_LIVE_INITIAL.json`, `STAGE5_LIVE_EVALUATION.json`, `STAGE5_LIVE_MONITORING_INITIAL.json`, and `STAGE5_LIVE_MONITORING.json`. Earlier failed/zero-output evaluations are retained rather than erased. The main final run paused monitoring when its temporary reservation ceiling was reached; a separate bounded run completed that domain.

## Limits and follow-ups

- Small source bundles and uncalibrated automated review can yield rejected or quarantined batches. There is no human-review or complete syllabus-coverage claim.
- Stale sources, oversized context, and frozen inaccessible model choices may require a new job. Existing job evidence remains inspectable.
- The queue runs in the desktop process while the app is open; there is no daemon, hosted scheduler, remote response recovery, or guarantee of exactly-once provider billing.
- Broader tutor evaluation deferred from stage 4 remains deferred. Packaging, signed upgrades, portability, and long-lived-profile performance remain stage 7 work.

Official references checked during implementation: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Background mode](https://developers.openai.com/api/docs/guides/background), [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), and [metric alert creation](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-metric-alert-rule).

Source backup before implementation: `/private/tmp/az104-before-stage5.tar.gz`.
