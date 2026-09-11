import { trustedRendererURL } from './trusted-url.js';
import { registerDataManagement } from './data-management.js';
import { LabStore } from './labs.js';
import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  safeStorage,
  session,
  dialog,
  Menu,
  nativeTheme,
} from 'electron';
import { readAppearance, saveAppearance } from './appearance.js';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DocumentStore } from './document-store.js';
import { documents } from '../content/documents.js';
import { safeLink } from './document-source.js';
import { StudyStore } from './store.js';
import { Credentials } from './credentials.js';
import { Provider, ProviderError } from './provider.js';
import { Generation } from './generation.js';
import { Tutor } from './tutor.js';
import { questions } from '../content/questions.js';
import { blueprint } from '../content/catalog.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
app.setName('AZ-104 Study Desk');
if (process.env.AZ104_DATA_DIR && !app.isPackaged)
  app.setPath('userData', process.env.AZ104_DATA_DIR);
const development = !app.isPackaged && process.env.AZ104_DEV_SERVER === 'http://127.0.0.1:5173';
const entry = pathToFileURL(join(root, 'dist/index.html')).href;
const trustedURL = (url) => trustedRendererURL(url, { entry, development });

const allowedLinks = new Set([
  blueprint.url,
  ...documents.map((d) => d.url),
  ...questions.flatMap((q) => [q.source.url, ...q.references.map((r) => r.url)]),
]);
let store;
let credentials;
let reader;
let provider;
let tutor;
let generation;
let window;
let appearanceReady = false;
let windowReady = false;
const resolvedAppearance = () => ({
  mode: readAppearance(store),
  dark: nativeTheme.shouldUseDarkColors,
});
const showReadyWindow = () => {
  if (appearanceReady && windowReady) window?.show();
};
const diagnosticErrors = [];

