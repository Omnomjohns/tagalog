// Playwright is not a project dependency. These dev-only scripts use a globally installed copy
// (pre-installed in the cloud VM) and are skipped in CI.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export function loadChromium() {
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(join(globalRoot, 'index.js'))('playwright').chromium;
}
