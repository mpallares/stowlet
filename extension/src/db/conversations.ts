import {
  conversationKey,
  type ConversationKey,
  type ConversationSummary,
  type VendorId,
} from '@stowlet/shared';
import { getDb, type ConversationMeta } from './schema';

export async function listConversationMeta(vendorId?: VendorId): Promise<ConversationMeta[]> {
  const db = getDb();
  const rows = vendorId
    ? await db.conversations_meta.where('vendorId').equals(vendorId).toArray()
    : await db.conversations_meta.toArray();
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversationMeta(
  key: ConversationKey,
): Promise<ConversationMeta | undefined> {
  return getDb().conversations_meta.get(key);
}

/**
 * Merges freshly listed summaries into the table. Keeps pins, tags, notes and
 * index markers. Returns the keys whose content is stale and needs (re)indexing.
 */
export async function upsertSummaries(
  vendorId: VendorId,
  summaries: ConversationSummary[],
): Promise<ConversationKey[]> {
  const db = getDb();
  const now = Date.now();
  const stale: ConversationKey[] = [];
  await db.transaction('rw', db.conversations_meta, async () => {
    const keys = summaries.map((s) => conversationKey(vendorId, s.id));
    const existing = await db.conversations_meta.bulkGet(keys);
    const rows: ConversationMeta[] = summaries.map((s, i) => {
      const key = keys[i] as ConversationKey;
      const prev = existing[i];
      const row: ConversationMeta = {
        id: key,
        vendorId,
        conversationId: s.id,
        title: s.title,
        createdAt: s.createdAt || prev?.createdAt || now,
        updatedAt: s.updatedAt || prev?.updatedAt || now,
        indexedUpdatedAt: prev?.indexedUpdatedAt ?? null,
        messageCount: prev?.messageCount ?? 0,
        pinned: prev?.pinned ?? 0,
        pinnedAt: prev?.pinnedAt ?? null,
        tagIds: prev?.tagIds ?? [],
        note: prev?.note ?? '',
        preview: prev?.preview ?? '',
        lastSeenAt: now,
      };
      if (row.indexedUpdatedAt === null || row.updatedAt > row.indexedUpdatedAt) stale.push(key);
      return row;
    });
    await db.conversations_meta.bulkPut(rows);
  });
  return stale;
}

/**
 * Deletes local records of this vendor's conversations that are not in `keepIds`,
 * including their folder membership. Call it only with a complete vendor list.
 * Returns the removed keys so the caller can drop them from the search index.
 */
export async function pruneMissing(
  vendorId: VendorId,
  keepIds: Iterable<string>,
): Promise<ConversationKey[]> {
  const db = getDb();
  const keep = new Set<string>();
  for (const id of keepIds) keep.add(conversationKey(vendorId, id));
  return db.transaction('rw', db.conversations_meta, db.folder_items, async () => {
    const rows = await db.conversations_meta.where('vendorId').equals(vendorId).toArray();
    const gone = rows.map((r) => r.id).filter((key) => !keep.has(key));
    if (gone.length === 0) return [];
    await db.conversations_meta.bulkDelete(gone);
    await db.folder_items.bulkDelete(gone);
    return gone;
  });
}

export async function markIndexed(
  key: ConversationKey,
  info: { updatedAt: number; messageCount: number; preview: string },
): Promise<void> {
  await getDb().conversations_meta.update(key, {
    indexedUpdatedAt: info.updatedAt,
    messageCount: info.messageCount,
    preview: info.preview,
  });
}

/** Stores the user's note; an empty or whitespace-only note clears it. */
export async function setNote(key: ConversationKey, note: string): Promise<void> {
  const updated = await getDb().conversations_meta.update(key, { note: note.trim() });
  if (updated === 0) throw new Error('Conversation not found');
}

export async function setPinned(key: ConversationKey, pinned: boolean): Promise<void> {
  await getDb().conversations_meta.update(key, {
    pinned: pinned ? 1 : 0,
    pinnedAt: pinned ? Date.now() : null,
  });
}

export async function listPinned(vendorId?: VendorId): Promise<ConversationMeta[]> {
  const db = getDb();
  const rows = vendorId
    ? await db.conversations_meta.where('[vendorId+pinned]').equals([vendorId, 1]).toArray()
    : await db.conversations_meta.where('pinned').equals(1).toArray();
  return rows.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
}
