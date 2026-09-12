const modes = new Set(['system', 'light', 'dark']);

export function readAppearance(store) {
  const value = store.setting('appearance');
  return modes.has(value) ? value : 'system';
}

export function saveAppearance(store, payload, nativeTheme) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    Object.keys(payload).length !== 1 ||
    !modes.has(payload.mode)
  ) {
    throw new Error('Choose System, Light, or Dark.');
  }
  // Persist first: a storage failure must leave the running appearance unchanged.
  store.setSetting('appearance', payload.mode);
  nativeTheme.themeSource = payload.mode;
  return payload.mode;
}
