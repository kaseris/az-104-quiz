import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Credentials } from '../electron/credentials.js';

// Inject a real authenticated cipher to test the persistence contract without touching a user's Keychain.
function protector() {
  const key = randomBytes(32);
  return {
    isEncryptionAvailable: () => true,
    encryptString(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    },
    decryptString(data) {
      const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString();
    },
  };
}
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'az104-key-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('credentials are encrypted on disk, hidden from status, replaceable and removable', (t) => {
  const dir = temp(t);
  const safe = protector();
  const c = new Credentials(dir, safe);
  const key = 'test-only-placeholder-not-a-real-key';
  c.save(key);
  assert.equal(c.read(), key);
  assert.equal(readFileSync(c.path).includes(key), false);
  if (process.platform !== 'win32') assert.equal(statSync(c.path).mode & 0o777, 0o600);
  assert.equal(JSON.stringify(c.status()).includes(key), false);
  assert.equal(c.status().validated, false);
  assert.equal(c.status().aiAvailable, false);
  const restored = new Credentials(dir, safe);
  assert.equal(restored.read(), key);
  restored.save('replacement-test-placeholder');
  assert.equal(restored.read(), 'replacement-test-placeholder');
  restored.remove();
  assert.equal(restored.read(), null);
  assert.equal(restored.status().hasKey, false);
});

test('unavailable encryption and Linux basic_text never persist plaintext', (t) => {
  const dir = temp(t);
  for (const safe of [
    { isEncryptionAvailable: () => false },
    { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'basic_text' },
  ]) {
    const c = new Credentials(dir, safe);
    assert.throws(() => c.save('test-only-session-credential'), /Accept session-only/);
    c.save('test-only-session-credential', true);
    assert.equal(c.status().storage, 'session');
    assert.equal(new Credentials(dir, safe).status().hasKey, false);
    c.remove();
    assert.equal(c.status().hasKey, false);
  }
});

test('invalid keys do not replace existing credentials and encryption failures preserve the old key', (t) => {
  const safe = protector();
  const c = new Credentials(temp(t), safe);
  c.save('existing-placeholder-key');
  for (const value of [null, '', 'short', 'has spaces and is long', 'a'.repeat(4097)])
    assert.throws(() => c.save(value));
  assert.equal(c.read(), 'existing-placeholder-key');
  safe.encryptString = () => {
    throw new Error('OS protection unavailable');
  };
  assert.throws(() => c.save('new-placeholder-key'), /unavailable/);
  assert.equal(c.read(), 'existing-placeholder-key');
});
