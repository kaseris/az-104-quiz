# Stage 7 delivery record

Stage 6 is accepted complete by user decision on September 9, 2026. Stage 7 functionality and automated release validation are implemented. [The unsigned v0.5.0 preview](https://github.com/kaseris/az-104-quiz/releases/tag/v0.5.0) was published on September 10, 2026 after verification of all three installer checksums. Manual verification remains open; acceptance does not verify unreleased lab drafts or deferred evaluations.

## 7A — Durability and portability

Schema 9 and JSON export format 1 preserve immutable study snapshots, generated question provenance, annotations, drafts and lab history. Optional chats import as inert historical messages. Complete bounded validation and disposable-database constraint checks precede additive conflict preview and transactional application. Recovery backups, selective personal lab-text removal, reset retaining spending reservations, and allowlisted diagnostics are implemented. Trusted file dialogs own paths; unsupported database downgrades are rejected before journal initialization.

Data operations disable AI/automation and refuse active work. Only the includeGenerated practice preference is portable; AI model/budget settings remain device-local. Credentials, provider identifiers, executable jobs, billing, caches and search indexes are excluded. Chats may quote evidence. Attachments are unsupported. Recovery backups contain personal content and require appropriate handling.

## 7B — Installable applications

Pinned electron-builder 26.15.3 packages separate ARM64/x64 DMGs and a Windows x64 per-user NSIS installer. Application ID io.github.kaseris.az104studydesk, application name/profile location and version 0.5.0 are stable. Explicit packaged-file allowlists, production CSP, original icons and dependency/content notices are included. Windows installed-path IPC comparison retains exact-file and main-frame checks.

Signing/notarization remain intentionally unmet. Ad-hoc macOS signatures are verified; they are not Developer ID signatures. Automatic updates remain disabled. Windows 11 is experimental because Windows Server runner validation does not establish a standard-user Windows 11 desktop experience.

## 7C — Verified results

The exact release source is commit 530ef778689838a9edeb8f9370eb025ec84e7453. [Main CI 34526924143](https://github.com/kaseris/az-104-quiz/actions/runs/34526924143) passed all three targets; a Windows installer timeout passed on retry, and the independent release job also passed. [Release workflow 34527013975](https://github.com/kaseris/az-104-quiz/actions/runs/34527013975) passed every required job. Each native architecture passed lint, 146 Node tests, 12 deterministic Electron workflows, production build, dependency audit, packaging and installed-app checks. The optional live Microsoft Learn test is excluded from deterministic CI. No paid AI calls run in CI.

The same Mac DMGs were installed on macOS 26 without rebuilding. All five installed targets passed schema-8 migration, quiz completion/restart, saved annotations/conversations/labs/generation checkpoints, profile preservation, and real OS-encrypted credential persistence across replacement.

| Hosted target | First usable startup | After replacement | Secure storage / retained data |
| --- | ---: | ---: | --- |
| macOS 15 ARM64 | 1,484 ms | 853 ms | Passed |
| macOS 15 Intel | 1,530 ms | 1,119 ms | Passed |
| macOS 26 ARM64 | 3,448 ms | 983 ms | Passed |
| macOS 26 Intel | 4,423 ms | 1,041 ms | Passed on retry |
| Windows Server 2025 x64 | 709 ms | 589 ms | Passed |

Cold-launch timings vary on hosted machines. The final Intel macOS 26 candidate initially exceeded the five-second budget at 6,736 ms, then passed at 4,423 ms on a fresh runner using the unchanged installer. This outlier remains part of the evidence; thresholds were not relaxed. Earlier candidates exposed an incorrect whole-workflow startup timer, eager SDK loading and Windows cleanup timing. Startup now measures usable navigation/data separately from credential and quiz work, the AI SDK loads only on explicit use, and temporary-directory cleanup has bounded Windows retries. Only unpublished candidate tags were updated; no published tag or binary was replaced.

### Long-lived profile and accessibility

A synthetic 451 MB database contains 10,000 sessions, 100,000 answers, 1,000 conversations, 1,000 lab attempts and a 100 MiB document cache. Final source measurements on Apple M4/macOS 15.7.4, Node 24.4.1:

| Measurement | Result | Budget |
| --- | ---: | ---: |
| Usable renderer startup | 770 ms | 5,000 ms |
| Search p95 | 40 ms | 300 ms |
| Visible quiz feedback p95, 20 answers | 47 ms | 100 ms |

Run npm run build followed by npm run benchmark -- --ui to reproduce. This uses development Electron, production renderer assets and a disposable fixture profile; packaged applications receive no profile override. The benchmark found and drove fixes for slow FTS excerpts, repeated unanswered-history scans and unnecessary full-history refreshes. Stored scores and snapshots are unchanged, and a focused navigation check confirms current overview totals after a quiz answer.

Axe-core WCAG A/AA checks passed across onboarding, ten principal screens, active quizzes and answer explanations. Contrast, focus visibility and correctness-indicator semantics were corrected. Electron checks include keyboard operation, reduced-motion settings and 200% zoom. Portability tests cover secret exclusion, inert imports, conflict rejection, rollback, retained billing, migration and byte-preserving unsupported-downgrade refusal. Dependency audits reported zero vulnerabilities. Initial source review and a full staged-content gitleaks scan found zero secrets; live evaluation outputs, profiles and keys are excluded.

### Remaining verification

Manual VoiceOver/Narrator reading order and announcements, and exhaustive keyboard/reduced-motion/minimum-window review across all flows remain open. Installed live AI needs an explicitly initiated local check. Clean Windows 11 standard-user install/uninstall is pending. The synthetic renderer benchmark is separate from installed-app testing. Signing/notarization and consistent unsigned-macOS Keychain behavior remain unmet distribution dependencies. Stage 7's complete manual checklist is not claimed as finished.

## 7D — Repository and release

Public repository [kaseris/az-104-quiz](https://github.com/kaseris/az-104-quiz) uses main and MIT licensing for original code. The older ChatGPT directory was left untouched. Recovery/manual-update instructions, third-party notices, known limitations, tested platforms, and content refresh/retirement guidance are included.

The tag-driven workflow validates main ancestry/version, runs native and compatibility gates, and assembles one draft with three installers, SHA-256 checksums, notices and release notes. Only assembly has contents-write permission. Manual dispatch and release-please are documented alternatives, not enabled workflows. The downloaded installers matched every SHA-256 checksum before the existing draft was published at 20:48 UTC on September 10, 2026. The release retains its prerelease/unsigned-preview label. No binaries were rebuilt for publication. Published tags and assets are immutable; corrections require a new patch version.
