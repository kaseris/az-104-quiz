# AZ-104 Study Desk — Implementation Roadmap

Date: 2026-09-07  
Project root: `/Users/michaliskaseris/Documents/dev/az-104-quiz`  
Baseline: **Stage 6 is accepted complete by user decision on September 9, 2026; unverified lab drafts and deferred evaluation remain limitations. Stage 7 implementation and the unsigned v0.5.0 preview are released; manual verification remains open. Stages 1–3 are complete; Stage 4 is accepted as complete for now by user decision, with broader evaluation deferred; Stage 5 is implemented and verified.** See [Stage 2 delivery notes](docs/STAGE2_IMPLEMENTATION.md) and the content audit for verification and limitations.  
Scope: Stage 2–3 delivery records and requirements/delivery sequence for stages 4–7.

This document records completed Stage 2 delivery and is the implementation requirements baseline for the remaining stages. It supersedes the brief stage 2–7 descriptions in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), which retains the original research and architectural context. Each stage is delivered in small working increments, reviewed before proceeding to the next stage. This roadmap does not authorize implementing all stages in one pass.

## 1. Completed foundation

Stage 1 provides the Electron, React, JavaScript, and SQLite application; optional API-key storage; offline quizzes; answer explanations; immutable question snapshots; saved selections; restart recovery; session history; and source attribution. Correct session tiles show a green check and incorrect tiles show a red cross.

The original Stage 1 starter bank contained 20 reviewed public-question adaptations: four per domain, sampling 13 of 15 objective groups. Stage 2 expanded this to 100 items and 92 question families across all 15 groups, including ARM/Bicep and DNS/load balancing. The current bank samples 59 of 82 skills; 23 skill gaps remain explicit. See [docs/CONTENT_AUDIT.md](docs/CONTENT_AUDIT.md).

Stage 1 behavior and existing user data must remain supported throughout subsequent work. Its completion does not imply complete syllabus coverage or active AI capabilities.

## 2. Product requirements that apply to every stage

| ID   | Requirement                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-01 | Preserve a useful mode without an API key: public-question practice, local adaptation, progress, cached documentation, and curated lab instructions.                                             |
| P-02 | Distinguish “no AI” from “offline.” Uncached documentation, OpenAI requests, and work in Azure require their respective network connections.                                                     |
| P-03 | Keep the JavaScript/Electron architecture. Own credentials, database writes, retrieval, and model requests in trusted desktop processes; expose narrowly defined, validated IPC operations.      |
| P-04 | Preserve existing attempts and question snapshots. Content updates, model changes, and new scoring algorithms must not silently rewrite historical results.                                      |
| P-05 | Version the exam blueprint, question content, scoring rules, scheduler, prompts, and document snapshots when their behavior changes.                                                             |
| P-06 | Keep public, adapted, and AI-generated content distinguishable. Preserve source URLs, applicable notices, review dates, and provenance.                                                          |
| P-07 | Present study accuracy and evidence of learning without claiming an official exam score, guaranteed pass, or calibrated readiness prediction.                                                    |
| P-08 | Support keyboard navigation, visible focus, accessible names, adequate contrast, reduced motion, and narrow desktop windows. Status must be understandable without color alone.                  |
| P-09 | Provide useful loading, empty, offline, failure, cancellation, and retry states for each feature. Never leave an indefinite spinner after a terminal failure.                                    |
| P-10 | Store secrets through OS protection, with an explicit session-only fallback where necessary. Never return stored plaintext secrets to the renderer or include them in logs, content, or exports. |
| P-11 | Add transactional database migrations alongside each data-model change. Test migration from the stage 1 database and protect data before potentially destructive migrations.                     |
| P-12 | Keep this roadmap and the README aligned with implemented behavior. A planned feature must not appear active in the product.                                                                     |

Model names, capabilities, API details, pricing, Azure behavior, and the exam outline must be checked against official documentation during the relevant implementation stage. The model assignments and content dates inherited from the original plan are starting decisions, not permanently valid service guarantees.

## 3. Stage overview and dependencies

| Stage | Outcome                                                                                | Required dependencies                                  | AI key needed?                  | Status                                                           |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------- |
| 2     | Adaptive practice, meaningful progress, expanded public bank, and exam-style sessions  | Stage 1                                                | No                              | **Complete — 2A–2E**                                             |
| 3     | Searchable documentation reader, highlights, bookmarks, and `@` references             | Stage 1 storage; stage 2 objective mapping             | No                              | **Complete — 3A–3D**                                             |
| 4     | Documentation-grounded OpenAI tutor                                                    | Stage 3 reader/retrieval; stage 2 learning evidence    | Yes for chat                    | Complete for now; evaluation deferred                            |
| 5     | Durable background generation of personalized questions                                | Stages 2–4                                             | Yes for generation              | Complete — 5A–5E                                                 |
| 6     | Curated Azure exercises with optional AI assistance                                    | Stages 2–3 for core labs; stages 4–5 for AI adaptation | No for curated labs; yes for AI | Accepted complete by user; draft verification remains deferred |
| 7     | Installable macOS/experimental Windows release, reliable upgrades and data portability | Stages 2–6 integrated                                  | Optional; see verification record | Unsigned v0.5.0 preview released; manual verification open              |

Storage, accessibility, content quality, and security work happens within each stage. Stage 7 verifies the integrated product; it is not the first point at which these concerns are addressed.

## 4. Stage 2 — Adaptive practice and learning progress — Complete

**Completed: 2026-09-06 · Application version: 0.2.0 · Requirements S2-01–S2-19 implemented.**

Verification: 26 passing Node tests, clean lint and production build, and two passing real Electron workflows on the final run. Migration/restart checks used isolated profiles; no normal user profile was changed during implementation. Detailed behavior and verification are recorded in [docs/STAGE2_IMPLEMENTATION.md](docs/STAGE2_IMPLEMENTATION.md).

The content gate is met: 100 reviewed items in identity/storage/compute/networking/monitoring counts of 23/18/24/20/15, with 92 families and enough eligible content for the fixed 50-question allocation of 12/9/12/10/7. This does not imply complete skill coverage or a calibrated readiness prediction.

**API-key status:** Stage 2 features require no key. A supplied key is stored but is neither validated nor sent to OpenAI. Stage 3 also has no live AI responses; tutoring starts in Stage 4.

### Outcome

The app uses saved answers to suggest useful practice, explains those suggestions, and offers a separate exam-style experience. The learner can distinguish a knowledge gap from insufficient evidence or repeated exposure to the same item.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2-01 | Extend the objective catalog from broad groups to stable skill identifiers, using the selected exam blueprint. Map questions to a primary assessed skill and optional related skills. Do not multiply one attempt into several independent pieces of mastery evidence.                                                                                  |
| S2-02 | Preserve raw attempt evidence: question/version, selected answers, result, submission time, duration, mode, and whether an explanation or hint had already been seen. Add optional confidence recorded before submission: unsure, somewhat sure, confident, or omitted.                                                                                 |
| S2-03 | Calculate objective-level accuracy, distinct questions attempted, recent performance, first-attempt performance, last-practiced time, and review due dates. Separate assisted/repeated performance from first-attempt evidence.                                                                                                                         |
| S2-04 | Show evidence states such as unpracticed, insufficient evidence, needs review, and improving. Publish the criteria in the implementation notes. Do not label an objective mastered merely because one repeated question was answered correctly.                                                                                                         |
| S2-05 | Add Adaptive practice alongside the existing all-domain and focused practice options. Keep the existing modes available.                                                                                                                                                                                                                                |
| S2-06 | Select adaptive questions from weak objectives, due reviews, and unseen material. Use a documented, versioned heuristic; begin with a proposed 50% weak / 30% due / 20% unseen allocation, then evaluate it with synthetic learner histories before finalizing defaults.                                                                                |
| S2-07 | Deduplicate overlapping selection pools and question families. Use a configurable cooldown for immediate repeats. If the bank is too small, explain the limitation and offer a shorter session or an explicitly repeat-heavy review. Never silently duplicate an item to fill a quiz.                                                                   |
| S2-08 | Preserve broad domain coverage in all-domain adaptive practice when the requested length and eligible bank permit it. Allow the learner to intentionally restrict practice to selected domains. Treat lack of eligible coverage as a visible gap.                                                                                                       |
| S2-09 | Display a concise selection reason such as “Recently missed,” “Due for review,” or “Not practiced yet.” Record scheduler version, selection reason, and tie-breaking seed so a session can be explained and reproduced.                                                                                                                                 |
| S2-10 | Add an objective progress view with evidence counts, recent trends, coverage gaps, and links to relevant practice. Separate performance from syllabus coverage. Label adaptive trends separately from results in comparable fixed-distribution sessions.                                                                                                |
| S2-11 | Add local question-issue reporting with categories such as ambiguity, incorrect answer, outdated content, or broken reference. Exclude disputed items from new adaptive sessions and weakness calculations while unresolved; preserve the original attempt and score.                                                                                   |
| S2-12 | Provide a local issue list with pending, corrected, dismissed, and retired outcomes. A disputed item cannot silently return to selection. Corrected content receives a new version. A dismissed issue can restore the item with an explanation.                                                                                                         |
| S2-13 | Expand the reviewed public bank, retaining licensing and per-item documentation review. Target at least 100 approved questions, distributed to support exam-style sampling and with at least one item in every objective group. Report individual skills that remain uncovered.                                                                         |
| S2-14 | Add exam-style sessions with a frozen question set and domain allocation based on the versioned outline. Proposed percentage distribution for the inherited outline: identity 23, storage 18, compute 24, networking 20, monitoring 15. Use deterministic largest-remainder allocation for integer counts. Revalidate weights when the outline changes. |
| S2-15 | Before creating an exam-style session, check that the bank contains enough eligible, distinct items in each domain. Block unsupported sizes with a clear explanation rather than breaking allocation or inserting repeated items. Offer 50-question sessions once coverage permits.                                                                     |
| S2-16 | In exam-style mode, allow navigation, answer changes, unanswered questions, and flags before final submission. Save drafts. Hide correctness, answer explanations, and any tiles that reveal correctness until the session is finalized. After finalization, answers are immutable.                                                                     |
| S2-17 | Support timed and untimed exam-style practice. Display the chosen duration as an app practice setting, not a claim about official exam duration. Warn before voluntary submission with unanswered questions. Count unanswered items as incorrect in the completed practice score.                                                                       |
| S2-18 | Persist timed-session start and deadline. Closing or restarting the app does not reset or pause the countdown. Explain this before starting. On reopening after expiry, finalize once using saved drafts. Define and test clock-change handling; a backward wall-clock change must not grant extra time.                                                |
| S2-19 | Preserve the existing study-session behavior: immediate feedback, durable drafts, resume, and correct/incorrect tile markers. Persist session mode so restart cannot change feedback or grading behavior.                                                                                                                                               |

