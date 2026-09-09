# Stage 2 implementation

Implemented 2026-09-06, JavaScript / Electron / React / SQLite. No runtime AI, retrieval, or cloud-provisioning capability is enabled.

## Delivery and contracts

- 2A: schema 2 adds evidence metadata without changing Stage 1 snapshots, submissions, or scores. Numbered migrations run in one transaction, with VACUUM INTO backup before existing-profile upgrades. Newer schemas are refused. Tests use isolated profiles.
- 2B: `adaptive-v1` uses 50/30/20 weak/due/unseen quotas with deterministic largest-remainder rounding. Domain reservation precedes pool filling and counts toward quotas. Overlapping pools and family variants are deduplicated. Missing pools backfill weak, due, unseen, then general review. Shortage requires explicit shorter-session acceptance. Default cooldown is 24 hours, configurable 0–720; repeat-heavy overrides cooldown only.
- 2C: 100 approved editorial adaptations, all 15 objective groups, 92 families. Per-item source/ref audit is retained separately. Pending/corrected old versions are excluded from evidence; a pending report blocks future selection of the logical question, including newer versions until explicitly resolved; retirement excludes the logical question across versions. Dismissal affects only its issue, and other pending reports can still exclude an item. Explicit `correctsVersions` metadata on a newer reviewed bank entry resolves pending issues. Retired items are never silently restored.
- 2D: exact-match scoring `exact-v1`; 10/20/50 question exams; fixed weights 23/18/24/20/15. Catalog order breaks equal largest-remainder ties. Content release gate uses the bundled reviewed bank, and per-session eligibility checks use current issue status. Scores and review data are withheld in trusted-process serializers until transactional finalization. Unanswered questions are graded incorrect.
- 2E: progress expands domains to objectives and skills. History filters modes and shows deltas only for matching exam configurations; invalid timing has no comparison key. Prior explanation/answer exposure is disclosed as a count. Mixed adaptive/study results are not represented as fixed-distribution trends.

## Learning rules (`evidence-v1`)

Primary skill contributes one evidence record; related skills contribute none. Mapping version is `skills-2026-04-17-v1`. Legacy version mappings are an explicit table; unmapped history stays unknown. Confidence and assistance history are nullable/unknown for old rows.

First response means the earliest eligible response to a family. Independent evidence additionally requires known-unassisted and no prior family exposure. Recent performance uses the latest response per family in the ten most recently practiced families. Full accuracy, assisted responses, repeated responses and unknown legacy evidence are reported separately with denominators. A reported or retired version does not change old scores; it is excluded only from current derived evidence.

States: zero responses = unpracticed; fewer than three families = insufficient evidence; otherwise recent accuracy below 70% = needs review; otherwise, with ten independent first responses, latest five outperforming preceding five by at least 20 percentage points = improving; otherwise evidence collected. No mastery/pass label. Review-due status is independent.

An incorrect response schedules review after one day and resets the interval. Qualifying unassisted correct reviews advance through 3, 7, 14, 30 days. Responses less than 24 hours after the last qualifying event cannot advance the interval. Assisted responses cannot extend it. All statistics and schedules rebuild from evidence plus eligibility, without rewriting attempts.

Review delivery records exposure in the main process. Delivery from a historical session marks matching unsubmitted active items assisted. Prior exposure before session creation is tracked separately and does not masquerade as current assistance. Hint fields are reserved by the assistance contract; no hint feature is introduced.

## Timing and persistence

Timed setup persists start/deadline, configured duration, wall-clock/OS-uptime checkpoints, and remaining time. During a process, a monotonic anchor prevents extra time after clock rollback. Remaining time is persisted at checkpoints so restart cannot accumulate tolerated clock discrepancies. Verified same-boot restarts consume elapsed uptime. A backward wall change, uptime rollback, or more than two seconds disagreement makes timing invalid; the session continues untimed with original metadata. Offline clocks cannot prove elapsed time against coordinated clock manipulation; the app makes no tamper-proof timing claim.

The main process also checkpoints exam reading duration even when a question remains unanswered. It checks expiry once per second, on startup, and before session operations. Finalization is idempotent and atomic. A timer storage error is surfaced on subsequent operations; saved drafts remain recoverable. Renderer polling never supplies the authoritative deadline.

## IPC

Existing `start`, `session`, `draft`, `submit`, `advance` remain. New `preview`, `progress`, `issues`, `report`, `resolve`, `navigate`, `flag`, `finalize` are sender-validated through the existing registration wrapper. Setup validates mode, domains, objective/skill, count, cooldown, timing and duration. Answer/flag revisions reject stale requests. Revision omission remains compatible with Stage 1 callers; the shipped renderer sends revisions. Renderer results never expose raw SQLite, credentials, scheduler evidence bundles, or pre-finalization exam answer keys.

Selection persists scheduler version, tie seed, filtered candidate identities, evidence snapshot, selected reasons, pool/fallback decisions, and frozen displayed questions/options. Replay uses the saved scheduler version, inputs and seed.

## Verification

`npm run check` runs lint, Node tests and production build. `npm run test:e2e` launches real Electron offline using temporary profiles. 26 Node tests and two real Electron workflow tests cover Stage 1 lifecycle, migrations/backups, scheduler synthetic histories, family deduplication, issue resolution/correction, exam allocation and answer concealment, saved drafts/flags/navigation, expiry, restart, rollback and immutable finalization. Screenshots cover draft exam and expanded progress. No normal user profile is modified by tests.

The initial heuristic remains 50/30/20 because synthetic cold-start, concentrated-mistake, overlap, and sparse-bank scenarios retain unseen representation and avoid duplicate families. These are functional invariants, not an empirical learning-effectiveness study.

## Final run results

- `npm run check`: clean lint, 26 passing Node tests, successful production build.
- `npm run test:e2e`: both real Electron workflows passed on the final run (15.5 seconds). One preceding run unexpectedly lost the Electron window during the onboarding screenshot; the Stage 2 workflow passed in that run, and the full rerun passed. The closure cause was not established.
- Exam and progress screenshots were inspected; exam option alignment was corrected, screenshots disable animations, and the progress flow was checked at 390 pixels without horizontal overflow.
- All runtime tests used temporary profiles. No study data from the normal profile was migrated or altered during implementation.
