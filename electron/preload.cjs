const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel) => async (payload) => {
  const result = await ipcRenderer.invoke(channel, payload);
  if (!result.ok) {
    const error = new Error(result.error);
    error.kind = result.kind;
    throw error;
  }
  return result.value;
};
contextBridge.exposeInMainWorld(
  'study',
  Object.freeze({
    data: Object.freeze(
      Object.fromEntries(
        [
          'backup',
          'exportPreview',
          'exportSave',
          'importPreview',
          'importApply',
          'erase',
          'diagnostics',
          'diagnosticsSave',
        ].map((m) => [m, invoke(`data:${m}`)]),
      ),
    ),
    labs: Object.freeze(
      Object.fromEntries(
        [
          'list',
          'read',
          'start',
          'update',
          'evidence',
          'complete',
          'cleanup',
          'reflection',
          'openLink',
        ].map((method) => [method, invoke(`labs:${method}`)]),
      ),
    ),
    labAdaptations: Object.freeze(
      Object.fromEntries(
        ['preview', 'create', 'list', 'open', 'dismiss'].map((method) => [
          method,
          invoke(`labAdaptations:${method}`),
        ]),
      ),
    ),
    generation: Object.freeze(
      Object.fromEntries(
        ['list', 'read', 'settings', 'create', 'pause', 'resume', 'retry', 'cancel'].map((m) => [
          m,
          invoke(`generation:${m}`),
        ]),
      ),
    ),
    provider: Object.freeze(
      Object.fromEntries(
        ['status', 'settings', 'validate', 'activate', 'disable'].map((m) => [
          m,
          invoke(`provider:${m}`),
        ]),
      ),
    ),
    tutor: Object.freeze({
      ...Object.fromEntries(
        [
          'list',
          'create',
          'read',
          'update',
          'preview',
          'exclude',
          'send',
          'cancel',
          'retry',
          'citation',
          'remove',
        ].map((m) => [m, invoke(`tutor:${m}`)]),
      ),
      subscribe(conversationId, callback) {
        if (typeof conversationId !== 'string' || typeof callback !== 'function')
          throw new Error('Invalid subscription.');
        const listener = (_event, data) => {
          if (data.conversationId === conversationId) callback({ id: data.id, conversationId });
        };
        ipcRenderer.on('tutor:event', listener);
        return () => ipcRenderer.removeListener('tutor:event', listener);
      },
    }),
    reader: Object.freeze(
      Object.fromEntries(
        [
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
          'openLink',
        ].map((method) => [method, invoke(`reader:${method}`)]),
      ),
    ),
    preview: invoke('study:preview'),
    progress: invoke('study:progress'),
    issues: invoke('study:issues'),
    report: invoke('study:report'),
    resolve: invoke('study:resolve'),
    navigate: invoke('study:navigate'),
    flag: invoke('study:flag'),
    finalize: invoke('study:finalize'),
    getState: invoke('study:state'),
    onboard: invoke('study:onboard'),
    saveKey: invoke('study:save-key'),
    removeKey: invoke('study:remove-key'),
    start: invoke('study:start'),
    session: invoke('study:session'),
    draft: invoke('study:draft'),
    submit: invoke('study:submit'),
    advance: invoke('study:advance'),
    openReference: invoke('study:open-reference'),
  }),
);
