// Headless smoke test of the production build: manifest, service worker, offline start, one session.
// Dev-only (needs a global Playwright). It cannot stand in for testing on iOS Safari.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { loadChromium } from './playwright.mjs';

const dist = join(import.meta.dirname, '../dist');
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
const base = readFileSync(join(dist, 'index.html'), 'utf8').match(/src="(\/[^"]*\/)assets\//)?.[1] ?? '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(base)) { res.writeHead(404).end(); return; }
  let file = join(dist, path.slice(base.length) || 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(0);
const url = `http://localhost:${server.address().port}${base}`;

const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

check('manifest: standalone display', manifest.display === 'standalone');
check('manifest: relative start_url and scope', manifest.start_url === '.' && manifest.scope === '.');
check('manifest: 192 and 512 icons plus maskable', ['192x192', '512x512'].every((s) => manifest.icons.some((i) => i.sizes === s)) && manifest.icons.some((i) => i.purpose === 'maskable'));
check('manifest: icon files exist', manifest.icons.every((i) => existsSync(join(dist, i.src))) && existsSync(join(dist, 'icons/apple-touch-icon.png')));

const browser = await loadChromium().launch();
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, permissions: ['microphone'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url);
await page.getByRole('heading', { name: 'Salita' }).waitFor();
check('app loads', true, url);
await page.getByText('Ready offline').waitFor({ timeout: 20_000 });
const sw = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
check('service worker active', sw === 'activated' || sw === 'activating', sw);
check('install banner shown outside standalone mode', await page.getByText('Install to Home Screen').isVisible());

await context.setOffline(true);
await page.reload();
await page.getByRole('heading', { name: 'Salita' }).waitFor();
check('starts offline from the precache', true);

await page.getByRole('button', { name: /Start today/ }).click();
let rated = 0;
for (let i = 0; i < 40 && !(await page.getByRole('heading', { name: 'Session done' }).isVisible()); i++) {
  const click = async (name) => { const b = page.getByRole('button', { name }); if (await b.first().isVisible()) { await b.first().click(); return true; } return false; };
  if (await click('I understand')) continue;
  if (await click(/show answer/)) { await click('All correct'); await click('Good'); rated++; continue; }
  if (await click('I spoke without recording')) {
    for (const g of await page.getByRole('group').all()) await g.getByRole('button', { name: '3' }).click().catch(() => undefined);
    await click('Save and continue'); rated++; continue;
  }
  const option = page.locator('.options button').first();
  if (await option.isVisible()) { await option.click(); await click('Continue'); rated++; continue; }
  await page.waitForTimeout(150);
}
check('a full session can be completed offline', await page.getByRole('heading', { name: 'Session done' }).isVisible(), `${rated} steps`);
await page.screenshot({ path: process.env.SMOKE_SHOT ?? '/dev/null' }).catch(() => undefined);
await page.getByRole('button', { name: 'Done' }).click();
for (const tab of ['Units', 'Progress', 'Settings']) {
  await page.getByRole('navigation').getByRole('button', { name: tab }).click();
  await page.getByRole('heading', { name: tab, level: 1 }).waitFor();
}
check('all tabs render', true);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
server.close();
process.exit(checks.every(Boolean) ? 0 : 1);