### Delivery increments

- [x] **2A — Evidence and migrations:** versioned skill mapping, optional confidence, preserved legacy evidence, rebuildable statistics, and safe migrations/backups.
- [x] **2B — Adaptive scheduler:** seeded selection, pool/family deduplication, configurable cooldown, coverage checks, and recorded reasons. Retained the 50/30/20 heuristic after synthetic-history checks.
- [x] **2C — Content and quality:** 100 audited items, local issue workflow, explicit version corrections, and persistent retirement.
- [x] **2D — Exam-style sessions:** weighted frozen sampling, navigation/flags, delayed feedback, immutable finalization, and durable timer recovery.
- [x] **2E — Progress review:** domain/objective/skill evidence, trends, coverage gaps, practice links, and mode-aware history/comparisons.

### Recorded decisions and remaining follow-ups

- **Skill coverage:** 23 of 82 skills remain uncovered. This is a documented content-expansion follow-up, not a failed Stage 2 gate; see [the exact skill-gap list](docs/STAGE2_SKILL_GAPS.json).
- **Editorial basis:** the 80 additions adapt licensed public instructional material and were authored and editorially checked with AI assistance. Their audit does not claim independent human sign-off or executed Azure validation. Continue reviewing reported content; see [the per-item audit](docs/STAGE2_CONTENT_AUDIT.json).
- **Timing policy (S2-18):** verified elapsed time is consumed across restart; verified expiry finalizes saved drafts once. Detected rollback or unverifiable restart timing switches to **timing invalid / untimed**, retaining the original timing metadata and excluding the result from timed comparisons. This implements the explicitly selected Stage 2 policy; it does not grant additional valid timed-practice time.
- **Evidence wording:** a profile with no responses is **unpracticed**; fewer than three distinct practiced families is **insufficient evidence**. Neither state is a knowledge-gap or mastery claim.
- **Desktop test stability:** one preceding run lost its Electron window during the onboarding screenshot. The full final rerun passed; the cause was not established. Investigate if it recurs rather than treating it as resolved by a known fix.
- **Learning effectiveness:** scheduler tests establish functional behavior, not empirical learning effectiveness or pass prediction. Future evidence can justify a new heuristic version.

### Data and service changes

Add versioned skill mappings, attempt confidence/assistance metadata, derived objective statistics, review schedules, scheduler decisions, question-family identifiers, item eligibility/issues, session mode, flags, deadline, and finalization state. Derived statistics must be rebuildable from preserved evidence. Backfill legacy attempts with explicit unknown/default values rather than inventing confidence or assistance history.

### Acceptance criteria — verified

- [x] Existing stage 1 sessions and scores survive migration unchanged.
- [x] Synthetic histories demonstrate that repeated mistakes increase relevant practice, unseen material remains represented, and recently repeated items do not inflate learning estimates.
- [x] A cold-start profile receives broad practice and an unpracticed state; limited initial evidence is labeled insufficient evidence.
- [x] Overlapping pools do not cause duplicates; limited banks produce accurate explanations and supported session lengths.
- [x] A disputed item is excluded from new adaptive selection and derived weakness evidence while its historical attempt remains visible.
- [x] The public bank meets the agreed stage 2 content target, with an auditable source record and explicit remaining skill gaps.
- [x] Exam-style domain counts match the configured allocation; weak-topic history does not bias them.
- [x] Exam-style correctness remains hidden until finalization, including after restart.
- [x] Timed expiry, early submission, unanswered items, navigation, and restart cannot cause double finalization or score changes.

### Out of scope

AI-generated questions, model fine-tuning, documentation chat, and simulated live Azure exam labs.

## 5. Stage 3 — Documentation reader and references — Complete

**Completed: 2026-09-06 · Application version: 0.3.0 · Requirements S3-01–S3-13 implemented.**

Verification: 46 passing Node tests, clean lint and production build, and four passing real Electron workflows, including live Microsoft Learn prose/table/code retrieval and offline annotation/draft/cache recovery. All 16 registry entries passed the live extraction/source-provenance audit. Tests used isolated profiles; normal learner data was not changed. See [Stage 3 delivery notes](docs/STAGE3_IMPLEMENTATION.md), [document audit](docs/DOCUMENT_SOURCE_AUDIT.json), and [source notices](docs/DOCUMENT_SOURCES.md).

The library covers all 15 objective groups with explicit mappings to 18 of 82 skills; 64 reader skill gaps remain visible and separate from the question bank's coverage gaps. Embedded media link to the original source. Highlights require a unique passage in one section. Live tutor responses remain unavailable, and no API key is required.

### Outcome

The learner can navigate exam material inside the app, search it, save highlights, and assemble precise references for the tutor introduced in stage 4.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3-01 | Maintain a curated registry of official documentation mapped to domains, objective groups, and skills. Cover all objective groups with at least one useful entry and expose unresolved skill-level gaps.                                                                                                      |
| S3-02 | Fetch permitted source formats in a trusted process and convert them into a sanitized reader representation. Check applicable content-use requirements before storing or redistributing source material. Where an article cannot be imported, show a working external link and explain the reader limitation. |
| S3-03 | Preserve headings, lists, tables, links, and code blocks needed to understand the material. Strip scripts, embedded executable content, and unsafe URLs. Avoid making annotation behavior depend on an arbitrary live-site iframe.                                                                            |
| S3-04 | Give each document and section a stable application ID, canonical URL, title, objective mapping, retrieval timestamp, and content revision/hash. Record redirects and source update metadata when available.                                                                                                  |
| S3-05 | Provide a domain/skill library, document table of contents, in-document heading navigation, and full-text search with section-level results and useful excerpts. Start with local full-text indexing; add semantic retrieval only if evaluated search failures justify it.                                    |
| S3-06 | Support bookmarks and persistent text highlights. Store the quote, nearby text, section ID/anchor, offsets where useful, and source revision so a highlight can be recovered reliably.                                                                                                                        |
| S3-07 | After a document refresh, reattach highlights only when the match is reliable. Mark unresolved or changed references as stale and preserve the original quote for review. Never silently point an old highlight at unrelated text.                                                                            |
| S3-08 | Provide an “Ask tutor” action on selected text and an `@` reference picker for domains, documents, headings, and saved highlights. Selected references become removable chips with a context preview.                                                                                                         |
| S3-09 | Until stage 4 is implemented, let users collect and retain contextual question drafts while clearly labeling tutor responses as unavailable. Do not simulate an AI answer.                                                                                                                                    |
| S3-10 | Make cached documents, highlights, bookmarks, and local search usable offline. Uncached entries must explain that retrieval needs a connection. Expose last refresh time and refresh failures.                                                                                                                |
| S3-11 | Connect question explanations and weak-objective suggestions to the appropriate reader section. Keep an “Open original” action available.                                                                                                                                                                     |
| S3-12 | Add bounded cache storage, an inspection/refresh interface, and cache clearing that does not delete annotations. Preserve referenced snapshots or explicitly mark references unavailable if content is removed.                                                                                               |
| S3-13 | Restrict retrieval to approved HTTPS sources, including redirects and embedded resources. Reject local/private-network targets and oversized or unsupported responses. Treat retrieved text as reference data, never as application instructions.                                                             |

