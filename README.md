# AZ-104 Study Desk

An offline-first desktop study companion built with Electron, React and SQLite. Version **0.5.0** includes adaptive practice, documentation reading, optional AI tutoring and reviewed generation, guided labs, and local data management. Stage 6 is accepted complete by user decision; unreleased lab drafts remain pending verification.

## Install

Use the assets in [GitHub Releases](https://github.com/kaseris/az-104-quiz/releases). macOS Apple Silicon and Intel receive separate DMGs; Windows x64 receives a per-user installer. Installers bundle the runtime and content; users do not need Node.js, npm, a development server or the source checkout.

The initial preview is unsigned by a distribution identity. Signing/notarization and consistent unsigned-macOS Keychain behavior remain unmet dependencies. Automatic updates are disabled. See [installation, manual updates and recovery](docs/RECOVERY.md).

| Target                       | Validation                                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| macOS 15 / 26, Apple Silicon | Separate native and compatibility jobs; see release evidence       |
| macOS 15 / 26, Intel         | Separate native and compatibility jobs; see release evidence       |
| Windows 11 x64               | Experimental; Windows Server CI is not clean Windows 11 validation |

Only successful results recorded in [Stage 7 delivery notes](docs/STAGE7_IMPLEMENTATION.md) establish tested support. See [release limitations](docs/RELEASE_NOTES.md).

## Study workflows

- Continue without AI during onboarding to use 100 reviewed public-question adaptations, adaptive practice, progress, saved sessions and guided lab instructions.
- Study sessions show immediate explanations and exact-match grading. Exam-style sessions freeze questions and allocation, save drafts/flags, and hide correctness until submission. Timed practice is an app setting, not an official exam duration; closing does not pause it.
- Adaptive selection explains recent mistakes, due review and unseen material. Performance and syllabus coverage remain separate. Report disputed questions locally without rewriting old scores.
- Retrieve curated Microsoft Learn articles while connected. Cached reading, search, highlights, notes, bookmarks and drafts work offline. Missing/stale revisions remain visible. Cache clearing preserves learning history.
- Optional tutoring previews shared context, streams answers with retained citations and saves local conversations. Generated questions require independent review before publication. Unknown paid submissions require deliberate retry. Automatic generation starts disabled.
- Hands-on labs provides two released pilots with prerequisites, costs, progressive hints, walkthroughs, saved attempts, evidence, reflection and separate cleanup tracking. Local recommendations and optional AI tutoring/adapted guidance are available. Self-reported completion is not Azure verification. The learner executes every cloud change and cleanup action.

**AI is opt-in.** Store a key in Settings, choose a daily app limit, review sharing, then explicitly activate. Activation makes a small billed API test. Each launch requires reactivation. OpenAI API billing is separate from ChatGPT. Azure exercises require your own authorized environment and may incur Azure charges. No-key mode and offline mode are different: uncached documentation, AI and Azure require their respective connections.

## Your data

Settings → **Data management** offers consistent recovery backups, export preview/save, additive import preview/apply, personal lab-evidence deletion, study reset and inspectable diagnostics. Individual conversation deletion remains in Study tutor; document cache clearing remains in Documentation.

Portable JSON includes immutable quiz snapshots, generated questions/provenance, practice preferences, annotations, drafts and lab records. Chats and personal lab text are optional; chats may quote lab evidence. Model/budget settings, credentials, provider identifiers, executable jobs, cache and billing are excluded. Imported chat turns are historical and cannot make paid requests. Missing cached articles do not erase retained annotations.

Import format 1 accepts database schema 9 exports up to 256 MiB and 250,000 records. Validation precedes writes. New identities are added, identical records skipped, and differing identities block the merge. Conflicting active quizzes must be resolved first. Application and schema versions are independent.

Backup/import/reset disables AI and automatic generation. Reset keeps spending reservations, preferences, credentials and cached articles. Deletion does not erase copies in old backups or chats. Diagnostics contain local versions and counts; saving them does not upload anything. No silent telemetry.

Profiles live in `~/Library/Application Support/AZ-104 Study Desk/` on macOS and `%APPDATA%\AZ-104 Study Desk\` on Windows. Migrations back up transactionally; unsupported newer schemas are rejected before write-affecting initialization. Read the [recovery guide](docs/RECOVERY.md) before replacing database files.

## Content and limitations

These are independent practice items, not Microsoft exam questions. The bank samples 59 of 82 skills with 92 families across all 15 objective groups. Scores are practice accuracy, not a pass prediction. See the [content audit](docs/CONTENT_AUDIT.md), [document notices](docs/DOCUMENT_SOURCES.md), [lab verification](docs/STAGE6_VERIFICATION.md), and [unreleased lab batch](docs/STAGE6_BATCH1_VERIFICATION.md).

Broader tutor evaluation, further lab walkthroughs, attachments, synchronization, Linux support, accounts and automatic cloud provisioning remain deferred. AI outputs may be incorrect. Original code is [MIT licensed](LICENSE); bundled material retains its [third-party notices](THIRD_PARTY_NOTICES.md).

## Develop and verify

Use Node.js 24.4 or newer and npm. CI pins Node 24.14.0. Development dependencies and Electron require an initial download.

```sh
npm ci
npm run dev
npm run check
npm run test:e2e
npm run benchmark
npm run benchmark -- --ui
npm run package:mac -- --arm64
npm run package:win
```

`npm start` builds and opens Electron. For isolated development only, set `AZ104_DATA_DIR` to a temporary absolute directory; packaged apps ignore it. Deterministic tests use isolated profiles and mocked providers. Live retrieval is opt-in with `AZ104_LIVE_READER=1`; no paid requests run in CI.

Packaged smoke tests require a disposable CI account and refuse an existing default profile. They launch the distributed executable and verify profile identity, stored records, isolation and restart. Manual VoiceOver/Narrator, clean Windows 11, and live installed AI checks are recorded separately; do not infer them from automation.

See the [roadmap](IMPLEMENTATION_ROADMAP.md), [Stage 7 evidence](docs/STAGE7_IMPLEMENTATION.md), and [release workflow strategy](docs/RELEASING.md). Releases use a version tag, validated native builds, a draft release, then publication of the exact reviewed assets.
