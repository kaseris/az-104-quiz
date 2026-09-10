import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// CI-only installation into a disposable directory. No personal Applications folder is modified.
export function installer() {
  if (process.env.CI !== 'true')
    throw new Error('Installer tests require a disposable CI account.');
  const target = mkdtempSync(join(tmpdir(), 'az104-installed-'));
  const extension = process.platform === 'darwin' ? '.dmg' : '.exe';
  const artifact = resolve(
    'release',
    readdirSync('release').find(
      (n) => n.endsWith(extension) && n.startsWith('AZ104-Study-Desk-'),
    ) || 'missing',
  );
  const app = join(target, 'AZ-104 Study Desk.app');
  const executable =
    process.platform === 'darwin'
      ? join(app, 'Contents/MacOS/AZ-104 Study Desk')
      : join(target, 'app', 'AZ-104 Study Desk.exe');
  return {
    executable,
    install() {
      if (process.platform === 'darwin') {
        const mount = join(target, 'mount');
        mkdirSync(mount, { recursive: true });
        execFileSync(
          'hdiutil',
          ['attach', '-nobrowse', '-readonly', '-mountpoint', mount, artifact],
          { stdio: 'pipe' },
        );
        try {
          rmSync(app, { recursive: true, force: true });
          execFileSync('ditto', [join(mount, 'AZ-104 Study Desk.app'), app]);
          execFileSync('codesign', ['--verify', '--deep', '--strict', app]);
        } finally {
          execFileSync('hdiutil', ['detach', mount], { stdio: 'pipe' });
        }
      } else
        execFileSync(artifact, ['/S', `/D=${join(target, 'app')}`], {
          timeout: 120000,
          stdio: 'pipe',
        });
    },
    async cleanup() {
      // Windows can retain a directory handle briefly after Electron has exited.
      // Retry the whole removal, including root-directory EPERM failures.
      for (let attempt = 0; ; attempt++) {
        try {
          rmSync(target, { recursive: true, force: true });
          return;
        } catch (error) {
          if (
            process.platform !== 'win32' ||
            attempt === 20 ||
            !['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)
          )
            throw error;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    },
  };
}
