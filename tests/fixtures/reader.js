// Original synthetic content for deterministic reader tests; no remote access required.
export function articleHTML({
  passage = 'A role assignment connects a principal, a role, and a scope.',
  extra = '',
  repository = 'azure-docs',
} = {}) {
  return `<html><head><meta name="github_feedback_content_git_url" content="https://github.com/MicrosoftDocs/${repository}/blob/main/articles/example.md"><meta name="updated_at" content="2026-09-06T00:00:00Z"></head><body><main id="main"><div class="content"><h1>Azure access study</h1></div><nav>Unrelated chrome</nav><div class="content"><p>Learn how Azure access works. This introductory paragraph provides enough context to read the example independently.</p><h2 id="role-assignments">Role assignments</h2><p>${passage}</p><ul><li>Review the principal.</li><li>Choose the least privileged role.</li></ul><h2 id="comparison">Comparison</h2><table><thead><tr><th>Role</th><th>Purpose</th></tr></thead><tbody><tr><td>Reader</td><td>Inspect resources</td></tr></tbody></table><h2 id="example">Bicep example</h2><pre><code>param location string = 'eastus'\nresource account 'Example/storage@2026-01-01' = {\n  name: 'demo'\n}</code></pre><p><a href="#role-assignments">Role assignments</a> and <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/overview">original guidance</a>.</p>${extra}</div></main></body></html>`;
}
