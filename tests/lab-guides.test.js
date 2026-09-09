import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { batch1Labs } from '../content/labs-batch1.js';
import { renderGuide } from '../scripts/lab-guides.mjs';

test('draft guides match catalog and Bash blocks parse without execution', () => {
  for (const lab of batch1Labs) {
    const guide = readFileSync(new URL(`../docs/LAB_${lab.id}.md`, import.meta.url), 'utf8');
    assert.equal(guide, renderGuide(lab));
    for (const [, command] of guide.matchAll(/```bash\n([\s\S]*?)\n```/g)) {
      const result = spawnSync(
        process.platform === 'win32'
          ? join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
          : 'bash',
        ['-n'],
        { input: command, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
    }
  }
});
test('both ARM methods embed the reviewed single-resource template', () => {
  const template = JSON.parse(
    readFileSync(new URL('../content/templates/storage-practice.json', import.meta.url)),
  );
  const arm = batch1Labs.find((l) => l.id === 'arm-storage-deployment');
  for (const method of ['portal', 'cli']) {
    const embedded = JSON.parse(arm.methods[method].walkthrough.find((s) => s.startsWith('{')));
    assert.deepEqual(embedded, template);
  }
  assert.equal(template.resources.length, 1);
  const account = template.resources[0];
  assert.equal(account.type, 'Microsoft.Storage/storageAccounts');
  assert.equal(account.name, "[parameters('storageAccountName')]");
  assert.equal(account.tags.Practice, "[parameters('practiceLabel')]");
  assert.equal(account.sku.name, 'Standard_LRS');
  assert.equal(account.properties.publicNetworkAccess, 'Disabled');
  assert.equal(account.properties.allowBlobPublicAccess, false);
  assert.equal(account.properties.supportsHttpsTrafficOnly, true);
});
