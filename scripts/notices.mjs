import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
let out =
  '# Third-party notices\n\nOriginal Study Desk code is MIT licensed. Bundled question adaptations and Microsoft documentation retain their source licenses; see licenses/ and docs/DOCUMENT_SOURCES.md. Electron includes Chromium and other components; its LICENSE and LICENSES.chromium.html are shipped by electron-builder.\n\n';
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev) continue;
  const manifest = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
  out += `## ${manifest.name} ${manifest.version}\n\nDeclared license: ${manifest.license || pkg.license || 'See upstream notices'}.\n\n`;
  for (const name of readdirSync(path).filter((n) =>
    /^(licen[sc]e|copying|notice)(\.|$)/i.test(n),
  )) {
    const f = join(path, name);
    if (existsSync(f)) {
      try {
        out += '```text\n' + readFileSync(f, 'utf8') + '\n```\n\n';
      } catch {
        /* Directory: see package license declaration. */
      }
    }
  }
}
writeFileSync('THIRD_PARTY_NOTICES.md', out);