### Delivery increments

1. **3A — Retrieval prototype:** demonstrate reliable extraction and rendering of representative prose, tables, and code pages; establish source-use handling.
2. **3B — Library and search:** implement the registry, objective navigation, section indexing, and question-to-document links.
3. **3C — Annotations:** implement highlights, bookmarks, revision tracking, and stale-reference repair.
4. **3D — Context assembly:** add selection actions, `@` search, reference chips, and persistent tutor drafts.

### Data and service changes

Add source registry entries, document versions, section records, search index, fetch status, annotations, bookmarks, and context references. A reference must identify a version as well as a document; later chat cannot assume that today's article matches an earlier conversation.

### Acceptance criteria

- Representative documents render correctly, and code/table content remains usable.
- Searching an exam topic returns relevant sections and opens the selected result.
- Highlights and `@` references survive restart with the correct quote and section.
- A controlled source edit either preserves a reference correctly or marks it stale; it never silently changes meaning.
- Cached reading/search works offline, while missing content and retrieval failures are actionable.
- Remote content cannot execute scripts or access desktop APIs.
- The reader exposes source identity and freshness without requiring the user to inspect implementation details.

### Out of scope

Live tutor answers, broad unrestricted web browsing, automatic mirroring of all Microsoft Learn, and cloud synchronization of annotations.

## 6. Stage 4 — OpenAI contextual tutor

**Accepted as complete for now by explicit user decision on 2026-09-06.** Remaining broad tutor evaluation is deferred, not recorded as performed; it does not block Stage 5.

### Outcome

With a valid OpenAI API key, the learner can ask questions about selected documentation, referenced sections, and their own mistakes, receiving explanations with verifiable citations.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S4-01 | Add connection validation to first-run setup and Settings. A stored stage 1 key starts as unverified. Distinguish missing key, invalid key, inaccessible model, network failure, and quota/billing failure. A connectivity failure must not be described as an invalid key.                   |
| S4-02 | Provide model selection within the requested GPT-5.5, GPT-5.6, and GPT-6 families. Revalidate exact API identifiers and account access during implementation. Initial proposed roles: GPT-5.6 Terra for tutoring, GPT-5.6 Sol for generation, and optional GPT-6 Astra for difficult reviews. |
| S4-03 | Keep model settings role-specific and record which model produced each response. Do not silently switch to a more expensive model when access fails.                                                                                                                                          |
| S4-04 | Use the supported OpenAI API and official JavaScript SDK from a trusted desktop process. Keep the provider integration behind a service boundary shared by later generation jobs.                                                                                                             |
| S4-05 | Provide a chat panel associated with the current document, selection, or quiz review. Persist conversations, user messages, context chips, response state, and model metadata. Support a new conversation and deletion of an existing conversation.                                           |
| S4-06 | Resolve `@` chips to explicit source sections and allow users to preview/remove included context before sending. For a wrong-answer explanation, include the actual question version, selected options, reviewed answer, and relevant documentation.                                          |
| S4-07 | Retrieve a bounded amount of relevant documentation for each turn. Prefer explicit user references, then relevant indexed sections. Avoid uploading the entire local library or complete learning history unnecessarily.                                                                      |
| S4-08 | Stream answers, support cancellation, and preserve partial responses with a clear interrupted status. Retrying must be an explicit action after uncertain completion. Handle app closure and disconnected streams without pretending the answer finished.                                     |
| S4-09 | Require citations for documentation-dependent claims. Citation links must resolve to supplied or successfully retrieved source sections; do not display invented URLs as verified references. Explain when supporting material is missing or conflicting.                                     |
| S4-10 | Encourage explanations of concepts and misconceptions, with examples and follow-up checks. Keep hints distinct from revealing an answer. Record tutoring assistance where it affects stage 2 learning evidence.                                                                               |
| S4-11 | Explain during AI activation what context is sent to OpenAI and that API usage is billed separately. Show per-response/session usage and estimated cost where reliable pricing and usage metadata are available; label unavailable or estimated figures accurately.                           |
| S4-12 | Add configurable spending/token limits and enforce limits before new work is dispatched. Count known in-flight work conservatively. Estimates are not a guarantee of the provider's final bill.                                                                                               |
| S4-13 | Removing or disabling a key blocks new AI requests immediately and attempts to cancel ongoing work where supported. Explain that already submitted work may still incur usage. Keep prior conversations available locally.                                                                    |
| S4-14 | Keep source text and user-provided evidence separate from trusted agent instructions. The tutor may retrieve approved references but must not execute arbitrary shell commands or perform Azure changes.                                                                                      |
| S4-15 | Degrade cleanly to local study when AI is unavailable. Never prevent a public-question quiz, saved review, or cached reader from opening because an AI service failed.                                                                                                                        |

### Delivery increments

1. **4A — Provider connection:** key validation, model availability, request service, and explicit activation states.
2. **4B — Grounded conversation:** contextual messages, retrieval, streaming, and clickable citations.
3. **4C — Lifecycle and usage:** persistence, cancellation, retry/error states, cost display, limits, and key removal.
4. **4D — Tutor evaluation:** validate explanations, grounding, missing-evidence handling, and integration with learning evidence.

### Data and service changes

Add provider settings, role-to-model assignments, validation status, conversations/messages, immutable context snapshots, citation records, request state, and usage records. Do not persist secrets in these tables. Separate a draft user message from an acknowledged request and a completed response.

### Acceptance criteria

- A user can activate chat with an accessible model, receive a contextual answer, and open its cited sections.
- Missing/revoked keys, inaccessible models, offline operation, and quota errors produce distinct actionable states.
- Key removal prevents subsequent dispatch; stored credentials never appear in logs, exports, or public IPC results.
- Closing/reopening restores conversation context and clearly identifies interrupted responses.
- A curated evaluation set spans all domains, incorrect-answer explanations, ambiguous questions, absent evidence, and misleading instructions embedded in reference text. No unresolved high-severity grounding failure remains before marking the stage complete.
- Run live integration checks only with an authorized test key; record usage. Mocked provider tests do not substitute for at least one successful real request when declaring the integration verified.
- Offline stage 1/2/3 workflows still pass.

### Out of scope

Custom-question publication, model fine-tuning, unrestricted agent tools, and automatic Azure execution.

## 7. Stage 5 — Personalized questions on a durable background queue

**Complete — 5A–5E · Application 0.5.0 · Schema 5.** See [Stage 5 delivery notes](docs/STAGE5_IMPLEMENTATION.md) for defaults, verification, live evaluation, and limitations.

### Outcome

