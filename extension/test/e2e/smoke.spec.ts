import { type Download } from '@playwright/test';
import { expect, test } from './extension';

/** Reads a blob download; also lets Chromium finish it so closing the context is instant. */
async function readDownload(download: Download): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

test('create folder → add chat → search → export', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/');

  const panel = page.getByTestId('panel');
  await expect(panel).toBeVisible();

  // Wait for the mock adapter to finish indexing.
  await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await expect(page.getByTestId('conversation-mock-0001')).toBeVisible();

  // Create a folder.
  await page.getByTestId('new-folder-button').click();
  await page.getByTestId('new-folder-input').fill('Cooking');
  await page.getByTestId('new-folder-input').press('Enter');
  const folder = page.locator('[data-folder-name="Cooking"]');
  await expect(folder).toBeVisible();

  // Drag a chat into the folder.
  await page.getByTestId('conversation-mock-0001').dragTo(folder.getByTestId('folder-select'));
  await expect(folder.getByTestId('folder-count')).toHaveText('1');

  // Folder view shows only that chat.
  await folder.getByTestId('folder-select').click();
  await expect(
    page.getByTestId('conversation-list').locator('li[data-conversation-key]'),
  ).toHaveCount(1);

  // Free tier: a word that only appears inside messages is counted, not shown.
  await page.getByTestId('search-input').fill('acetone');
  const results = page.getByTestId('search-results');
  await expect(results.locator('li[data-conversation-key]')).toHaveCount(0);
  await expect(results.getByTestId('pro-matches')).toContainText('1 more match');

  // Title matches still work on Free.
  await page.getByTestId('search-input').fill('sourdough');
  await expect(results.locator('li[data-conversation-key]')).toHaveCount(1);
  await expect(results.getByTestId('conversation-mock-0001')).toBeVisible();

  // JSON export, tags, notes and folder export are gated on Free.
  await results.getByTestId('export-button').click();
  await page.getByTestId('export-json').click();
  await expect(page.getByTestId('upgrade-state')).toHaveAttribute('data-reason', 'json-export');
  await results.getByTestId('export-button').click();
  await page.getByTestId('new-tag').click();
  await expect(page.getByTestId('upgrade-state')).toHaveAttribute('data-reason', 'tags');
  await results.getByTestId('export-button').click();
  await page.getByTestId('edit-note').click();
  await expect(page.getByTestId('upgrade-state')).toHaveAttribute('data-reason', 'notes');
  await folder.getByTestId('folder-menu-button').click();
  await page.getByTestId('folder-export-markdown').click();
  await expect(page.getByTestId('upgrade-state')).toHaveAttribute('data-reason', 'bulk-export');

  // Export as Markdown triggers a download.
  await results.getByTestId('export-button').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-markdown').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sourdough-starter-troubleshooting\.md$/);
  const content = await readDownload(download);
  expect(content).toContain('# Sourdough starter troubleshooting');
  expect(content).toContain('acetone');
});

test('free tier blocks the sixth folder with an upgrade state', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });

  for (let i = 1; i <= 6; i += 1) {
    await page.getByTestId('new-folder-button').click();
    await page.getByTestId('new-folder-input').fill(`Folder ${i}`);
    await page.getByTestId('new-folder-input').press('Enter');
  }
  await expect(page.getByTestId('upgrade-state')).toBeVisible();
  await expect(page.getByTestId('folder-limit')).toHaveText('5/5');
});

test('pro tier: tags, notes and a folder zip export', async ({ context }) => {
  // The background worker owns the license; flip it to Pro before the panel boots.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(
    "chrome.storage.sync.set({ license: { tier: 'pro', key: 'E2E', checkedAt: 0 } })",
  );

  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  const row = page.getByTestId('conversation-mock-0001');
  await expect(row).toBeVisible();

  await page.getByTestId('new-folder-button').click();
  await page.getByTestId('new-folder-input').fill('Cooking');
  await page.getByTestId('new-folder-input').press('Enter');
  const folder = page.locator('[data-folder-name="Cooking"]');
  await row.dragTo(folder.getByTestId('folder-select'));
  await expect(folder.getByTestId('folder-count')).toHaveText('1');

  // Tag the chat with a brand-new tag.
  await row.getByTestId('export-button').click();
  await page.getByTestId('new-tag').click();
  await page.getByTestId('new-tag-input').fill('bread');
  await page.getByTestId('new-tag-input').press('Enter');
  await expect(row.getByTestId('row-tag')).toHaveText('bread');
  const tag = page.locator('[data-tag-name="bread"]');
  await expect(tag.getByTestId('tag-count')).toHaveText('1');

  // The tag view filters to that chat.
  await tag.getByTestId('tag-select').click();
  await expect(
    page.getByTestId('conversation-list').locator('li[data-conversation-key]'),
  ).toHaveCount(1);
  await page.getByTestId('view-all').click();

  // Add a note; it saves on blur.
  await row.getByTestId('export-button').click();
  await page.getByTestId('edit-note').click();
  await page.getByTestId('note-input').fill('Feed twice a day');
  await page.getByTestId('note-input').press('Tab');
  await expect(row.getByTestId('row-note')).toBeVisible();

  // Export the folder: one zip holding the Markdown of every chat in it.
  await folder.getByTestId('folder-menu-button').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('folder-export-markdown').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-cooking\.zip$/);
  const zip = await readDownload(download);
  expect(zip.startsWith('PK')).toBe(true);
  expect(zip).toContain('sourdough-starter-troubleshooting.md');
  expect(zip).toContain('# Sourdough starter troubleshooting');
  expect(zip).toContain('- Tags: bread');
  expect(zip).toContain('Feed twice a day');
  await expect(page.getByTestId('upgrade-state')).toHaveCount(0);
});
