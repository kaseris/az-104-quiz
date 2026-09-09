# Documentation source notices

The current registry contains 19 curated Microsoft Learn articles. The recorded per-article source URLs, mappings, revisions, extraction checks, and license links are in [DOCUMENT_SOURCE_AUDIT.json](DOCUMENT_SOURCE_AUDIT.json). The two 6D.2 pilot-source additions have a focused live audit in [LAB_ADAPTATION_SOURCE_AUDIT.json](LAB_ADAPTATION_SOURCE_AUDIT.json); the earlier audit remains historical. Run `npm run audit:documents` to repeat the network audit. It writes audit metadata only, not a redistributed mirror of article bodies.

| Public source repository         | Documentation | Code samples | Bundled notices                                                           |
| -------------------------------- | ------------- | ------------ | ------------------------------------------------------------------------- |
| MicrosoftDocs/azure-docs         | CC BY 4.0     | MIT          | `licenses/azure-docs.txt`, `licenses/azure-docs-code.txt`                 |
| MicrosoftDocs/azure-compute-docs | CC BY 4.0     | MIT          | `licenses/azure-compute-docs.txt`, `licenses/azure-compute-docs-code.txt` |
| MicrosoftDocs/azure-monitor-docs | CC BY 4.0     | MIT          | `licenses/azure-monitor-docs.txt`, `licenses/azure-monitor-docs-code.txt` |
| MicrosoftDocs/entra-docs         | MIT           | MIT          | `licenses/entra-docs.txt`                                                 |

Copyright © Microsoft Corporation and contributors. The reader identifies the original article and repository, links the applicable licenses, and states the transformation: article content is extracted for reading, with site chrome and executable media removed. Source dates and content hashes accompany cached versions. Media are not downloaded or redistributed by this reader; descriptive links lead to the original article. Reader output does not imply Microsoft endorsement.

Import permission is checked against the registry repository using Microsoft's public `github_feedback_content_git_url` metadata, falling back to `original_content_git_url` only when it points to that public repository. Public Markdown (`.md`) and YAML (`.yml`) article paths are accepted within the approved repository. Private `*-pr` repository metadata is not treated as sufficient permission evidence. Sources without verified public provenance fail closed with an external-link fallback. A future source/repository change requires editorial review and a registry update; redirects alone cannot authorize a different source repository.

The registry maps 21 of 82 skills and covers every objective group. Skill-level gaps remain explicit. Questions and historical explanations retain their separate provenance and licenses; adding reader links does not modify stored question snapshots.

New runtime dependencies: parse5 (MIT) supplies standards-based HTML parsing; ipaddr.js (MIT) classifies network addresses. Their license files are included with their npm packages. No remote source text is evaluated as application instructions, HTML scripts, or desktop code.