The app studies the learner's response history against current documentation and produces additional practice questions asynchronously, while existing quizzes remain responsive.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S5-01 | Provide a manual “Generate targeted practice” action and an explicit setting for automatic generation after completed sessions. Enable automatic paid work only after the learner configures it, including a usage limit.                                                                                  |
| S5-02 | Aggregate mistakes and confidence signals into an evidence snapshot. Coalesce related work and avoid launching one generation request for every wrong answer. Do not mistake a disputed or outdated question for reliable evidence of a learner weakness.                                                  |
| S5-03 | Before generating, retrieve relevant approved documentation, compare it with the actual selected answers and reviewed question version, and identify supported misconceptions. If the original item appears incorrect, flag it for review instead of reinforcing its answer.                               |
| S5-04 | Save source URLs, section IDs, document revisions/hashes, fetch time, evidence snapshot, model, prompt version, and generation settings with each job. Missing current evidence must pause or fail the job with an explanation.                                                                            |
| S5-05 | Generate bounded batches of original questions with stable IDs, answer type/count, options, correct answers, distractor rationales, objective mapping, difficulty estimate, explanation, and source evidence. Adapt the question schema to support AI provenance without losing public-source provenance.  |
| S5-06 | Validate schema, option uniqueness, answer cardinality, topic relevance, source resolution, and duplication. Group paraphrases into question families so superficial variants do not count as independent mastery evidence.                                                                                |
| S5-07 | Perform a separate answer/ambiguity review against source excerpts, including an independent solve where useful. A second model response is supporting review, not proof of correctness. Reject or quarantine ambiguous and unsupported candidates.                                                        |
| S5-08 | Publish only accepted items, atomically and idempotently, into the local eligible bank. Label them AI-generated and show their evidence in review. Never insert new items into an already active quiz.                                                                                                     |
| S5-09 | Integrate generated items with stage 2 selection and issue reporting. Let users exclude generated content from new quizzes and retire individual generated items without erasing historical attempts. Default exam-style sessions to the reviewed public bank; make inclusion of generated items explicit. |
| S5-10 | Persist jobs with stage, timestamps, progress events, retry count, next retry time, cancellation state, provider request/response IDs when available, and publication identifiers. Persist work before dispatch.                                                                                           |
| S5-11 | Implement queued, fetching, generating, validating, completed, failed, cancelled, and paused states. Show a spinner only for active processing, with a meaningful phase, elapsed time, queue count, and accessible status. Honor reduced motion.                                                           |
| S5-12 | Expose a job panel with per-job details, accepted/rejected counts, retry, pause/resume, and cancel. A cancellation must prevent later publication even if a provider response arrives afterward.                                                                                                           |
| S5-13 | Use bounded concurrency, response-size limits, backoff for transient errors, and capped retries. Pause rather than repeatedly retrying authentication, quota, model-access, or configured-budget failures. Prioritize interactive tutoring over optional generation.                                       |
| S5-14 | Recover jobs after app restart using durable checkpoints. Reconcile known provider responses before resubmitting. If submission outcome is unknown and cannot be reconciled, show an indeterminate state and require a deliberate retry rather than risking repeated paid requests silently.               |
| S5-15 | Explain process lifetime accurately: local queue work pauses when the app quits. A provider-side job may continue after submission; inspect it on reopening where supported. Do not imply an always-running desktop daemon.                                                                                |
| S5-16 | Share usage accounting and model-role settings with stage 4. Account for generation and validation passes, reserve for in-flight work, and surface actual usage when reported.                                                                                                                             |
| S5-17 | Test responsiveness while fetching, generating, validating, and publishing. Keep CPU-intensive parsing/validation away from the renderer and move heavier work off the desktop event loop as needed.                                                                                                       |

### Delivery increments

- [x] **5A — Durable queue:** database states, worker coordination, visible status, cancellation, and crash recovery using deterministic fake jobs.
- [x] **5B — Evidence and retrieval:** learner-evidence snapshots, current document retrieval, and misconception analysis.
- [x] **5C — Generation and review:** bounded output, schema validation, independent review, duplicate detection, and quarantine.
- [x] **5D — Publication and adaptation:** atomic insertion, provenance display, selection eligibility, and report/retire controls.
- [x] **5E — Reliability evaluation:** ambiguous dispatch, restart, quota, cancellation races, usage limits, and UI responsiveness.

### Data and service changes

Add durable job/event/checkpoint records, retry schedules, evidence bundles, provider response references, candidate questions, validation findings, publication keys, generated-item provenance, and question-family relationships. Keep a stable relationship from an accepted question back to its generation and review evidence.

### Acceptance criteria

- A known pattern of learner mistakes produces relevant questions supported by retrieved documentation.
- Invalid, ambiguous, duplicate, or unsupported candidates do not enter the eligible bank.
- Accepted questions have inspectable provenance and correct answer-count behavior.
- Closing the app at each queue phase and reopening does not lose acknowledged work or publish duplicates.
- An uncertain paid submission is surfaced rather than blindly repeated; exactly-once billing is not falsely promised.
- Cancelling at any phase prevents future publication; job status reflects remaining provider uncertainty accurately.
- Active quizzes keep their original question set and remain usable during generation.
- Offline, invalid-key, rate-limit, and budget conditions leave clear recoverable states; completed/failed jobs do not keep spinning.

### Out of scope

A hosted scheduler, an always-on local daemon, unlimited crawling, training custom models, and guaranteed factual correctness solely from automated review.

## 8. Stage 6 — Hands-on Azure training

### 6D.2 complete — optional reviewed guidance adaptations (2026-09-09)

- **Delivered:** saved lab attempts offer **Optional adapted guidance** with beginner, concise-refresher or challenging-reflection styles. One adaptation supplies an explanation, two or three conceptual hints and a reflection question/answer around the frozen exercise. The original objective, version, method, Azure walkthrough, expected results, resources, permissions, costs and cleanup are preserved. This bounded increment adapts learning guidance; it does not rewrite cloud execution steps or add services.
- **Preview/authorization:** **Preview adaptation context** shows the frozen exercise, selected style, exact retained documentation excerpts, generation/review models and per-pass output limit. It makes no AI request, although it may retrieve approved documentation. Notes, pasted output, reflection answers, quiz evidence and conversation history are never included. Preview records are non-runnable until **Queue paid adaptation and review** explicitly authorizes two passes, requires active AI and checks the ten-minute preview expiry. Retrying the same enqueue request reuses its job. Generic resume/retry cannot bypass preview confirmation.
- **Review gate:** generation and review use distinct configured models. Closed output schemas, source-reference checks and rejection of executable command blocks precede the independent documentation review. A proposal is accepted only with an accepted verdict, valid sources and positive grounding/objective/execution checks; otherwise it is quarantined/rejected or fails validation. Pending and unaccepted proposals cannot be opened as reviewed guidance. Accepted guidance requires **Open reviewed guidance** and is labeled **AI-generated · independently AI-reviewed · not Azure-verified**, with source excerpts, revisions, timestamps, model/prompt provenance and first opening time. Users can dismiss it. No catalog exercise is released and no new verified lab is counted because of AI review.
- **Queue/provider reuse:** adaptation jobs share the existing generation tables, checkpoints, provider scheduler, reservations, daily limit, output/input ceilings, one-request concurrency, pause/resume/cancel and deliberate retry controls. Holds cover the remaining two passes rather than the question pipeline’s four; unknown submitted usage remains reserved. Restart preserves generated/reviewed checkpoints and waits for AI reactivation before further paid work. Jobs are shown with their saved lab instead of being mislabeled as question-generation jobs. There is no database migration, automatic adaptation trigger or question-bank publication.
- **Documentation:** registered the two existing pilot attribution sources—Microsoft’s tagging CLI and VNet management articles—with explicit skill mappings and review date 2026-09-09. Both pass a live retrieval/public-repository/extraction audit in [LAB_ADAPTATION_SOURCE_AUDIT.json](docs/LAB_ADAPTATION_SOURCE_AUDIT.json). VNet now identifies a public YAML source; the reader accepts `.yml` alongside `.md` while retaining the same approved public-repository restriction, with tests rejecting private repositories and unsupported extensions. Current registry counts are **19 articles / 21 of 82 skills / all 15 objective groups**; README/source notices now reflect those measured counts. Other reader coverage gaps remain explicit.
- **Validation actually run:** `npm run check` passed lint, **135/135 Node tests** and production build. Eight focused adaptation tests cover explicit approval, distinct-model review, accepted/rejected/quarantined states, command/source validation, privacy, no quiz/lab mutations, preview expiry, disabled AI, stale evidence, budget holds, restart/deduplication, cancellation, deliberate unknown-usage retry and YAML provenance. Six real Electron scenarios passed: the new preview → activation gate → mocked generation/review → explicit opening → restart/dismiss flow, the existing question queue workflow, and four existing lab/tutor workflows. The adaptation screenshot was inspected at 900×760; no horizontal overflow or renderer error occurred. No paid AI requests or Azure resource changes were made; live network checks retrieved documentation only.
- **Requirement coverage:** S6-09 optional reviewed guidance adaptation delivered using the Stage 5 queue; S6-02–03 original mappings/resources/cost constraints preserved; S6-05 first adapted-guidance opening recorded; S6-07 explicit context preview and exclusion of personal evidence; S6-08 AI-review/Azure-verification distinction; S6-10 no-key access to saved guidance/core labs; S6-11 learner-only execution and S6-12 independent cleanup preserved. Adaptations never affect quiz accuracy or completion evidence.
- **Limits:** independent AI review is not human review or executed Azure validation, and may miss errors. Only supplemental teaching guidance is adapted; changed resource names/ranges, executable workflows, new services and file attachments remain outside this increment. An oversized response/context or stale/missing documentation stops the job instead of publishing unreviewed guidance. A live paid-model quality evaluation was not performed. The two original pilots remain the only released exercises; the 6A.3 storage/ARM drafts still require four user walkthrough reports.

