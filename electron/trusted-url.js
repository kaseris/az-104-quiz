import { fileURLToPath } from 'node:url';

export function trustedRendererURL(
  url,
  { entry, development = false, platform = process.platform },
) {
  try {
    const parsed = new URL(url);
    if (development) return parsed.origin === 'http://127.0.0.1:5173';
    if (parsed.protocol !== 'file:' || parsed.search || parsed.hostname) return false;
    // Chromium and Node can spell Windows drive/path case and percent escapes differently.
    // Compare the exact decoded file path, never a directory prefix or arbitrary file URL.
    const options = { windows: platform === 'win32' };
    const actual = fileURLToPath(parsed, options),
      expected = fileURLToPath(entry, options);
    return platform === 'win32'
      ? actual.toLowerCase() === expected.toLowerCase()
      : actual === expected;
  } catch {
    return false;
  }
}
