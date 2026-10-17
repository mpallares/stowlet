import type { Conversation, VendorId } from '@gaveta/shared';
import type { ExportExtras } from './markdown';

export interface ConversationExportJson {
  format: 'gaveta.conversation';
  version: 1;
  exportedAt: string;
  vendor: VendorId;
  /** Tag names the user attached to the chat. */
  tags: string[];
  /** The user's note on the chat, empty when none. */
  note: string;
  conversation: Conversation;
}

export function toJson(
  conversation: Conversation,
  vendorId: VendorId,
  now = new Date(),
  extras: ExportExtras = {},
): string {
  const payload: ConversationExportJson = {
    format: 'gaveta.conversation',
    version: 1,
    exportedAt: now.toISOString(),
    vendor: vendorId,
    tags: extras.tags ?? [],
    note: extras.note ?? '',
    conversation,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