**Next: finish 6A.3 batch 1 user walkthroughs/review, then expand in two-exercise batches until at least ten verified exercises cover every domain twice.** 6B, 6C and 6D implementation increments are delivered; **Stage 6 remains incomplete because content verification/coverage is still outstanding.**

### 6D.1 complete — optional contextual lab tutoring (2026-09-08)

- **Delivered:** saved lab attempts now offer **Optional lab tutor**, opening the existing tutor in conceptual-hint mode. Each conversation is linked to that attempt’s frozen exercise/version, objective, method, goal, prerequisites, resources, costs and cleanup instructions. Explanation mode may include expected results and the current previously revealed walkthrough step; hint mode omits those solution fields and the reflection answer. The tutor does not update/release exercises, grade evidence, execute commands or alter learning/cleanup states.
- **Sharing and preview:** notes, pasted output and reflection are excluded by default. Users can explicitly select them, edit a local sharing copy to remove identifying/private text, or deselect them. The original attempt evidence remains unchanged. The full lab context is shown before **Send to tutor** and retained with the answer. Previewing makes no AI request. Prior conversation turns are omitted for lab requests so older sensitive evidence cannot silently return after deselection; needed follow-up context must be included explicitly. Selected sharing fields reset after a successful send. Conversation drafts and sent context are retained locally until removed through existing conversation deletion.
- **Evidence boundaries:** lab definitions and learner reports are untrusted study context, not independently verified Azure state or authoritative documentation excerpts. Retrieval uses the existing approved document registry, prioritizing matching source URLs/skills and explicit user references. Missing or stale excerpts are disclosed; attribution links alone do not become grounding evidence. Source exclusion rebuilds the payload while retaining the exact previewed lab context. Changed lab context or conversation edits invalidate Send until previewed again; the existing ten-minute preview expiry and 16,000-token bound remain enforced.
- **Existing controls reused:** activation/key consent, configured model/output cap, shared daily spending limit, conservative reservations/unknown usage, one active provider request, cancellation, streaming, citations, retry preparation and conversation deletion all use the current Tutor/Provider services. No new migration or IPC channel is required; existing create/update/preview/send payloads support lab context. Saved lab summaries show the number of retained AI request records separately from quiz scores. Deleting conversation content removes that association/count while preserving billing totals, as the existing deletion policy requires; this is not a permanent assistance audit trail. Native lab hint/walkthrough exposure and locked completion evidence are unchanged.
- **Validation actually run:** `npm run check` passed lint, **127/127 Node tests** and production build; the final layout build also passed. New service tests cover default exclusion, edited evidence copies, no historical evidence re-inclusion, frozen mapping/method, stale preview rejection, invalid/oversized sharing, source removal, disabled AI and spending-limit rejection, mocked sending, deletion redaction and unchanged lab/quiz evidence. Four existing Electron scenarios passed (tutor activation/streaming/citations/cancellation/deletion/restart plus three lab workflows). The new offline lab-tutor scenario passed after fixing an async checkbox-selection bug: it verifies explicit opt-in, redacted preview, activation-required Send, no provider requests, and unchanged saved output. Its final screenshot was inspected at 900×760; sharing controls were aligned and no horizontal overflow or renderer error occurred. All provider responses were mocks; no paid AI requests or Azure changes were made.
- **Requirement coverage:** S6-09 contextual tutoring delivered, while reviewed adaptations remain **6D.2**. S6-07 selected-evidence disclosure/redaction, S6-08 no false verification/completion, S6-10 opt-in/no-key core workflow and S6-11 learner-only cloud execution are preserved. No readiness/quiz score derives from a tutor answer.
- **Limits:** this is software-flow verification, not a live paid-model quality evaluation or Azure verification. Grounding is limited by the approved cached/document registry; missing lab-topic articles produce warnings rather than fabricated citations. Full pasted output may exceed the context ceiling and must be shortened. Existing provider pricing/activation expiry rules are unchanged. Attachments and exercise adaptation are not included. The two 6A.3 storage/ARM drafts remain unreleased and their four user walkthroughs remain pending.

**Next implementation increment: 6D.2 — optional reviewed adaptations using the existing provider and queue services, when requested.** Outstanding 6A.3 verification and expansion to ten verified exercises/two per domain remain required. **Stage 6 remains incomplete.**

### 6C complete — local learning integration (2026-09-08)

- **Delivered:** Hands-on labs now suggests up to three released exercises whose mapped objective is marked **Needs review** by the existing Stage 2 evidence model. Ranking uses recent question-family accuracy with deterministic ties; each suggestion explains its objective-level evidence and offers the existing unfinished attempt when available. This does not claim a mistake on the lab’s particular skill. No evidence/insufficient evidence produces an explicit browse-the-library state rather than an invented weakness. Excluded quiz evidence stays excluded; lab prerequisites must be self-reported completed before recommendation. Browsing remains available.
- **Reflection:** each attempt has a local response (up to 4,000 characters), optional self-assessment, explicit Save/discard controls, save-error retention/retry and navigation protection for unsaved edits. The frozen exercise’s suggested answer is revealed explicitly, with the first comparison timestamp recorded. Reflection can be updated after learning completion without modifying locked evidence, prior hint/walkthrough exposure, completion timestamp/basis or cleanup. It is optional, ungraded and never counts as a quiz answer or Azure verification.
- **Separate history:** saved labs can be searched and filtered by learning state, cleanup pending and Portal/CLI. Cards show the frozen version, method/start/completion dates, help exposure, reflection/comparison state, problem category and independent cleanup. Environment/access/policy problems are described separately from conceptual mistakes, including when resuming a suggestion. Existing records remain readable even when catalog content changes or is retired.
- **Storage/interfaces:** schema 8 adds a reflection JSON column with empty/unassessed defaults for existing attempts; the existing migration mechanism creates a backup and runs transactionally. `study.labs.reflection` validates save/compare requests and assigns timestamps on the backend. Lab list responses add recommendations and summary fields. Recommendations read the existing quiz evidence model without changing quiz sessions, scores, scheduling or AI state.
- **Verification actually run:** `npm run check` passed lint, **124/124 Node tests**, and production build. Three real Electron lab workflows passed offline in isolated profiles, including prior start/resume/evidence flows and the new recommendation → reflection → failed save/retry → history filtering → restart flow. New unit checks cover sparse/excluded evidence, draft/prerequisite exclusions, objective matching, environment context, reflection validation/rollback, schema 7→8 preservation/backups and failed-migration rollback. Desktop and service checks confirm quiz evidence is unchanged; no Azure resources or paid AI calls were made. Reflection/history screenshots were inspected at 900×760 with no horizontal overflow or renderer errors. Three older migration assertions were updated to use the current schema version after initially expecting version 7.
- **Requirement coverage:** S6-04 local recommendations from weak objectives and environment/conceptual separation delivered; S6-13 durable reflection and separate history delivered. S6-05 reflection comparison exposure added alongside existing hint/walkthrough records. S6-08 self-report distinctions, S6-10 no-key operation, S6-11 manual Azure execution and S6-12 independent cleanup remain intact.
- **Bounds/status:** implemented 6C at the user’s request while 6A.3 is still partial. There are still only two released pilots; the storage and ARM drafts remain unreleased with four walkthroughs pending. No content verification was inferred from these software tests. Recommendations are limited by released content and quiz evidence; they are not readiness scores or AI recommendations. Reflection is editable self-report, not a versioned assessment audit trail. Attachments and optional AI tutoring/adaptation remain deferred.

**Next implementation increment: 6D.1 — optional contextual lab tutoring with evidence preview and existing usage limits, when requested.** Outstanding 6A.3 work remains: user walkthroughs/release review for batch 1 and subsequent two-exercise batches to ten verified exercises/two per domain. **Stage 6 remains incomplete.**

### 6A.3 batch 1 — two expansion drafts implemented (2026-09-08)

