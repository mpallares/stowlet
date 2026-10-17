/*
 * Captures the three feature stills on the landing page from the mock page, so they
 * always show the current panel design and the same sample data.
 *
 *   pnpm --filter @gaveta/extension build:e2e
 *   node scripts/capture-stills.mjs          # writes web/public/feature-{folders,search,export}.webp
 *
 * Needs ffmpeg for the WebP encode. Playwright serves the fixture page itself.
 */
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const extensionPath = join(here, '..', '.output', 'chrome-mv3-e2e');
const outDir = process.env.STILLS_OUT ?? join(here, '..', '..', 'web', 'public');
// The e2e manifest only matches this port.
const PORT = 4173;
const FOLDERS = ['Engineering', 'Travel', 'Cooking'];
const FILED = [
  ['SQL', 'Engineering'],
  ['Rust', 'Engineering'],
  ['Lisbon', 'Travel'],
  ['Sourdough', 'Cooking'],
];
const QUERY = 'sql';
const EXPORT_ROW = 'SQL';

const server = spawn('node', [join(here, '..', 'test', 'e2e', 'serve-fixture.mjs'), String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 800));
const tmp = mkdtempSync(join(tmpdir(), 'gaveta-stills-'));

try {
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    colorScheme: 'dark',
    viewport: { width: 1100, height: 820 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--force-device-scale-factor=2',
    ],
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(
    () =>
      document
        .querySelector('gaveta-panel')
        ?.shadowRoot?.querySelector('[data-testid=status]')
        ?.getAttribute('data-status') === 'ready',
  );
  for (const name of FOLDERS) {
    await page.getByTestId('new-folder-button').click();
    await page.getByTestId('new-folder-input').fill(name);
    await page.getByTestId('new-folder-input').press('Enter');
    await page.locator(`[data-folder-name="${name}"]`).waitFor();
  }
  const list = page.getByTestId('conversation-list');
  for (const [text, folder] of FILED) {
    await list
      .locator('li[data-conversation-key]', { hasText: text })
      .first()
      .dragTo(page.locator(`[data-folder-name="${folder}"]`).getByTestId('folder-select'));
  }
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);

  const panel = await page.getByTestId('panel').boundingBox();
  const clip = async (name, top, bottom) => {
    const png = join(tmp, `${name}.png`);
    await page.screenshot({
      path: png,
      clip: { x: panel.x, y: top, width: panel.width, height: bottom - top },
    });
    const res = spawnSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-i',
        png,
        '-c:v',
        'libwebp',
        '-quality',
        '88',
        join(outDir, `${name}.webp`),
      ],
      { stdio: 'inherit' },
    );
    if (res.status !== 0) throw new Error(`ffmpeg failed for ${name}`);
  };

  const search = await page.getByTestId('search-input').boundingBox();
  const tree = await page.getByTestId('folder-tree').boundingBox();
  await clip('feature-folders', search.y - 12, tree.y + tree.height + 12);

  await page.getByTestId('search-input').fill(QUERY);
  await page.getByTestId('search-results').locator('li[data-conversation-key]').first().waitFor();
  await page.waitForTimeout(300);
  const results = await page.getByTestId('search-results').boundingBox();
  await clip('feature-search', search.y - 12, results.y + results.height + 12);
  await page.getByTestId('search-input').fill('');
  await page.waitForTimeout(300);

  const row = list.locator('li[data-conversation-key]', { hasText: EXPORT_ROW }).first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await row.getByTestId('export-button').click();
  await page.getByTestId('export-menu').waitFor();
  await page.waitForTimeout(200);
  const rowBox = await row.boundingBox();
  const menu = await page.getByTestId('export-menu').boundingBox();
  await clip(
    'feature-export',
    rowBox.y - 8,
    Math.max(rowBox.y + rowBox.height, menu.y + menu.height) + 10,
  );

  await ctx.close();
  console.info(
    `Wrote feature-folders.webp, feature-search.webp and feature-export.webp to ${outDir}`,
  );
} finally {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
