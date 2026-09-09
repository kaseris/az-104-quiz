# Stage 3 delivery — Documentation reader and references

Application: **0.3.0**. Schema: **3**. Registry: **docs-2026-09-06-v1**. Extraction: **reader-v1**.

Stage 2 is treated as complete. Stage 3 implements S3-01–S3-13 in the existing JavaScript/Electron/React/SQLite architecture. No API key is required, validated, or transmitted. Live tutoring remains unavailable until Stage 4.

## Delivered increments

- **3A:** approved HTTPS retrieval, validated/pinned public DNS, redirect checks, bounded decoding, source-use verification, and inert React rendering. Live extraction audit covers all 16 registry entries. RBAC prose, Storage redundancy tables, and Bicep code are also exercised in a real Electron window.
- **3B:** library across 15 objective groups, domain/objective/skill filters, explicit 64 skill-mapping gaps, section-level SQLite FTS5 search, table of contents, and links from question explanations and learning progress. Source, license, freshness, retrieval failure, and offline availability remain visible.
- **3C:** durable bookmarks, highlights and notes; original quotes/revisions; conservative reattachment; explicit repair with the previous annotation retained; cache inspection, refresh, LRU eviction, and confirmed clearing without deleting learner records.
- **3D:** selected-text question drafts, `@` reference picker, removable chips, context preview, local autosave, and multiple drafts. References are pinned to revisions; domain references retain the outline version. The composer explicitly says responses are unavailable.

## Storage and safety contracts

Migration 3 adds `document_status`, `document_versions`, `document_search` (FTS5), `document_annotations`, and `document_drafts`. It uses the existing pre-migration backup and transactional rollback mechanism. No session rows or frozen question snapshots are rewritten. Unsupported downgrade writes are refused. An interrupted fetch becomes retryable on restart.

A document has a stable registry ID. Its content revision is SHA-256 over extracted title and sections; source timestamps, redirects, repository evidence, ETag, and Last-Modified are stored separately. Section IDs combine document ID and source anchor, with a deterministic title-hash fallback and duplicate suffix. Search indexes only the latest successfully retrieved cached revision. Queries are tokenized and quoted, not executed as raw FTS expressions.

Highlights store a normalized quote, up to 40 characters of preceding/following context, offsets, section ID, and original/current revisions. Automatic reattachment requires exactly one contextual match in the same stable section. Changed, missing, and ambiguous matches are stale. Bookmark reattachment requires the same section and unchanged section text hash. Repair requires selecting the replacement explicitly and retains the previous annotation; it never rewrites references already saved in drafts. Quotes and notes remain readable if the cached revision is gone.

The 100 MiB budget measures serialized cached article content. LRU eviction removes payloads and their search entries, retaining version metadata, quotes, annotations, and drafts. SQLite/index overhead and user records are outside this content budget. Metadata tombstones are intentional for reference integrity. An article too large for the budget is rejected. Search/picker inspection does not promote every document in the LRU order.

Retrieval defaults: at most two simultaneous jobs, 20-second total deadline including DNS, three redirects, 5 MiB encoded Content-Length and decoded-body limit. Only curated source IDs reach the fetch operation. Every hop requires approved Microsoft Learn HTTPS paths, no credentials/custom ports, and public DNS addresses. Validated addresses are pinned to the TLS connection lookup. Non-HTML responses and unverified provenance are rejected. Cancellation and failure leave a previous successful revision and its search index intact.

The parser produces allowlisted structured nodes. Renderer code has no raw-HTML insertion or Node access. Scripts, frames, forms, SVG/MathML, handlers, and unsafe links never become executable content. Media use original-source links. The existing renderer request block and CSP remain in force; only the trusted Node HTTPS service retrieves articles. External links must occur in the cached structured article or its approved source/license metadata.

## IPC and draft contracts

`window.study.reader` exposes `state`, `read`, `fetch`, `cancel`, `search`, `picker`, `resolve`, `annotate`, `note`, `removeAnnotation`, `saveDraft`, `draftReference`, `removeDraft`, `clear`, and `openLink`. All operations use the existing main-frame sender validation and controlled result envelope. IDs, text lengths, selection membership, reference kinds, and deletion confirmation are checked in the trusted process. Fetch accepts a document ID, never an arbitrary URL.

`read` accepts `{id, revision?}`; `fetch`/`cancel` accept `{id}`; `search` accepts `{query, domainId?, objectiveId?, skillId?}`. `resolve` maps a question URL/skill to a registry article or a visibly explained objective fallback without modifying the question. An exact section is used only if explicitly mapped or present in the source reference.

`annotate` validates `{documentId, revision, sectionId, kind, quote?, note?, id?}` against stored content. Supplying an existing annotation ID is explicit repair. `saveDraft` accepts `{id?, title, body}` and preserves references. `draftReference` adds a validated `{kind, ...identity}` or removes `removeIndex`; renderer-supplied excerpts cannot forge source content. Draft text is limited to 20,000 characters, title to 200, highlight/selection to 8,000, notes to 4,000, and each draft to 20 references. Context previews retain at most 8,000 characters per document/section selection. These are local draft limits, not a future model-context policy.

## Verification

Final verification on 2026-09-06:

- `npm run check`: clean ESLint, **46 passing Node tests** (26 existing + 20 Stage 3), and successful production build.
- `AZ104_LIVE_READER=1 npm run test:e2e`: **4 passing Electron workflows** covering the complete original quiz lifecycle, Stage 2 adaptive/exam recovery, Stage 3 offline annotations/drafts/cache recovery, and live Microsoft prose/table/code imports.
- `npm run audit:documents`: **16 of 16 live sources verified**, with 15 objective groups represented.
- Offline reader workflow additionally passed three consecutive runs after correcting the draft field accessible name and using real Tab navigation for focus validation. Final desktop and narrow screenshots were inspected; narrow layout has no page-wide horizontal overflow, while tables/code scroll within their own containers.

Tests used temporary profiles, never the normal learner profile. Source files were backed up before editing at `/private/tmp/az104-before-stage3.tar.gz`; this is a temporary source backup, not a learner-profile backup. The live audit is in [DOCUMENT_SOURCE_AUDIT.json](DOCUMENT_SOURCE_AUDIT.json); source notices are in [DOCUMENT_SOURCES.md](DOCUMENT_SOURCES.md).

## Deliberate limits

- This is an on-demand, English Microsoft Learn library, not a full syllabus mirror. It maps 18 skills; 64 reader skill gaps remain separate from the question bank's 23 content gaps.
- Search is lexical, local, and limited to cached content. No embeddings, provider requests, broad browsing, or cloud sync.
- Embedded diagrams/video are external-source links; code/tables/prose remain in the reader. Unsupported source layouts fail with an original-link fallback.
- A highlight must be a unique passage within a single section. Conservative false-stale results are preferable to silently moving a quote. Duplicate/ambiguous short selections need a longer passage.
- Manual refresh and cache clearing can make older reference payloads unavailable; their identity and retained excerpts remain.
- macOS packaging, signing, full assistive-technology certification, data export/import, and durable chat are later stages. The Stage 3 checks cover keyboard focus, accessible labels, narrow layout, reduced-motion inheritance, restart persistence, and renderer isolation.