- **Delivered:** added `storage-account-basics` (storage.accounts.create, related redundancy) and `arm-storage-deployment` (compute.templates.deploy, related interpretation/ARM). Each is independent and version 1, with separate Portal and manually executed Bash instructions. The first creates and inspects an empty Standard LRS storage account; the second deploys a parameterized ARM template, changes a tag and verifies the same account remains. Catalog version is `labs-2026-09-08-v3`; the two previously released pilot definitions and their verification records are unchanged.
- **Scope/counts:** four authored exercises across identity, networking, storage and compute; **two released, two unreleased**. Neither new exercise has an Azure execution record. S6-01 remains partial: ten verified exercises and two per domain are not yet delivered; monitoring has no exercise. This session stops after one two-exercise batch.
- **Content/review:** reviewed current Microsoft storage creation/CLI/schema, ARM Portal/CLI deployment guidance and Blob Storage pricing on 2026-09-08. New drafts include mapping, provenance, roles/scopes, explicit subscription/region/names, resource manifests, estimated time, progressive hints, expected results, evidence/reflection, separate environment/conceptual troubleshooting and scoped cleanup. Empty accounts, no data uploads or optional services, and review of subscription-specific pricing keep the scope bounded; no numeric spending cap or free-use guarantee is invented.
- **Manual review materials:** [four-run checklist and report form](docs/STAGE6_BATCH1_VERIFICATION.md), [storage guide](docs/LAB_storage-account-basics.md) and [ARM guide](docs/LAB_arm-storage-deployment.md). Guide instructions are generated from the catalog with `node scripts/lab-guides.mjs`; a local test prevents drift. Both ARM methods embed the same checked-in `content/templates/storage-practice.json`. Guide generation is local and never runs Azure commands. Keep user findings in the separate verification log so regenerating guides cannot erase them.
- **Validation actually run:** focused content/guide/service tests **18/18 passed**; `npm run check` passed lint, **117/117 Node tests** and production build. Added checks for pending draft records, premature release rejection, hidden/unstartable drafts, guide/catalog consistency, Bash syntax without execution and matching single-resource ARM templates. Compared the released definitions with the pre-edit snapshot: unchanged. An initial guide-generator quoting error was fixed before the passing runs. No Electron workflow rerun was needed for this content-only increment; existing UI/IPC/database behavior was not changed. Local JSON and Bash checks are not Azure template validation or executed walkthroughs.
- **Requirement coverage:** S6-02–03 content and cost metadata extended to both drafts; S6-05 goal/hints/walkthrough content, S6-10 offline/no-key instructions, S6-11 learner-executed changes, S6-12 cleanup instructions and S6-13 reflection content extended. S6-08 release provenance remains explicit. No new UI, migrations, AI calls, Azure authentication or cloud execution was added; paid tutoring and recommendations remain later work.
- **Azure verification:** all four new method records remain **pending**, with no tested CLI version or elapsed time invented. The new exercises stay out of the released app library until both methods and cleanup pass review. Earlier pilot reports cannot release this batch.

**Exact next step: 6A.3 batch 1 user walkthroughs — storage Portal/CLI and ARM Portal/CLI — then record findings, correct/recheck affected instructions and release eligible exercises.** After that, author the next two-exercise batch. **6A.3 and Stage 6 remain incomplete.**

### 6B.2 complete — evidence, repeat attempts and separate cleanup

- **Delivered:** each attempt now has a completion checklist, notes, pasted command output and an optional problem category (none, environment/access/policy, or understanding/configuration). Evidence saves locally as edits are made, with ordered writes, visible pending/saved/error states and retry. Failed drafts stay on screen; leaving via app navigation is blocked until changes save or the user explicitly discards unsaved edits. Nothing is sent to AI.
- **Learning lifecycle:** added awaiting-evidence and completed states alongside in-progress/paused. Completing requires every checklist item and records a server-assigned **self-reported** basis and completion timestamp. Completed checklist/notes/output/problem category and help exposure are locked; reading position may still change. No Azure-verified or AI-reviewed result is inferred, and lab records never become quiz answers or affect quiz accuracy.
- **Cleanup lifecycle:** pending/completed is independent of learning status. Learners can retain resources with a pending state and explanatory note, or explicitly record that no lab resources remain. Cleanup uses a separate Save control, can change after learning completion, and keeps timestamped change history. Saved attempt cards show cleanup pending even when learning is completed. Existing 6B.1 attempts migrate to pending/unchecked cleanup; prior resource state is not invented.
- **Repeat attempts:** Start another attempt returns to preflight/method selection. Each new attempt has its own frozen current lab snapshot, method, evidence, help history and cleanup. A unique creation-request key makes retries idempotent without reusing or overwriting earlier attempts. Original lab content/names remain unchanged.
- **Storage/interfaces:** schema 7 transactionally rebuilds `lab_attempts` to remove the per-lab uniqueness restriction and adds evidence, cleanup history, completion timestamp/basis and unique request keys. Existing IDs, snapshots, methods, saved reading positions and exposure timestamps are copied unchanged, with a backup before migration. `study.labs.evidence`, `complete` and `cleanup` are new validated IPC operations; `start` accepts a request key and `update` supports awaiting-evidence. Evidence limits are 20,000 note characters and 64,000 output characters; cleanup notes allow 4,000. Unknown fields, invalid checklist indices/duplicates, spoofed completion bases and edits to completed learning evidence are rejected.
- **Verification:** final lint, 113/113 Node tests and production build passed. Both real Electron lab workflows passed offline in isolated profiles: the prior start/pause/restart flow plus rapid evidence editing, pasted text rendering, save-failure retention/retry/navigation protection, awaiting-evidence restart, self-reported completion, independent cleanup, discard of unsaved cleanup edits, and a fresh CLI attempt preserving the completed Portal record. Service tests cover duplicate creation keys, immutable completion, cleanup history/idempotence, input validation, write rollback, schema 6 preservation/backups and rollback of a failed schema 7 rebuild. A desktop-test timing issue was corrected by waiting for the notes field to become enabled after a hint save. The evidence layout was inspected at 900×760; no horizontal overflow or renderer error occurred on the final run.
- **Requirement coverage:** S6-06 lifecycle/multiple attempts delivered; S6-07 checklist/notes/pasted output delivered with local-only disclosure; S6-08 explicit self-report basis delivered; S6-12 separate cleanup state/history delivered. S6-05 hint/walkthrough exposure remains preserved per attempt. S6-10–11 no-key operation and learner-executed cloud changes remain intact. S6-13 reflection responses and S6-04 recommendations remain deferred to 6C.
- **Bounds:** file/screenshot attachments remain deferred because neither pilot requires them. No AI evidence review/adaptation, automatic Azure verification/provisioning, export/import or evidence-deletion feature was added. Wait for Saved before quitting; unsaved edits are not claimed durable. Completed learning records are read-only; later cleanup updates do not rewrite them. No normal user profile was modified during testing, no paid requests were made, and no Azure resources were created by the agent.

**Next: 6A.3 — first additional two-exercise content batch**, continuing toward ten reviewed exercises with two per domain. Stage 6 remains incomplete; stop after 6B.2.

### 6B.1 complete — library and durable guided attempts

- **Delivered:** Hands-on labs is an active navigation destination. The two released pilots can be searched by title/goal/skill and filtered by domain. Each opens a goal plus prerequisites, access/scope, resources, cost restrictions, time/setup notes, source attribution and cleanup before starting. Original lab content/names are unchanged.
- **Guided flow:** choose Portal or Bash CLI and acknowledge preflight; start at the goal, reveal hints progressively or open the full walkthrough, move between saved reading steps, inspect verification and cleanup instructions, and pause/resume. Help is persisted before it is displayed. Source links are opened through a narrow validated desktop operation. No commands are executed by the app.
- **Durability:** schema 6 adds `lab_attempts`, using the existing backup-before-migration and transactional migration path. Each attempt stores a full lab/catalog snapshot, chosen method, lifecycle status, timestamps, preflight acknowledgement, reading pane/step, hint count/reveal timestamps and first walkthrough reveal. Updates are transactional. Reading an old attempt never replaces its snapshot, including when the current catalog changes or retires the lab. Repeated starts resume the same attempt; retrying a hint reveal does not expose an extra hint.
- **Interfaces:** `LabStore` in `electron/labs.js` provides `list`, `read`, `start`, `update`, and source-link validation. The preload exposes `study.labs.list/read/start/update/openLink`; renderer-supplied snapshots, unknown update actions, unsupported methods, invalid step/hint indices and unapproved source URLs are rejected. Credentials, Azure calls and quiz evidence are outside these operations.
- **Failure/accessibility behavior:** terminal load/save errors stop the busy state and offer Retry; failed saves preserve the prior place and keep unrevealed help hidden. Controls are serialized while saving. Navigation works by keyboard; view headings receive focus, statuses use text, commands wrap in narrow windows, and compact/scrollable sidebar navigation retains access to Settings. UI screenshots were inspected at 900×760 with reduced motion.
- **Verification:** lint passed; 108/108 Node tests passed; production build passed. New service tests cover reopen, immutable snapshots/retirement, idempotent starts/reveals, invalid requests, rollback after write failure, schema 5 backup/upgrade preservation and failed migration rollback. Existing stage 1 and later migration tests still pass after fixture updates for schema 6. Real Electron lab workflow passed offline without a key, including save-error injection/retry, both methods, hint exposure, pause/restart/resume, cleanup display and narrow-window checks. Existing offline quiz lifecycle Electron regression also passed using an isolated profile. Earlier UI/test issues (select labels, asynchronous assertion timing, short-window spacing) were corrected before the final run.
- **Requirement coverage:** S6-02–03 preflight content is now visible in the app; S6-05 goal/progressive hints/walkthrough and exposure persistence are delivered; S6-06 start/pause/resume is partial; S6-10 no-key/offline reading and saved attempts are delivered; S6-11 manual cloud execution is preserved; S6-12 cleanup instructions are accessible, but cleanup status tracking remains deferred. S6-01 still has only two pilots; evidence/completion, recommendations and AI requirements are not marked complete.
- **Bounded limits:** one saved attempt per lab, fixed execution method, statuses in progress/paused. Step position means reading position, not completed Azure work. No finish/grade action, checklist/output/attachment capture, multiple attempts, cleanup status, reflection answers, recommendations or AI lab assistance yet. Closing or pausing the app does not stop Azure resources. Tests used isolated profiles and made no paid provider or Azure requests.