function register(channel, operation) {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      if (
        event.sender !== window?.webContents ||
        event.senderFrame !== event.sender.mainFrame ||
        !trustedURL(event.senderFrame.url)
      )
        throw new Error('Untrusted application request.');
      return { ok: true, value: await operation(payload) };
    } catch (error) {
      diagnosticErrors.push({
        operation: channel,
        category:
          error instanceof ProviderError ? 'provider' : error.code ? 'storage' : 'validation',
        at: new Date().toISOString(),
      });
      if (diagnosticErrors.length > 20) diagnosticErrors.shift();
      // Return controlled validation messages, never filesystem details or raw provider errors.
      return {
        ok: false,
        kind: error instanceof ProviderError ? error.kind : 'validation',
        error:
          error instanceof ProviderError
            ? error.message
            : error.code
              ? 'The operation could not be saved. Check available disk space and restart the app.'
              : error.message,
      };
    }
  });
}
const state = () => ({
  ...store.state(),
  appearance: readAppearance(store),
  credentials: { ...credentials.status(), revision: provider?.epoch || 0 },
});
function createWindow() {
  appearanceReady = false;
  windowReady = false;
  window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 860,
    minHeight: 650,
    title: 'AZ-104 Study Desk',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0F172A' : '#F5F7FB',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 22, y: 22 } } : {}),
    webPreferences: {
      preload: join(root, 'electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!trustedURL(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => {
    windowReady = true;
    showReadyWindow();
  });
  window.on('closed', () => {
    window = null;
  });
  if (development) window.loadURL('http://127.0.0.1:5173');
  else window.loadFile(join(root, 'dist/index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(() => {
      const directory = app.getPath('userData');
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      store = new StudyStore(join(directory, 'study.sqlite'));
      nativeTheme.themeSource = readAppearance(store);
      nativeTheme.on('updated', () => {
        window?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0F172A' : '#F5F7FB');
        window?.webContents.send('study:appearance-changed', resolvedAppearance());
      });
      register('study:get-appearance', () => resolvedAppearance());
      register('study:appearance-ready', () => {
        appearanceReady = true;
        showReadyWindow();
      });
      register('study:set-appearance', (payload) => saveAppearance(store, payload, nativeTheme));
      const labStore = new LabStore(store);
      for (const method of [
        'list',
        'read',
        'start',
        'update',
        'evidence',
        'complete',
        'cleanup',
        'reflection',
      ])
        register(`labs:${method}`, (payload) => labStore[method](payload));
      register('labs:openLink', async (payload) => {
        await shell.openExternal(labStore.link(payload));
        return true;
      });
      credentials = new Credentials(directory, safeStorage);
      reader = new DocumentStore(store);
      provider = new Provider(store, credentials, {
        notify: (event) => {
          if (window && !window.isDestroyed()) window.webContents.send('tutor:event', event);
        },
      });
      tutor = new Tutor(store, reader, provider);
      generation = new Generation(store, reader, provider);
      registerDataManagement({
        register,
        dialog,
        window: () => window,
        app,
        store,
        provider,
        generation,
        reader,
        tutor,
        filename: join(directory, 'study.sqlite'),
        diagnosticErrors: () => [...diagnosticErrors],
      });
      for (const method of ['preview', 'create', 'list', 'open', 'dismiss'])
        register(`labAdaptations:${method}`, (payload) =>
          generation.labAdaptations[method](payload),
        );
      for (const method of [
        'list',
        'read',
        'settings',
        'create',
        'pause',
        'resume',
        'retry',
        'cancel',
      ])
        register(`generation:${method}`, (payload) => generation[method](payload));
      for (const method of ['status', 'settings', 'validate', 'activate', 'disable'])
        register(`provider:${method}`, (payload) => provider[method](payload));
      for (const method of [
        'list',
        'create',
        'read',
        'update',
        'preview',
        'exclude',
        'send',
        'retry',
        'citation',
        'remove',
      ])
        register(`tutor:${method}`, (payload) =>
          method === 'send'
            ? provider.interactive(() => tutor.send(payload))
            : tutor[method](payload),
        );
      register('tutor:cancel', (payload) => provider.cancel(payload));
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      // Renderer content stays local. Documentation retrieval uses the trusted Node HTTPS service.
      session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const remote = /^https?:|^wss?:/.test(details.url);
        const localDev =
          development &&
          /^http:\/\/127\.0\.0\.1:5173(?:\/|$)|^ws:\/\/127\.0\.0\.1:5173(?:\/|$)/.test(details.url);
        callback({ cancel: remote && !localDev });
      });
      register('study:state', state);
      for (const method of [
        'state',
        'read',
        'fetch',
        'cancel',
        'search',
        'picker',
        'resolve',
        'annotate',
        'note',
        'removeAnnotation',
        'saveDraft',
        'draftReference',
        'removeDraft',
        'clear',
      ])
        register(`reader:${method}`, (payload) => reader[method](payload));
      register('reader:openLink', async (payload = {}) => {
        const { id, revision, url } = payload;
        const source = reader.source(id);
        const known = new Set([source.url, source.licenseUrl, source.codeLicenseUrl]);
        const { article, version } = reader.read({ id, revision });
        if (version?.sourceUrl) known.add(version.sourceUrl);
        const visit = (node) => {
          if (typeof node === 'string') return;
          if (node.href && safeLink(node.href, source.url)) known.add(node.href);
          for (const child of node.children || []) visit(child);
        };
        for (const section of article?.sections || [])
          for (const node of section.nodes) visit(node);
        if (typeof url !== 'string' || !known.has(url))
          throw new Error('This link is not in the reviewed article.');
        await shell.openExternal(url);
        return true;
      });
      register('study:onboard', (payload = {}) => {
        if (typeof payload.apiKey === 'string' && payload.apiKey.trim())
          credentials.save(payload.apiKey, payload.sessionConsent === true);
        store.setSetting('onboarded', true);
        return state();
      });
      register('study:save-key', (payload) => {
        provider.disable();
        credentials.save(
          typeof payload === 'string' ? payload : payload?.key,
          payload?.sessionConsent === true,
        );
        return state();
      });
      register('study:remove-key', () => {
        provider.disable();
        credentials.remove();
        return state();
      });
      for (const method of [
        'preview',
        'progress',
        'issues',
        'report',
        'resolve',
        'navigate',
        'flag',
        'finalize',
      ])
        register(`study:${method}`, (payload) => store[method](payload));
      const timer = setInterval(() => {
        try {
          store.enforceTime();
        } catch {
          /* Next operation reports recoverable storage failure. */
        }
      }, 1000);
      timer.unref();
      register('study:start', (payload) => store.start(payload));
      register('study:session', (id) => store.session(id));
      register('study:draft', (payload) => store.draft(payload));
      register('study:submit', (payload) => store.submit(payload));
      register('study:advance', (payload) => store.advance(payload));
      register('study:open-reference', async (url) => {
        if (typeof url !== 'string' || !allowedLinks.has(url))
          throw new Error('This reference is not in the reviewed source list.');
        await shell.openExternal(url);
        return true;
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              ...(process.platform === 'darwin' ? [{ role: 'hide' }] : []),
              { role: 'quit' },
            ],
          },
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' },
              { role: 'redo' },
              { type: 'separator' },
              { role: 'cut' },
              { role: 'copy' },
              { role: 'paste' },
              { role: 'selectAll' },
            ],
          },
          {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { role: 'togglefullscreen' },
            ],
          },
          { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }] },
        ]),
      );
      createWindow();
      app.on('activate', () => {
        if (!BrowserWindow.getAllWindows().length) createWindow();
      });
    })
    .catch(() => {
      dialog.showErrorBox(
        'Study Desk could not start',
        'Your study data could not be opened. The app has not reset your profile. Check available disk space and permissions. If you used a newer version, reopen it with that version. Before recovery, quit the app and preserve study.sqlite and its WAL/SHM files. Migration and recovery backups are beside the database in the Study Desk application-data folder. See the recovery guide before replacing files.',
      );
      app.quit();
    });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', () => {
    generation?.close();
    provider?.close();
  });
  app.on('will-quit', () => {
    reader?.close();
    store?.close();
  });
}
