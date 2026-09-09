# AZ-104 Desktop Study App — Research and Implementation Plan

Date: 2026-09-06
Project: /Users/michaliskaseris/Documents/dev/az-104-quiz
Status: Stages 1–2 are complete. This document retains the original planning context. [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) is the requirements baseline for stages 2–7 and supersedes the brief future-stage descriptions below.

## Product direction

Build a JavaScript desktop application that combines adaptive practice quizzes, a documentation reader with contextual tutoring, and short Azure exercises. Start with macOS and retain an architecture suitable for Windows and Linux. Use English initially. Work in small, reviewable milestones with a runnable result at each implementation stage.

The first launch offers an OpenAI API key field and “Continue without AI.” Remember that choice; allow adding, replacing, or removing the key in Settings. Without a key, bundled public practice questions, deterministic adaptive selection, saved progress, documentation navigation, and static labs remain available. New AI question generation and tutor chat require a valid key. Internet access is needed for uncached documentation and Azure exercises even without AI.

## Research findings and source strategy

The current [Microsoft AZ-104 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104) specifies objectives effective April 17, 2026:

| Domain                     | Exam weight |
| -------------------------- | ----------- |
| Identities and governance  | 20–25%      |
| Storage                    | 15–20%      |
| Compute                    | 20–25%      |
| Virtual networking         | 15–20%      |
| Monitoring and maintenance | 10–15%      |

Use this dated outline as the canonical taxonomy. Preserve its version on questions, documents, and reports. Maintain a curated mapping from each objective to official documentation rather than collecting arbitrary search results.

