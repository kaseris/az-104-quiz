# Release procedure and workflow strategy

Use `main` for reviewed changes. CI validates Node tests and real Electron workflows on Apple Silicon, Intel and Windows. GitHub Actions are pinned to commit SHAs; review and update those pins deliberately. No provider or distribution credentials are passed to PR jobs.

Keep package.json and package-lock.json versions equal. Database and export schema versions are independent. The first release is v0.5.0. Before tagging, run `npm ci`, `npm run check`, `npm run test:e2e`, `npm run benchmark`, and the dependency/content audit. Review the initial tracked-file list for personal evaluation outputs and credentials.

Push `main`, wait for CI, then create an annotated `v0.5.0` tag at the validated commit and push it. The release workflow verifies tag/version/main ancestry, builds and tests native artifacts, tests the same Mac apps on macOS 26, computes checksums and creates a draft prerelease. Only the draft job has repository write permission. An existing release is never overwritten.

Review clean install/replacement, credential access, offline behavior, recovery, accessibility and the test reports before publishing the existing draft. Keep unperformed manual checks explicit. Windows remains experimental until Windows 11 clean-machine validation. Distribution signing/notarization are intentionally unmet for this preview. Do not publish a candidate with a critical defect, data loss or a high-severity security finding. Never move a published tag or replace its assets; use a new patch release for corrections.

Manual dispatch is a possible future candidate-building strategy, but adds coordination of commits, versions and tags. Release-please can later automate version/changelog PRs when release frequency warrants it. Neither is enabled now. Automatic application updates require a separate trusted signing/distribution design.

## Content maintenance

Keep the versioned exam blueprint and skill mappings explicit. Review Microsoft objectives, record coverage differences, and migrate mappings deliberately. Increment question versions when meaning or answers change. Retire disputed or obsolete versions from future selection without rewriting stored session snapshots, answers or grades. Keep source notices, reviewed dates and audit records current. Unverified lab drafts remain excluded from the released catalog.