**Next: 6B.2 — evidence capture, multiple attempts and separate learning/cleanup status.** Stage 6 remains incomplete. Stop after 6B.1; no later increment has begun.

### 6A.2 complete — pilot walkthrough review and release

- Recorded and reviewed all four user walkthrough reports, Azure CLI 2.90.0, dedicated-group ownership and final group deletion/Portal cleanup. Both version 1 pilots now have passing Portal/CLI editorial verification records with completed cleanup and are **released in the source catalog**. Catalog revision is `labs-2026-09-07-v2`; original instructions/names and contract version remain unchanged.
- The VNet CLI run succeeded after two failed attempts: missing address prefix, then a prefix outside the selected VNet. Accepted the successful `10.0.0.0/16` VNet with `subnet1` `10.0.0.0/24` and `subnet2` `10.0.1.0/24` as equivalent objective coverage. This is user-reported evidence from an assisted alternate setup, not exact original-command execution or independently queried Azure state. The original command needed no correction.
- Preserved original failures, timings and the successful retry in [the verification log](docs/STAGE6_VERIFICATION.md). The supplied 10-minute CLI duration covers the initial failed attempt; retry date/duration and other unreported details remain explicitly unknown. No subscription/resource IDs from raw errors were retained.
- **Validation:** `npm run check` passed lint, all 103 Node tests, and production build. Updated assertions for released pilot metadata while retaining rejection tests for incomplete records and cleanup. No UI, migration, IPC, paid request or agent-executed Azure action was introduced.
- **Limits:** release applies to the two catalog pilots only. Stage 6 remains incomplete; the library, saved attempts, evidence UI, additional content, recommendations and AI assistance remain planned. **Next: 6B.1 — pilot library and durable guided start/resume.** No later increment was started.

### 6A.1 delivery notes — 2026-09-07

**Exercise contract and two pilot drafts implemented; user Azure walkthroughs pending. Stage 6 remains incomplete.** Stage 5 remains complete; Stage 4's accepted evaluation deferral is unchanged.

- Added `content/labs.js` (catalog `labs-2026-09-07-v1`, contract version 1) and pure `validateLabs(catalog)` in `content/lab-contract.js`. Definitions reuse the current blueprint and skill catalog. Validation checks required content, mappings, prerequisite references/cycles, method coverage, provenance, resource/cleanup coverage and release records; it does not execute Azure commands or establish semantic correctness.
- Authored `rg-tags` and `vnet-two-subnets`, both version 1 and **unreleased**. Each contains Portal and Bash CLI walkthroughs, goal, progressive hints, expected results, roles/scope, resource manifest, duration/setup estimates, cost restrictions, evidence checklist, reflection and scoped cleanup. Sources and pricing guidance were checked against official Microsoft pages on 2026-09-07; review was AI-assisted, not an executed Azure walkthrough or independent human sign-off.
- **Requirement coverage is partial:** S6-01 has two drafts across two domains, not the required ten released exercises/two per domain. S6-02–03 have pilot content and cost preflight; S6-05 has goal/hint/walkthrough content; S6-07–08 have manual evidence guidance and explicit completion basis; S6-10–13 have local-readable content, learner-run commands, cleanup and reflection. Their runtime UI, evidence persistence and workflow requirements are not implemented. S6-04 and S6-09 remain deferred.
- **Verification:** focused `node --test tests/stage6.test.js` equivalent run on staged files passed 4/4; final project `npm run check` passed lint, 103/103 Node tests (including those four), and production build. Tests include rejected incomplete/mismatched release records and cleanup coverage. No Electron workflow test was needed for this content-only increment. No paid AI request, Azure command, database migration, UI or IPC change was performed.
- **Release dependency:** the user will execute both methods for each pilot and record sanitized findings, date, CLI version, elapsed time and cleanup outcome using [the four-run checklist](docs/STAGE6_VERIFICATION.md). Only current-version passing Portal and CLI records with completed cleanup permit release. Static checks do not satisfy this gate.
- **Limits:** no lab feature is active in the app; attempts, attachments, recommendations, tutoring and adaptations remain planned. Resource costs, environment restrictions, Portal labels and timing need the user's live validation. Keep instructions versioned when correcting findings.

Budgeted continuation (one bounded increment per session): **6A.2** pilot corrections and user verification records → **6B.1** pilot library and durable guided start/resume → **6B.2** evidence, assistance exposure, multiple attempts and separate cleanup status → **6A.3** two-exercise content batches to ten verified exercises/two per domain → **6C** local recommendations/reflection/history → **6D.1** optional contextual tutor → **6D.2** optional reviewed adaptations. No later increment was started.

### Outcome

The learner can choose small, objective-aligned Azure exercises, carry them out in their own environment, and record what they learned. AI assistance enhances the workflow when enabled.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S6-01 | Ship an initial reviewed set of at least 10 small exercises, with at least two per domain. Prefer a single learning objective and approximately 10–20 minutes per exercise; explain longer setup or waiting time.                 |
| S6-02 | Every exercise must include objective mapping, source attribution, prerequisites, required roles, expected resources, supported execution method, time estimate, instructions, expected results, verification steps, and cleanup. |
| S6-03 | Identify potentially billable resources and resource restrictions before starting. Use current estimates where available, label estimates, and avoid promising a free Azure sandbox or free resource usage.                       |
| S6-04 | Recommend exercises based on stage 2 evidence while letting users browse and choose freely. Respect prerequisite relationships and distinguish an environment/access problem from a conceptual mistake.                           |
| S6-05 | Provide a goal-first view, progressive hints, and an optional full walkthrough. Preserve whether hints or the solution were revealed as learning evidence.                                                                        |
| S6-06 | Track not started, in progress, awaiting evidence, completed, and cleanup pending/completed states. Support resume and multiple attempts without overwriting earlier evidence.                                                    |
| S6-07 | Allow a completion checklist, notes, and pasted command output; add file/screenshot evidence where it materially helps. Explain which evidence will be sent to AI and let users remove secrets or unrelated data before sending.  |
| S6-08 | Clearly distinguish self-reported completion from AI-reviewed evidence and independently verified resource state. An AI explanation alone must not produce a “verified in Azure” badge.                                           |
| S6-09 | Offer contextual tutoring and optional exercise adaptation through stages 4–5. Preserve the exercise's objective and validate changed instructions against documentation before presenting them as a reviewed exercise.           |
| S6-10 | Keep curated instructions and recorded evidence usable without an OpenAI key. Cached instructions are readable offline, although performing the exercise in Azure usually requires connectivity.                                  |
| S6-11 | Make the learner execute cloud changes in their chosen Azure environment. Provide reviewable commands where useful; do not silently run commands, provision resources, or request broad cloud permissions.                        |
| S6-12 | Provide explicit cleanup steps scoped to the exercise resources. Record cleanup separately from learning completion and allow the learner to intentionally keep resources with a visible cleanup-pending state.                   |
| S6-13 | End with a short reflection or knowledge check linked to the practiced objective. Record lab evidence separately from quiz accuracy; do not treat checklist completion as several correctly answered exam questions.              |

### Delivery increments

1. **6A — Exercise contract and content:** 6A.1 contract and 6A.2 pilot walkthrough review/release complete; 6A.3 first two-exercise expansion batch is authored and pending user walkthroughs; expansion to ten verified exercises remains incomplete.
2. **6B — Guided workflow:** 6B.1–6B.2 complete: library, guided views, durable attempts, local evidence, repeat attempts and separate learning/cleanup states. Attachments remain deferred.
3. **6C — Learning integration:** complete — local recommendations from weak objectives, durable reflection/self-assessment/comparison exposure, and separate filterable lab history.
4. **6D — Optional AI assistance:** complete — 6D.1 contextual tutoring and 6D.2 independently AI-reviewed supplemental guidance, using existing provider and queue services. Azure execution changes and broader content verification are not inferred.