[Microsoft Practice Assessments](https://learn.microsoft.com/en-us/credentials/certifications/practice-assessments-for-microsoft-certifications) provide free example questions and explanations. Microsoft distinguishes these from actual exam questions. Link to the official assessment initially; its public availability does not establish an import API or redistribution permission. Do not promise automatic synchronization of assessment results.

[Tim Warner’s AZ-104 repository](https://github.com/timothywarner/az104) contains practice-question and scenario material and advertises an MIT license. It describes 2025 objectives. Treat it as a candidate source: inspect individual files, authorship and notices, verify answers against current Microsoft documentation, and pin a commit before bundling. Repository licensing should not be assumed to cover separately attributed third-party PDFs or linked paid products. Stage 1 subsequently imported 20 reviewed adaptations; the selected items and corrections are documented in [docs/CONTENT_AUDIT.md](docs/CONTENT_AUDIT.md).

[Microsoft’s AZ-104 labs](https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/) cover identity, governance, templates, networking, storage, compute, protection, and monitoring. The [source repository license](https://github.com/MicrosoftLearning/AZ-104-MicrosoftAzureAdministrator/blob/master/LICENSE) is MIT. Use reviewed lab material with its notices and attribution; break larger labs into focused exercises.

Every imported question needs its source URL, source revision, attribution/license, objective IDs, verified answer, explanation, and supporting documentation. Exclude material advertised as leaked live-exam content. If the candidate bank cannot cover an objective adequately, report the gap and select another reusable source before claiming coverage. Any original supplementary items must be labeled separately from imported public questions.

## Proposed architecture

- Electron desktop shell with React and Vite; JavaScript ES modules, JSX, JSDoc, and runtime schemas.
- SQLite for sessions, attempts, question versions, topic mastery, documentation metadata, highlights, chats, lab progress, and persistent jobs.
- Electron main process owns database access, credentials, network requests, and job coordination. A constrained preload bridge exposes validated operations to the UI.
- Renderer has context isolation and sandboxing, no Node integration, and a restrictive content security policy. Follow [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
- Store the API key encrypted using OS-backed [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage); keep decryption and OpenAI requests outside the renderer. If secure storage is unavailable, offer session-only credentials. Exclude credentials from logs and exports. Test signing/Keychain behavior when packaging for macOS.
- Use a worker for document processing and durable queue work. No hosted backend or Redis is needed for the first version.
- Keep user data in the OS application-data directory, separate from bundled content. Add schema migrations and eventual export/import.

Primary navigation: Dashboard, Quizzes, Documentation, Hands-on Labs, Settings. A persistent queue indicator opens a job panel.

## Quiz behavior and learning model

Support study sessions with immediate explanations and an exam-style mode with review after submission. Begin with single-choice and multiple-select questions; introduce richer case studies after the core engine works. Label exam-style scores as practice results, without presenting them as Microsoft’s scaled exam score or a calibrated probability of passing.

Save each submitted attempt transactionally: question version, displayed option order, selected option IDs, correctness, timestamp, duration, optional confidence, and whether hints were used. Stable option IDs prevent shuffling from changing scoring. Retain historical attempts when questions are revised.

Use an explainable topic-level scheduler before introducing complex statistics. Combine weak objectives, overdue reviews, and unseen material; cap immediate repetition and distinguish repeated memorization from success on unseen questions. Maintain broad topic coverage. Timed exam-style sessions use configured domain weights within the official ranges instead of weakness bias. The precise scheduling weights are initial heuristics to evaluate, not established measures of mastery.

Adaptation changes question selection and generation context; no model fine-tuning is required. Track question disputes separately from user mistakes so ambiguous items do not drive a false weakness signal.

## Documentation and contextual chat

Create a searchable library organized by exam objective, document, and heading. Prefer a sanitized in-app reader backed by reviewed Microsoft Learn sources, with an “Open original” link. Prototype extraction and content-use requirements on a small set before scaling. Do not rely on embedding arbitrary live websites to implement selection.

Highlighting text exposes “Ask tutor.” Typing @ opens search over topics, documents, and headings; selections become explicit reference chips. Persist each reference with canonical URL, heading/anchor, document revision/hash, selected quote and surrounding text, and offsets where useful. Detect outdated anchors after refresh rather than silently attaching highlights to the wrong passage.

Send selected context and relevant retrieved sections to the tutor. Responses should cite supporting sections, explain misconceptions, and identify missing evidence. Start with SQLite full-text search plus objective filters; evaluate semantic retrieval only if needed. Cached documents remain readable offline, while uncached entries show a clear network requirement.

## OpenAI model choices

Use the Responses API through the official JavaScript SDK. Proposed defaults, subject to a small evaluation set and access with the supplied key:

| Role                                   | Model         | Rationale                                                    |
| -------------------------------------- | ------------- | ------------------------------------------------------------ |
| Contextual tutor                       | gpt-5.6-terra | Documented balance of intelligence and cost                  |
| Question generation and lab adaptation | gpt-5.6-sol   | More demanding scenario construction                         |
| Optional difficult-item review         | gpt-6-astra   | Complex reasoning, enabled through an explicit model setting |

Official references: [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra). These are proposed workload assignments, not benchmark findings. Keep a configurable allowlist within the requested families. Verify account access and show unavailable-model errors; do not silently switch to a more expensive model. Track token usage and configurable generation budgets. Never require the user to paste a key into the development conversation.

Use [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for generated question objects. Schema conformance does not prove factual correctness.

## Background generation pipeline

After a completed quiz, coalesce evidence of weak objectives into a bounded job, avoiding one paid generation request per wrong answer. Provide a manual regenerate action as well.

1. Persist the job and a snapshot of relevant attempts/objective evidence.
2. Fetch current approved documentation for those objectives; preserve URL, retrieval time, hash, and relevant sections.
3. Compare the learner’s selected answers with documented behavior and identify plausible misconceptions.
4. Generate a small batch of original questions with answer keys, distractor explanations, difficulty, objective tags, and source references.
5. Validate schema, options, duplicate content, source references, and objective coverage. Use a separate answer-review pass for ambiguity and unsupported claims. Hold failed items for retry or rejection.
6. Publish accepted items atomically to the local bank, visibly marked as AI-generated, without modifying an active quiz.

Job states: queued, fetching, generating, validating, completed, failed, cancelled, paused. Show an animated spinner only while processing, with a stage label and elapsed time; respect reduced-motion preferences. Display queued counts, retry/cancel controls, and actionable error messages.

Persist checkpoints and provider response IDs. Use bounded retries with backoff for transient failures, pause on authentication/budget problems, and deduplicate publication. Reconcile an uncertain submission before retrying to reduce duplicate charges. Jobs recover after app restart. Local work pauses when the process exits; an already submitted provider background response may continue and can be reconciled on reopening. A separate always-running daemon is outside the initial scope.

[OpenAI background mode](https://developers.openai.com/api/docs/guides/background) supports asynchronous responses and polling. It can be used within the durable local queue, but does not replace application job persistence. Confirm model support and provider retention constraints when implementing recovery.

## Hands-on training

Start with reviewed 10–20 minute exercises. Each specifies prerequisites, required permissions, goal, estimated time, potentially billable resources, steps, expected evidence, hints, and cleanup. Example exercise candidates: scoped RBAC assignment, Blob soft-delete recovery, NSG rule reasoning, a small Bicep deployment, and a monitoring alert. Validate each against current documentation before release.

Users carry out the exercise in their own Azure environment. Initially collect checklist completion and pasted evidence, clearly distinguishing self-reported completion from verified results. AI can explain evidence and suggest the next exercise. Later, optionally add Azure authentication and narrowly scoped read-only verification. Automatic cloud provisioning is a separate future capability.

## Delivery stages and acceptance criteria

### 0 — Research and plan (completed)

Completed the source shortlist, architecture, model recommendations, and staged plan. The stage 1 audit is recorded in docs/CONTENT_AUDIT.md.

### 1 — Content contract and first offline quiz (completed)

Audit a small public-question sample, define the dated objective catalog and question schema, and scaffold Electron/React/SQLite. Implement first-run key-or-skip onboarding and a complete short quiz with answer review and saved attempts. Aim for 15–25 reviewed questions across all five domains if source quality permits; surface gaps explicitly.

Acceptance: app launches on macOS; skipping AI survives restart; a quiz can be completed without a key or network; scoring and saved attempts survive restart. Credential validation is added in stage 4, and onboarding must state that until connected.

### 2 — Adaptive selection and progress

Add topic evidence, review scheduling, quiz modes, history, confidence input, and dispute reporting.

Acceptance: synthetic histories demonstrate weak-topic prioritization, repeated-item limits, and broad coverage; exam-style selection follows its weights; interrupted sessions resume consistently.

### 3 — Documentation reader and annotations

Implement a small real documentation corpus, objective navigation, search, bookmarks/highlights, and @ reference chips with a contextual panel.

Acceptance: a selected passage and a heading reference restore exactly after restart; source links work; sanitized content cannot execute scripts; stale references are identified. Tutor activation follows in stage 4.

### 4 — OpenAI tutor

Implement key validation and secure persistence, model selection, streamed contextual chat, citations, usage display, cancellation, and offline/error states.

Acceptance: a valid key enables contextual explanations; invalid/revoked keys fail clearly; removing the key disables new AI calls; no key appears in renderer state, logs, or exports. Run a small live evaluation only with an available authorized test key.

### 5 — Durable custom-question queue

Implement the documented generation pipeline, validation, job panel, spinner, retries, recovery, and atomic publication.

Acceptance: a weak-topic history produces a source-backed batch; unsupported or malformed items are rejected; restart recovery does not duplicate published questions; existing quizzes remain responsive; rate limits and budget limits produce correct job states.

### 6 — Hands-on exercises

Release a small curated lab set with hints, evidence capture, cleanup, and progression from weak topics. Add AI adaptation when enabled.

Acceptance: a learner can complete and record a lab, revisit evidence, and follow cleanup; self-reported and verified completion are differentiated.

### 7 — Packaging and release hardening

Create a macOS package, test secure storage across builds, check keyboard access and reduced motion, verify migrations and data export/import, and audit source notices. Scope Windows/Linux packaging after macOS works.

Acceptance: installable app passes a clean first launch, offline quiz, restart, key removal, and data migration smoke test. Signing/notarization depend on the developer’s distribution setup.

## Stage 1 delivery record

Implemented Electron/React/SQLite with first-launch key-or-skip onboarding, 20 reviewed public-question adaptations, all-domain and focused quizzes, exact-match scoring, explanations and citations, immutable session snapshots, persisted selections, resume, completed session review, and key storage/removal. Four questions per domain sample 13 of 15 objective groups; the remaining groups and content corrections are listed in docs/CONTENT_AUDIT.md.

Verification on macOS: lint, production build, nine Node tests, a real Electron offline lifecycle test completing all 20 questions across four application launches, keyboard skip-link/IPC checks, narrow viewport overflow check, and a development Electron/Vite startup smoke check all passed. Screenshots of onboarding, overview, quiz, explanation, review, and settings were visually inspected.

No live OpenAI call, actual API-key validation, cloud deployment, adaptive scheduler, or release installer was added. Credential storage tests use an injected cipher; real macOS signing/Keychain behavior across releases remains a packaging-stage check. The editorial content audit is not a certification guarantee.

## Immediate next step

Stage 2 is complete: evidence, adaptive selection, content/issue handling, exam-style sessions, and progress review are delivered. See [the Stage 2 delivery notes](docs/STAGE2_IMPLEMENTATION.md). Stage 3 is also complete: the reader, local search, annotations, and contextual drafts are delivered. See [Stage 3 delivery notes](docs/STAGE3_IMPLEMENTATION.md). The next increment is Stage 4A, provider connection, as defined in the current roadmap.
