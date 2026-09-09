# Stage 4 delivery — Grounded tutor

Application **0.4.0**, database schema **4**, prompt **tutor-v1**, pricing **openai-standard-2026-09-06**.

Status: **Accepted as complete for now by explicit user decision on 2026-09-06.** Live connection and storage smoke testing passed. Broader tutor evaluation is deferred, not represented as performed; it does not block Stage 5.

## Delivered behavior

- **4A:** official OpenAI JavaScript SDK 7.10.0 in the trusted main process; explicit activation and small accounted connection test; separate model access validation; selectable GPT-5.5, GPT-5.6 Terra/Sol and GPT-6 Astra; no automatic fallback. Default tutoring uses Terra. Settings retain generation/review assignments without enabling those features.
- **4B:** persistent conversations from reader drafts, selections and quiz review; hint entry from active study items; removable @ references; context preview and per-turn excerpt exclusion; bounded local retrieval; streamed plain-text answers; validated source markers and retained source excerpts. No raw HTML rendering, model-generated clickable URLs, remote tools or Azure execution.
- **4C:** durable request intent, partial text, model/prompt/pricing versions, input snapshots, usage and cost reservations; cancellation and explicit retry preparation; restart recovery and conversation deletion; immediate dispatch blocking on key disable/remove. Existing study and reader flows remain local.
- **4D:** deterministic provider, migration and failure tests; Electron regression workflow using test-only SDK substitutions; twelve-case evaluation catalog and manual review rubric. Live evaluation remains an open gate.

## Activation and credentials

The optional first-run key field stores only; storing a key routes the learner to Settings. Existing keys start unverified/inactive. Secure storage uses the existing OS encryption; session-only fallback now requires an explicit checkbox. Stored plaintext is never returned through IPC. Replacing or removing a key disables activation and aborts ongoing work.

Settings requires a positive user-chosen daily USD limit and consent to sharing/billing before the activation test. “Check model access” performs a model metadata request, not a generation. Activation then performs a bounded Responses request, which counts toward app usage. No request is automatically retried by the SDK. Each app launch requires reactivation; old conversations remain readable without it.

Distinct error categories cover missing key, secure storage, authentication, model access, network, quota, rate limit, cancellation, and rejected request settings. Errors returned to the renderer are controlled messages, never raw SDK errors. Disconnects and cancelled submissions retain unknown usage conservatively.

## Context and learning evidence

The trusted process resolves references; renderer-supplied excerpts cannot forge evidence. Explicit references precede at most six supplemental sections from the local FTS index and mapped approved articles. A preview may retrieve at most two uncached curated articles through Stage 3's bounded fetcher. Failed retrieval yields a warning and retained evidence; it does not block local study. There is no vector service, remote library upload or unrestricted crawl.

The input ceiling is 16,000 tokens. The implementation uses UTF-8 byte length plus envelope overhead as a deliberately conservative text-token bound; therefore some English contexts will be limited before 16,000 actual model tokens. Explicit context that exceeds this ceiling is rejected with adjustment instructions. Up to six completed earlier turns are included while they fit. The preview discloses included prior text and exclusions. Preview identities expire after ten minutes and are invalidated when the draft or quiz evidence changes. Excerpt exclusion changes the immutable next-send input, without deleting the underlying reader reference.

A citation marker such as `[S1]` can only open the supplied excerpt and its document/section/revision identity. Cache clearing and refresh do not erase these response snapshots. Invalid markers are labeled unsupported. A completed response without citations carries a warning. Citation existence does not prove semantic support; the evaluation rubric explicitly checks that separately.

Hint prompts omit reviewed answers and option rationales from the current quiz evidence. Assistance is recorded before displaying an answer for an unanswered study item. Completed quiz scores and historical attempts are not rewritten. Unfinished exam-style sessions reject question-specific tutor creation/preview even through IPC. Public question issues are disclosed in context rather than treated as reliable weakness evidence.

## Request lifecycle and accounting

Schema 4 adds conversations, preview snapshots, and requests. User message, actual provider payload, sources, mode, quiz evidence, response text/state, model, provider response ID, token usage and pricing/prompt versions are persisted together with each request. Secrets stay in the credential service. Existing transactional migration and pre-upgrade backup behavior applies.

One provider operation runs at a time. Tutoring defaults to 4,000 output tokens, editable from 256 to 16,000. Requests have a 120-second deadline, validation 20 seconds, and streamed output is capped at 200 KB. Paid request intent and its reservation precede dispatch. A repeated send identifier cannot insert a duplicate request. Closing/quitting interrupts local work; next launch never resubmits it. Explicit retry restores the question as a draft and requires preview and Send again.

Daily limits use UTC. Reservations for unknown usage remain charged against available local allowance even across days; known usage counts on its original day. Estimates reserve maximum output plus conservatively bounded input, including cache-write allowance. Response estimates use reported token totals and verified model rates with conservative uncached-input allowance; these are not guaranteed invoice values. No provider-wide billing reconciliation is claimed. Updating the local limit is deliberate; importing or restarting does not increase it automatically.

Pricing is verified from official model pages on 2026-09-06. The bundled rates expire on 2026-11-21, at which point paid dispatch is blocked pending a reviewed app pricing update. No unsupported model or missing rate can dispatch. The small connection test is also accounted. Conversation deletion removes its text, evidence, previews and provider IDs while preserving anonymous request accounting.

Responses uses `store:false`, `background:false` and local bounded history. This disables ordinary provider response storage for this integration, not all provider retention: abuse-monitoring retention may still apply.

## Verification and deferred evaluation

- 65 passing Node tests, clean ESLint, successful production build as of the pre-live validation run.
- Final Electron run: **4 passed, 1 skipped**. Offline quiz, Stage 2, Stage 3 and Stage 4 workflows passed; the optional live Microsoft-source audit was skipped. The final tutor test includes cancellation during streaming.
- Stage 4 Electron verification covers activation, source preview, streaming, citation opening, retained history/drafts, narrow layout and deletion using an isolated profile and deterministic SDK substitutes.
- Live activation and one storage conversation succeeded on 2026-09-06 using the user-selected Terra model and $2 daily limit. The conversation reported 2,236 input and 1,094 output tokens, approximately $0.0187 under the app’s conservative estimate. The ZRS citation opened its retained Microsoft Learn excerpt. All-domain semantic evaluation remains pending.
- Deferred follow-up: finish reviewing `STAGE4_EVALUATION.json` across all domains and failure cases, recording usage and findings. Citation navigation is verified; semantic support of every claim is a separate gate. The broad storage response included general descriptions beyond the supplied excerpts, so broader grounding review remains necessary. Resolve every high-severity finding.

## Official references

- [Responses API](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5), [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)

Source backup before transfer: `/private/tmp/az104-before-stage4-20260906.tar.gz`. Tests used isolated temporary profiles.

## Send-flow usability correction

Settings now offers **Open study tutor** after activation. The composer explains the two steps and reveals **Send to tutor** only after a successful context preview; before that, Preview context is the primary action. The former foundation heading is now a **Coming later** note for generation and labs. Verified in the running app with the learner’s saved storage question, live response and citation opening.
