import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trustedRendererURL } from '../electron/trusted-url.js';
test('Windows installed paths tolerate URL spelling but reject other files, origins and queries', () => {
  const config = {
    entry: 'file:///C:/Users/Runner/App%20Desk/resources/app.asar/dist/index.html',
    platform: 'win32',
  };
  assert.equal(
    trustedRendererURL(
      'file:///c:/users/runner/App%20Desk/resources/app.asar/dist/index.html#quiz',
      config,
    ),
    true,
  );
  for (const url of [
    'file:///C:/Users/Runner/App%20Desk/resources/app.asar/dist/evil.html',
    config.entry + '?other=1',
    'https://example.com/index.html',
    'file://server/share/index.html',
    'not a URL',
    'data:text/html,test',
  ])
    assert.equal(trustedRendererURL(url, config), false);
});
test('macOS matching remains case sensitive and production rejects development URLs', () => {
  const config = {
    entry: 'file:///Applications/Study%20Desk.app/Contents/Resources/app.asar/dist/index.html',
    platform: 'darwin',
  };
  assert.equal(trustedRendererURL(config.entry + '#quiz', config), true);
  assert.equal(trustedRendererURL(config.entry.replace('Study', 'study'), config), false);
  assert.equal(trustedRendererURL('http://127.0.0.1:5173', config), false);
  assert.equal(trustedRendererURL('http://127.0.0.1:5173', { ...config, development: true }), true);
});
