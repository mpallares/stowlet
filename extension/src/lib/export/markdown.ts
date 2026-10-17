import type { Conversation, MessageRole } from '@stowlet/shared';

const ROLE_LABEL: Record<MessageRole, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
};

function fmtDate(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toISOString();
}

export interface ExportExtras {
  /** Tag names the user attached to the chat. */
  tags?: string[];
  /** The user's note on the chat. */
  note?: string;
}

export function toMarkdown(
  conversation: Conversation,
  vendorName: string,
  extras: ExportExtras = {},
): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title.trim() || 'Untitled conversation'}`);
  lines.push('');
  lines.push(`- Source: ${vendorName}`);
  lines.push(`- Conversation id: ${conversation.id}`);
  if (conversation.createdAt) lines.push(`- Created: ${fmtDate(conversation.createdAt)}`);
  if (conversation.updatedAt) lines.push(`- Updated: ${fmtDate(conversation.updatedAt)}`);
  lines.push(`- Messages: ${conversation.messages.length}`);
  if (extras.tags && extras.tags.length > 0) lines.push(`- Tags: ${extras.tags.join(', ')}`);
  lines.push('');
  const note = extras.note?.trim() ?? '';
  if (note !== '') {
    lines.push('## Note');
    lines.push('');
    lines.push(note);
    lines.push('');
  }
  for (const m of conversation.messages) {
    const when = m.ts ? ` (${fmtDate(m.ts)})` : '';
    lines.push(`## ${ROLE_LABEL[m.role]}${when}`);
    lines.push('');
    lines.push(m.text.trimEnd());
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
