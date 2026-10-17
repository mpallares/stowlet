import { describe, expect, it } from 'vitest';
import { addToFolder, createFolder, listFolders, listItems } from '@/db';
import { planFolderExport, uniquePath, zipFilename } from '@/lib/export';

describe('planFolderExport', () => {
  it('walks the folder and its sub-folders, mirroring them as directories', async () => {
    const root = await createFolder({ name: 'Work stuff', limit: 10 });
    const child = await createFolder({ name: 'Sub Folder!', parentId: root.id, limit: 10 });
    const other = await createFolder({ name: 'Other', limit: 10 });
    await addToFolder('mock', 'c1', root.id);
    await addToFolder('mock', 'c2', child.id);
    await addToFolder('chatgpt', 'c3', child.id);
    await addToFolder('mock', 'c4', other.id);

    const plan = planFolderExport(await listFolders(), await listItems(), root.id);
    expect(plan.map((e) => [e.conversationId, e.vendorId, e.dir])).toEqual([
      ['c1', 'mock', ''],
      ['c2', 'mock', 'sub-folder/'],
      ['c3', 'chatgpt', 'sub-folder/'],
    ]);
  });

  it('returns nothing for an empty folder', async () => {
    const root = await createFolder({ name: 'Empty', limit: 10 });
    expect(planFolderExport(await listFolders(), await listItems(), root.id)).toEqual([]);
  });
});

describe('uniquePath', () => {
  it('suffixes duplicates before the extension', () => {
    const used = new Set<string>();
    expect(uniquePath(used, 'a/x.md')).toBe('a/x.md');
    expect(uniquePath(used, 'a/x.md')).toBe('a/x-2.md');
    expect(uniquePath(used, 'a/x.md')).toBe('a/x-3.md');
    expect(uniquePath(used, 'noext')).toBe('noext');
    expect(uniquePath(used, 'noext')).toBe('noext-2');
  });
});

describe('zipFilename', () => {
  it('prefixes the date and slugifies the folder name', () => {
    expect(zipFilename('Work stuff', new Date(Date.UTC(2026, 9, 17)))).toBe(
      '2026-10-17-work-stuff.zip',
    );
  });
});