### Data and service changes

Add versioned lab definitions, prerequisites, resource manifests, lab attempts, hint exposure, evidence attachments/notes, completion basis, and cleanup status. Historical attempts must preserve the lab version they followed.

### Acceptance criteria

- Each shipped exercise has been walked through in an appropriate authorized test environment, or remains explicitly unreleased pending verification.
- A learner can start, pause, resume, and record an exercise without AI.
- Prerequisites, cost implications, expected results, and cleanup are visible before they are needed.
- AI assistance uses the actual exercise and evidence rather than inventing the learner's resource state.
- Self-reported and AI-reviewed outcomes remain visibly distinct from resource verification.
- Cleanup is actionable and scoped; incomplete cleanup remains visible after learning completion.

### Optional follow-on, not a stage completion requirement

A read-only Azure verifier may be added after the core workflow is reviewed. It needs a separate design for authentication, minimal scopes, supported resource checks, token storage, and explicit subscription/resource selection. Automatic provisioning and autonomous cloud changes remain outside this roadmap's initial release.

## 9. Stage 7 — Packaging, portability, and release hardening

### Outcome

The integrated application can be installed and upgraded on macOS, preserves its study data, and provides clear recovery and support paths.

### Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S7-01 | Produce an installable macOS artifact with stable application identity, icons, version metadata, and bundled runtime/content. The installed app must not require Node.js, npm, a development server, or the source checkout.                                                                             |
| S7-02 | Define the supported macOS versions and CPU architectures before release. Provide and test Apple Silicon and Intel builds if both are included in that support matrix; do not imply support for an untested target.                                                                                      |
| S7-03 | Configure signing and notarization using the developer's distribution credentials when available. Verify launch and OS credential access on a clean installation and across upgrades. If credentials are unavailable, label the artifact as a local unsigned build and leave the distribution gate open. |
| S7-04 | Preserve profile location and database identity across application updates. Back up before migrations, migrate transactionally, report failures without destroying the original profile, and refuse unsupported downgrade writes.                                                                        |
| S7-05 | Add versioned export/import for study history, settings, custom questions, annotations, chat history, and lab evidence. Let users choose optional sensitive chats and personal lab evidence; attachments remain deferred. Exclude API keys and provider/Azure tokens.                                                           |
| S7-06 | Validate import format, schema version, size, IDs and references before applying changes; reject unsupported attachment entries. Show a preview and merge/conflict policy. Apply changes atomically and create a recovery backup. Imported active jobs must not automatically resume paid requests.                          |
| S7-07 | Add explicit controls to clear document cache, remove selected conversations/evidence, or reset study data. Destructive actions must explain their scope and require confirmation. Never conflate clearing cache with deleting learning history.                                                         |
| S7-08 | Provide local, redacted diagnostics with app/runtime/database versions and useful error context. A user can inspect a diagnostic bundle before sharing it. Do not enable silent telemetry or upload source content, prompts, credentials, or study history.                                              |
| S7-09 | Complete keyboard, screen-reader, contrast, reduced-motion, zoom, and window-size checks across onboarding, quizzes, reader, chat, queue, and labs. Verify all correctness indicators use labels/icons as well as color.                                                                                 |
| S7-10 | Check startup time, search latency, quiz interaction responsiveness, cache growth, and SQLite behavior with representative long-lived profiles. Establish measured budgets and fix material regressions before release.                                                                                  |
| S7-11 | Audit Electron permissions, IPC validation, source retrieval, external-link handling, secret storage, imported content, and production content security policy. Remove development-only permissions from distributed builds.                                                                             |
| S7-12 | Audit dependencies, supported runtime versions, content notices, bundled licenses, and source attribution. Document how to refresh the exam blueprint and retire obsolete questions without rewriting old sessions.                                                                                      |
| S7-13 | Publish a README/user guide, release notes, known limitations, backup/recovery instructions, and supported-platform matrix. Describe separate requirements for AI access and Azure hands-on work.                                                                                                        |
| S7-14 | Provide a documented manual update path for the first release. Automatic updates are optional and require a trusted distribution/signature design before activation.                                                                                                                                     |

### Delivery increments

1. **7A — Data durability:** backups, migration recovery, export/import, deletion controls, and redacted diagnostics.
2. **7B — Packaged application:** stable identity, installers, signing/notarization, and clean-machine launch.
3. **7C — Integrated verification:** functionality, accessibility, responsiveness, offline operation, upgrades, and failure recovery.
4. **7D — Release documentation:** support matrix, known limitations, notices, and a reviewable release candidate.

### Acceptance criteria

- The packaged macOS application launches on every declared supported target without a development environment.
- A stage 1 profile upgrades successfully and preserves its questions, attempts, scores, and saved sessions.
- Export/import round-trips supported data accurately, excludes secrets, and does not trigger imported paid jobs.
- An invalid import or failed migration leaves the previous profile recoverable.
- Both no-key and AI-enabled workflows work from the installed artifact; loss of network does not block local study.
- Integrated restart tests cover quizzes, annotations, conversations, generation checkpoints, and lab progress.
- Signing/notarization and Keychain behavior are verified for a distributable release, or explicitly recorded as an unmet distribution dependency.
- The release candidate has no unresolved critical defect, data-loss issue, or high-severity security finding; remaining limitations are documented.

### Out of scope for the initial release

Linux release commitments, multi-device synchronization, accounts/shared classrooms, automatic cloud provisioning, and a hosted service. Windows x64 packaging is now an authorized Stage 7 expansion with experimental Windows 11 status; see the current decision in section 12.

## 10. Cross-stage contracts

### Learning and content identity

- A question has a stable logical ID, a version, a primary skill, optional related skills, a family ID, an origin, and an eligibility status.
- An attempt refers to a frozen question version and stores what the learner actually saw and selected.
- Retiring, disputing, or correcting an item changes future eligibility and derived learning evidence; it does not silently regrade the old session.
- Generated variants and repeated exposures must remain distinguishable from independent evidence.
- An exam-blueprint update requires an explicit mapping/migration plan. An old attempt is not automatically assumed to assess a newly introduced skill.

### Document and conversation identity

- A citation refers to a source, section, and revision, with a retained excerpt where permitted.
- A highlight or chat message can remain readable even if the live source changes; stale/missing source state must be visible.
- Context preview shows what the user is asking the tutor to consider. Retrieval additions should be inspectable after the response.

### Job and request lifecycle

- Local intent, provider submission, provider completion, validation, and publication are separate durable events.
- Retries must distinguish a confirmed failure from an unknown submission outcome.
- Cancellation controls future local actions and attempts provider cancellation; it cannot retroactively undo a billed request.
- A transaction/publication key prevents duplicate local question insertion even if delivery is repeated.

### Data ownership

- The learner's progress remains local by default.
- AI requests transmit only the context needed for that operation; remote provider retention behavior must be described using verified information when integrated.
- A key is a credential, not part of a profile export. Imported profiles and background jobs must never silently activate paid work.

## 11. How implementation proceeds

For each increment:

1. Select the specific requirement IDs being implemented and inspect current code/data constraints.
2. Refine the data contract and user-visible behavior before editing several feature areas at once.
3. Build a complete, reviewable flow, including its loading, failure, and recovery behavior.
4. Run checks appropriate to the change: focused unit tests, migration/recovery tests, and real Electron workflow checks where applicable.
5. Record implemented requirements, evidence, limitations, and unresolved dependencies in the project notes.
6. Review the working increment before beginning the next major stage.

An increment is not complete merely because its UI exists. Its persisted state and failure behavior must work. A stage is complete only when its required increments and acceptance criteria are satisfied; optional follow-ons do not block completion.

## 12. Next implementation increment

**Stage 6 is accepted complete by user decision. Stage 7 implementation and the unsigned v0.5.0 preview are released; manual verification remains open**, including authorized Windows x64 experimental packaging alongside macOS Apple Silicon and Intel. Keep application version **0.5.0**; use a public `kaseris/az-104-quiz` repository and unsigned preview distribution.

See [Stage 7 delivery evidence](docs/STAGE7_IMPLEMENTATION.md), [release procedure](docs/RELEASING.md), and [recovery guide](docs/RECOVERY.md). Earlier Stage 6 delivery notes are historical records; acceptance does not retroactively verify unreleased lab drafts or imply that deferred evaluation happened. Two pilots remain released, and pending drafts stay unreleased.

Implement 7A–7D sequentially. Distribution signing/notarization remain explicit exceptions for this unsigned preview. Windows 11 support remains experimental until its clean-machine verification. Record actual test outcomes and unmet release checks before publication.
