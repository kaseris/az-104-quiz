import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StudyStore } from '../electron/store.js';
import { readAppearance, saveAppearance } from '../electron/appearance.js';
import { Portability } from '../electron/portability.js';

test('appearance defaults to system, validates narrowly, and survives a database restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'appearance-'));
  const path = join(directory, 'study.sqlite');
  let store = new StudyStore(path);
  const theme = { themeSource: 'system' };
  try {
    assert.equal(readAppearance(store), 'system');
    for (const mode of ['dark', 'light', 'system', 'dark']) {
      assert.equal(saveAppearance(store, { mode }, theme), mode);
      assert.equal(theme.themeSource, mode);
    }
    for (const invalid of [null, 'light', [], { mode: 'blue' }, { mode: 'light', extra: true }]) {
      assert.throws(() => saveAppearance(store, invalid, theme), /Choose System/);
      assert.equal(readAppearance(store), 'dark');
    }
    store.close();
    store = new StudyStore(path);
    assert.equal(readAppearance(store), 'dark');
    assert.equal(
      new Portability(store).export().records.settings.some((row) => row.key === 'appearance'),
      false,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('failed persistence leaves the running theme unchanged', () => {
  const theme = { themeSource: 'light' };
  const store = {
    setSetting() {
      throw new Error('Disk full');
    },
  };
  assert.throws(() => saveAppearance(store, { mode: 'dark' }, theme), /Disk full/);
  assert.equal(theme.themeSource, 'light');
});
