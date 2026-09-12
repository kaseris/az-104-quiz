# Study Desk 0.6.0 — unsigned preview

Cloud-neutral release of the offline-first AZ-104 study companion. Version 0.6.0 preserves database schema 9 and portable-export format 1.

Includes 100 reviewed question adaptations, adaptive and exam-style practice, documentation reading and annotations, optional AI tutoring and reviewed question generation, and two released guided lab pilots. Adds Inter typography, light/dark/system appearances, a cloud-neutral cobalt palette, semantic answer feedback, tactile primary actions, and responsive quiz feedback that stays reachable in smaller windows. Generation, lab, and session-history controls now share consistent alignment and spacing. Stage 6 is accepted complete by user decision; the additional lab drafts remain unreleased pending walkthrough verification.

Stage 7 improves text contrast, correctness-indicator accessibility, Windows installed-path handling, long-document search and quiz responsiveness with large histories. It adds recovery backups, additive portable import/export, selective personal-evidence deletion, study reset, inspectable local diagnostics, macOS DMGs, and a Windows per-user installer. Imported AI history is inert and cannot submit paid requests. Credentials and executable jobs are excluded from portable exports.

## Platform and distribution limitations

- macOS 15 and 26 Apple Silicon and Intel: installation/replacement and credential persistence passed in the release workflow. See the published release and Stage 7 delivery record for measurements, retries and manual-verification limits.
- Windows x64: experimental Windows 11 target; Windows Server CI smoke testing does not establish Windows 11 desktop compatibility.
- All installers are unsigned by a distribution identity. macOS applications may have an ad-hoc signature required for local execution; this is not Developer ID signing or notarization. Windows may show an unknown-publisher warning. Do not disable OS security globally.
- Signing, notarization, consistent unsigned-macOS Keychain behavior, and manual assistive-technology verification remain explicit dependencies. Automatic updates are disabled.
- Export format 1 supports schema 9. It does not import arbitrary SQLite databases or attachments. Conflicting identities block the entire merge, including settings. AI model/budget settings remain device-local.
- Chat exports may quote personal evidence. Backups retain all database content; deletion does not erase existing backups.
- No Windows ARM64, Linux, synchronization, accounts, Azure provisioning or readiness guarantee.
- Question/skill coverage remains incomplete; broader tutor evaluation and additional lab walkthroughs are deferred. AI outputs may be wrong. AI API access and Azure usage have separate connectivity and billing requirements.

See RECOVERY.md for installation replacement and backup recovery. Never downgrade an upgraded database in place.
