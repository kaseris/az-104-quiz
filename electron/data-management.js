import { readFileSync, statSync, writeFileSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { dirname, basename, join, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Portability, limits } from './portability.js';
import { ensure } from './validation.js';

// Only this trusted module sees user-selected filesystem paths.
export function registerDataManagement({
  register,
  dialog,
  window,
  app,
  store,
  provider,
  generation,
  reader,
  tutor,
  filename,
  diagnosticErrors,
}) {
  const data = new Portability(store, {
    filename,
    diagnosticErrors,
    appVersion: app.getVersion(),
    runtime: {
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      sqlite: store.db.prepare('SELECT sqlite_version() v').get().v,
    },
  });
  let pending;
  let busy = false;
  const idle = () =>
    ensure(
      !provider.active &&
        !provider.pendingInteractive &&
        !generation.running &&
        !reader.jobs.size &&
        !tutor.tasks.size,
      'Finish or cancel active AI and document work, then try again.',
    );
  const exclusive = async (operation) => {
    ensure(!busy, 'Another data operation is in progress.');
    busy = true;
    try {
      idle();
      provider.disable();
      generation.settings({ automatic: false });
      return await operation();
    } finally {
      busy = false;
    }
  };
  const save = async (name, content, extension) => {
    const result = await dialog.showSaveDialog(window(), {
      defaultPath: name,
      filters: [{ name: 'Study Desk file', extensions: [extension] }],
    });
    if (result.canceled) return { cancelled: true };
    // Overwrite consent is handled by the native save dialog. SQLite backups require a new file.
    const parent = realpathSync(dirname(result.filePath));
    const rel = relative(realpathSync(dirname(filename)), parent);
    ensure(
      rel && (rel.startsWith('..') || isAbsolute(rel)),
      'Save exports and diagnostics outside the live profile folder.',
    );
    const destination = join(parent, basename(result.filePath));
    const temporary = join(parent, `.study-export-${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, content, { mode: 0o600, flag: 'wx' });
      renameSync(temporary, destination);
    } finally {
      rmSync(temporary, { force: true });
    }
    return { saved: true };
  };
  register('data:exportPreview', (options) => {
    const bundle = data.export(options);
    return {
      counts: Object.fromEntries(Object.entries(bundle.records).map(([k, v]) => [k, v.length])),
      exclusions: [
        'API keys and tokens',
        'AI activation, billing and executable jobs',
        'Document cache and search indexes',
        ...(options?.chats ? [] : ['Conversations']),
        ...(options?.labEvidence ? [] : ['Personal lab notes, output and reflection text']),
      ],
    };
  });
  register('data:exportSave', (options) =>
    exclusive(async () =>
      save('study-desk-export.json', JSON.stringify(data.export(options)), 'json'),
    ),
  );
  register('data:backup', () =>
    exclusive(async () => {
      const r = await dialog.showSaveDialog(window(), {
        defaultPath: `study-${Date.now()}.backup`,
        filters: [{ name: 'SQLite recovery backup', extensions: ['backup'] }],
      });
      if (r.canceled) return { cancelled: true };
      idle();
      data.backup(r.filePath);
      return { saved: true };
    }),
  );
  register('data:importPreview', () =>
    exclusive(async () => {
      pending = null;
      const r = await dialog.showOpenDialog(window(), {
        properties: ['openFile'],
        filters: [{ name: 'Study Desk export', extensions: ['json'] }],
      });
      if (r.canceled) return { cancelled: true };
      ensure(statSync(r.filePaths[0]).size <= limits.bytes, 'Import exceeds 256 MiB.');
      let bundle;
      try {
        bundle = JSON.parse(readFileSync(r.filePaths[0], 'utf8'));
      } catch {
        throw new Error('The selected file is not valid JSON.');
      }
      const preview = data.preview(bundle),
        token = randomUUID();
      pending = { bundle, token, expires: Date.now() + 10 * 60 * 1000 };
      return { ...preview, token };
    }),
  );
  register('data:importApply', (p = {}) =>
    exclusive(async () => {
      ensure(
        p.confirmed === true &&
          pending &&
          p.token === pending.token &&
          pending.expires > Date.now(),
        'Preview this import again and confirm its merge policy.',
      );
      idle();
      const result = data.apply(pending.bundle);
      pending = null;
      return result;
    }),
  );
  register('data:erase', (p) =>
    exclusive(async () => {
      idle();
      return data.erase(p);
    }),
  );
  register('data:diagnostics', () => data.diagnostics());
  register('data:diagnosticsSave', () =>
    save('study-desk-diagnostics.json', JSON.stringify(data.diagnostics(), null, 2), 'json'),
  );
}
