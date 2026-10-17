import type { ConversationKey } from '@gaveta/shared';
import { newId } from '@/lib/id';
import { FOLDER_COLORS } from './folders';
import { getDb, type Tag } from './schema';

const COLOR_RE = /^#[0-9a-f]{6}$/i;

export async function listTags(): Promise<Tag[]> {
  const all = await getDb().tags.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

/** Creates a tag, or returns the existing one whose name matches (case-insensitive). */
export async function createTag(name: string, color?: string): Promise<Tag> {
  const db = getDb();
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('Tag name is empty');
  if (color !== undefined && !COLOR_RE.test(color)) throw new Error('Invalid colour');
  return db.transaction('rw', db.tags, async () => {
    const existing = (await db.tags.toArray()).find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const count = await db.tags.count();
    const tag: Tag = {
      id: newId(),
      name: trimmed,
      color: color ?? FOLDER_COLORS[count % FOLDER_COLORS.length] ?? FOLDER_COLORS[0],
      createdAt: Date.now(),
    };
    await db.tags.add(tag);
    return tag;
  });
}

export async function renameTag(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('Tag name is empty');
  const updated = await getDb().tags.update(id, { name: trimmed });
  if (updated === 0) throw new Error('Tag not found');
}

export async function setTagColor(id: string, color: string): Promise<void> {
  if (!COLOR_RE.test(color)) throw new Error('Invalid colour');
  await getDb().tags.update(id, { color });
}

/** Deletes the tag and detaches it from every conversation. */
export async function deleteTag(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tags, db.conversations_meta, async () => {
    await db.conversations_meta
      .where('tagIds')
      .equals(id)
      .modify((row) => {
        row.tagIds = row.tagIds.filter((t) => t !== id);
      });
    await db.tags.delete(id);
  });
}

export async function setConversationTags(key: ConversationKey, tagIds: string[]): Promise<void> {
  const unique = [...new Set(tagIds)];
  const updated = await getDb().conversations_meta.update(key, { tagIds: unique });
  if (updated === 0) throw new Error('Conversation not found');
}

/** Attaches or detaches one tag. Returns true when the tag is now attached. */
export async function toggleTag(key: ConversationKey, tagId: string): Promise<boolean> {
  const db = getDb();
  return db.transaction('rw', db.conversations_meta, db.tags, async () => {
    const meta = await db.conversations_meta.get(key);
    if (!meta) throw new Error('Conversation not found');
    if (!(await db.tags.get(tagId))) throw new Error('Tag not found');
    const has = meta.tagIds.includes(tagId);
    const tagIds = has ? meta.tagIds.filter((t) => t !== tagId) : [...meta.tagIds, tagId];
    await db.conversations_meta.update(key, { tagIds });
    return !has;
  });
}
