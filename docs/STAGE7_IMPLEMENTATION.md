# Stage 7 delivery record

Stage 6 is accepted complete by user decision on September 9, 2026. Unverified lab drafts and deferred evaluation remain documented limitations. Stage 7 implementation is in progress; this document records evidence without claiming unperformed checks.

## 7A — Durability and portability

Implemented schema 9 storage for inert imported questions/messages, format-1 JSON export/import, bounded validation and disposable-database constraint checks, additive conflict preview, recovery backups and transactional application, selective personal lab-text removal, reset retaining billing reservations, and local diagnostic preview/save. File selection stays in the trusted process. Unsupported downgrades are rejected before journal initialization. Existing cache and conversation deletion controls remain available.

Data management disables AI/automation and refuses active work. Exports intentionally retain only the `includeGenerated` practice preference; AI model/budget settings remain device-local. Chat transcripts may quote evidence. Attachments are not supported. Generated questions retain their own provenance without restoring queue jobs. Recovery files contain personal content and are not portable credentials.

## 7B — Packaging

Pinned electron-builder 26.15.3; stable application ID io.github.kaseris.az104studydesk; separate ARM64/x64 macOS DMGs and Windows x64 per-user NSIS installer. App name/profile identity and package version 0.5.0 are retained. Production CSP excludes development connections. Original application icons and bundled license notices are included.

Signing/notarization are intentionally unmet. Windows 11 remains experimental. Native and macOS 26 compatibility results will be recorded after GitHub Actions execution.

## 7C — Verification evidence

- Local lint, 141 Node tests and production build passed before packaging verification.
- Ten deterministic real Electron workflows passed on macOS 15.7.4 ARM64; optional live Microsoft Learn test skipped.
- Portability tests cover round trips, secret exclusion, inert chat/citation retention, conflict rejection, rollback, reset accounting, schema-8 migration and byte-preserving unsupported-downgrade refusal.
- Dependency installation audit: zero reported vulnerabilities.
- Synthetic 451 MB long-lived profile (10,000 sessions, 100,000 answers, 1,000 conversations/labs, 100 MiB cache) on Apple M4/macOS 15.7.4: store/state startup 349 ms, search p95 36.5 ms, quiz-save p95 0.23 ms. Fixed an FTS snippet regression found by this benchmark. Packaged UI startup remains separately measured.
- New Electron Data management workflow passes export preview/save, confirmed reset, additive import, disabled AI, keyboard operation and 200% zoom.
- Native macOS ARM64 CI passed. Initial Windows CI exposed line-ending assumptions; initial Intel CI exposed an asynchronous flag-test race. Fixes submitted; final native/packaged results pending.
- Local ARM64 DMG built; ad-hoc signature verified with codesign. This is not Developer ID signing/notarization.
- Manual VoiceOver/Narrator, clean-machine install/replacement and live installed AI verification: pending. These are not established by unit tests.

## 7D — Release

Public repository kaseris/az-104-quiz created. MIT original-code license, third-party notices, recovery guide, release limitations and tag-driven draft workflow added. Source pushed to main after a full staged-content gitleaks scan found zero secrets. All live-evaluation JSON outputs, profiles and credentials are excluded. v0.5.0 artifact publication remains pending required checks.
