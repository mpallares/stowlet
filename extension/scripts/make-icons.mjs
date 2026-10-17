/*
 * Renders the toolbar icons from the same two-drawer mark the panel header and the
 * website use: white strokes on the orange tile. Uses Playwright (already a dev
 * dependency) to rasterise the SVG at each size.
 *
 *   node scripts/make-icons.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="#c2410c"/>
  <g transform="translate(4 4)" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M3 12h18M10 8h4M10 16h4"/>
  </g>
</svg>`;

const browser = await chromium.launch({ channel: 'chromium', headless: true });
for (const size of [16, 32, 48, 96, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  const png = await page.screenshot({ omitBackground: true, type: 'png' });
  writeFileSync(join(outDir, `${size}.png`), png);
  await page.close();
}
await browser.close();
console.info(`Wrote icons to ${outDir}`);
