import { describe, expect, it } from 'vitest';
import {
  createTag,
  deleteTag,
  getConversationMeta,
  listConversationMeta,
  listTags,
  renameTag,
  setConversationTags,
  setNote,
  toggleTag,
  upsertSummaries,
} from '@/db';

async function seed(): Promise<void> {
  await upsertSummaries('mock', [
    { id: 'c1', title: 'One', createdAt: 1, updatedAt: 2 },
    { id: 'c2', title: 'Two', createdAt: 1, updatedAt: 3 },
  ]);
}

describe('tags', () => {
  it('creates tags once per name, case-insensitively, and lists them by name', async () => {
    const bread = await createTag('Bread');
    const again = await createTag('bread ');
    await createTag('Apples');
    expect(again.id).toBe(bread.id);
    expect((await listTags()).map((t) => t.name)).toEqual(['Apples', 'Bread']);
    await expect(createTag('  ')).rejects.toThrow(/empty/);
    await expect(createTag('x', 'red')).rejects.toThrow(/colour/);
  });

  it('attaches, toggles and renames', async () => {
    await seed();
    const tag = await createTag('todo');
    expect(await toggleTag('mock:c1', tag.id)).toBe(true);
    expect((await getConversationMeta('mock:c1'))?.tagIds).toEqual([tag.id]);
    expect(await toggleTag('mock:c1', tag.id)).toBe(false);
    expect((await getConversationMeta('mock:c1'))?.tagIds).toEqual([]);
    await setConversationTags('mock:c2', [tag.id, tag.id]);
    expect((await getConversationMeta('mock:c2'))?.tagIds).toEqual([tag.id]);
    await renameTag(tag.id, 'later');
    expect((await listTags())[0]?.name).toBe('later');
    await expect(toggleTag('mock:nope', tag.id)).rejects.toThrow(/not found/);
  });

  it('deleting a tag detaches it everywhere', async () => {
    await seed();
    const a = await createTag('a');
    const b = await createTag('b');
    await setConversationTags('mock:c1', [a.id, b.id]);
    await setConversationTags('mock:c2', [a.id]);
    await deleteTag(a.id);
    expect((await listTags()).map((t) => t.id)).toEqual([b.id]);
    expect((await getConversationMeta('mock:c1'))?.tagIds).toEqual([b.id]);
    expect((await getConversationMeta('mock:c2'))?.tagIds).toEqual([]);
  });

  it('survives a re-sync', async () => {
    await seed();
    const tag = await createTag('keep');
    await toggleTag('mock:c1', tag.id);
    await setNote('mock:c1', 'remember this');
    await upsertSummaries('mock', [{ id: 'c1', title: 'One renamed', createdAt: 1, updatedAt: 9 }]);
    const meta = await getConversationMeta('mock:c1');
    expect(meta?.tagIds).toEqual([tag.id]);
    expect(meta?.note).toBe('remember this');
  });
});

describe('notes', () => {
  it('stores trimmed text and clears on empty', async () => {
    await seed();
    await setNote('mock:c1', '  hello  ');
    expect((await getConversationMeta('mock:c1'))?.note).toBe('hello');
    await setNote('mock:c1', '   ');
    expect((await getConversationMeta('mock:c1'))?.note).toBe('');
    await expect(setNote('mock:nope', 'x')).rejects.toThrow(/not found/);
    expect((await listConversationMeta('mock')).every((m) => typeof m.note === 'string')).toBe(
      true,
    );
  });
});
