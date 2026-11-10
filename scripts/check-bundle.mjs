// Fails when the JavaScript the app loads initially exceeds the gzip budget (fonts excluded).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 200;
const dist = join(import.meta.dirname, '../dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g), ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)]
  .map((m) => m[1].replace(/^.*\/assets\//, 'assets/'));
if (!scripts.length) { console.error('No scripts found in dist/index.html'); process.exit(1); }
let total = 0;
for (const s of new Set(scripts)) {
  const kb = gzipSync(readFileSync(join(dist, s))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} kB gzip  ${s}`);
}
console.log(`${total.toFixed(1).padStart(7)} kB gzip  initial JS (budget ${BUDGET_KB} kB)`);
if (total > BUDGET_KB) { console.error('Bundle budget exceeded.'); process.exit(1); }
