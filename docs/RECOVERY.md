# Installation, manual updates and recovery

Download the artifact for your architecture and compare its SHA-256 digest with SHA256SUMS.txt. Install a Mac app by opening its DMG and dragging Study Desk to Applications. On Windows run the per-user installer; administrator privileges are not required. Only proceed with an unsigned app if you trust the repository and artifact. Use the operating system's per-app review/open controls; do not disable Gatekeeper or SmartScreen globally.

## Updating

In Settings → Data management save a recovery backup, then quit Study Desk. Replace the application with the newer macOS app or run the newer Windows installer. App identity and profile paths remain stable. Uninstalling does not intentionally remove study data. If the OS cannot unlock an old encrypted key, replace it or explicitly choose session-only storage when secure storage is unavailable. Local study remains available.

Default profile locations:

- macOS: `~/Library/Application Support/AZ-104 Study Desk/`
- Windows: `%APPDATA%\AZ-104 Study Desk\`

The profile contains `study.sqlite`, possible SQLite WAL/SHM files, OS-encrypted `openai-key.enc`, and recovery backups. Never copy a live SQLite database alone. Use the app's consistent backup operation or quit fully before copying the entire profile.

## Recovery after a failed migration or import

1. Quit the application and preserve the entire current profile in a separate private directory, including WAL/SHM files and all backups.
2. Find a known-good `study.sqlite.v<schema>.<id>.backup` migration backup or `study.sqlite.recovery.<id>.backup` file. These are complete SQLite databases; they exclude the encrypted key file, but include personal content and billing records.
3. With the app stopped, move the current database and its WAL/SHM files aside together. Copy the selected backup to `study.sqlite`; never leave stale WAL/SHM files beside the restored database.
4. Open an app version supporting that schema. Do not edit `user_version` to force a downgrade. If the backup is older, later local changes will not be present.

An older backup can also contain older spending records; do not treat restored app estimates as authoritative provider billing. Verify current provider usage before reactivating AI after recovery.

For cross-device transfer use portable JSON exports and import preview. Imported history cannot resume paid jobs. Choose chats and personal lab evidence explicitly. Complete an active local quiz if it conflicts with the imported active session. Differing identities block the merge; no automatic overwrite is offered.

Clearing document cache preserves study history. Selective lab deletion preserves the attempt and completion/cleanup states. Reset removes study records while retaining credentials, preferences, cache and accounting reservations. Copies in chats and older backups require separate deletion. No reset changes Azure resources.

Diagnostics are local and inspectable. Saving a bundle does not upload it. Review it and decide independently whether to share it in a GitHub issue.
