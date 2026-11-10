// Renders the mascot component to SVG and rasterises the app icons with the local Chromium.
// Run manually (npm run icons) when the mascot changes; the PNGs are committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { loadChromium } from './playwright.mjs';

const out = join(import.meta.dirname, '../public/icons');
mkdirSync(out, { recursive: true });
const BG = '#F7F1E5';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { Mascot } = await vite.ssrLoadModule('/src/mascot/Mascot.tsx');
const inner = renderToStaticMarkup(createElement(Mascot, { state: 'happy', size: 120 }))
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, '');
await vite.close();

// scale = how much of the canvas the mascot fills (maskable icons need a safe zone).
const svg = (scale) => {
  const size = 120 / scale;
  const off = (size - 120) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${BG}"/><g transform="translate(${off} ${off - 2})">${inner}</g></svg>`;
};
writeFileSync(join(out, 'icon.svg'), svg(0.86));

const browser = await loadChromium().launch();
const page = await browser.newPage();
for (const [name, px, scale] of [['apple-touch-icon', 180, 0.86], ['icon-192', 192, 0.86], ['icon-512', 512, 0.86], ['maskable-512', 512, 0.62]]) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<body style="margin:0">${svg(scale).replace('<svg ', `<svg width="${px}" height="${px}" `)}</body>`);
  await page.screenshot({ path: join(out, `${name}.png`), clip: { x: 0, y: 0, width: px, height: px } });
  console.log(`icons/${name}.png`);
}
await browser.close();
