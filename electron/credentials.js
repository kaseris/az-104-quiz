import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ensure } from './validation.js';

/** Credentials never leave the trusted process except the user-owned entry field. */
export class Credentials {
  constructor(directory, protection) {
    this.path = join(directory, 'openai-key.enc');
    this.protection = protection;
    this.sessionKey = null;
  }
  secureAvailable() {
    return (
      this.protection.isEncryptionAvailable() &&
      this.protection.getSelectedStorageBackend?.() !== 'basic_text'
    );
  }
  status() {
    return {
      hasKey: Boolean(this.sessionKey) || existsSync(this.path),
      storage: this.sessionKey ? 'session' : existsSync(this.path) ? 'encrypted' : 'none',
      secureAvailable: this.secureAvailable(),
      validated: false,
      aiAvailable: false,
    };
  }
  save(raw, sessionConsent = false) {
    ensure(typeof raw === 'string', 'Enter an API key.');
    const key = raw.trim();
    ensure(
      key.length >= 10 && key.length <= 4096 && !/\s/.test(key),
      'Enter a key without spaces (10–4096 characters). It will be stored; activation is separate.',
    );
    if (!this.secureAvailable()) {
      ensure(sessionConsent, 'Accept session-only key storage before continuing.');
      rmSync(this.path, { force: true });
      this.sessionKey = key;
    } else {
      const encrypted = this.protection.encryptString(key);
      const temp = `${this.path}.tmp`;
      try {
        writeFileSync(temp, encrypted, { mode: 0o600 });
        renameSync(temp, this.path);
        this.sessionKey = null;
      } finally {
        rmSync(temp, { force: true });
      }
    }
    return this.status();
  }
  // Reserved for the future main-process OpenAI client; never exposed over IPC.
  read() {
    return (
      this.sessionKey ??
      (existsSync(this.path) ? this.protection.decryptString(readFileSync(this.path)) : null)
    );
  }
  remove() {
    rmSync(this.path, { force: true });
    this.sessionKey = null;
    return this.status();
  }
}
