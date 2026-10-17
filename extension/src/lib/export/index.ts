import type { Conversation, ExportFile, ExportFormat, VendorId } from '@gaveta/shared';
import { exportFilename, MIME } from './filename';
import { toJson } from './json';
import { toMarkdown, type ExportExtras } from './markdown';

export { exportFilename, MIME, slugify } from './filename';
export { toJson } from './json';
export { toMarkdown, type ExportExtras } from './markdown';
export { buildZip, crc32, type ZipEntry } from './zip';
export { planFolderExport, uniquePath, zipFilename, type FolderExportEntry } from './folder';

export const VENDOR_NAMES: Record<VendorId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  mock: 'Mock',
};

/** Pure: builds the file for a conversation. Runs in the background worker. */
export function buildExport(
  conversation: Conversation,
  vendorId: VendorId,
  format: ExportFormat,
  now = new Date(),
  extras: ExportExtras = {},
): ExportFile {
  const content =
    format === 'markdown'
      ? toMarkdown(conversation, VENDOR_NAMES[vendorId], extras)
      : toJson(conversation, vendorId, now, extras);
  return { filename: exportFilename(conversation.title, format, now), mime: MIME[format], content };
}
