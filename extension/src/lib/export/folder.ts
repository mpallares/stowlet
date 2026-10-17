import type { ConversationKey, VendorId } from '@stowlet/shared';
import type { Folder, FolderItem } from '@/db';
import { slugify } from './filename';

export interface FolderExportEntry {
  key: ConversationKey;
  vendorId: VendorId;
  conversationId: string;
  /** Directory inside the archive, '' for the root folder or `sub/` for a sub-folder. */
  dir: string;
}

/**
 * Pure: lists every conversation filed in `folderId` or any folder below it, with
 * the archive directory that mirrors the sub-folder tree. Order follows the tree,
 * then each folder's own item order.
 */
export function planFolderExport(
  folders: Folder[],
  items: FolderItem[],
  folderId: string,
): FolderExportEntry[] {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const list = byParent.get(f.parentId) ?? [];
    list.push(f);
    byParent.set(f.parentId, list);
  }
  const byFolder = new Map<string, FolderItem[]>();
  for (const it of items) {
    const list = byFolder.get(it.folderId) ?? [];
    list.push(it);
    byFolder.set(it.folderId, list);
  }
  const out: FolderExportEntry[] = [];
  const walk = (id: string, dir: string): void => {
    const here = (byFolder.get(id) ?? []).sort(
      (a, b) => a.order - b.order || b.addedAt - a.addedAt,
    );
    for (const it of here) {
      out.push({ key: it.id, vendorId: it.vendorId, conversationId: it.conversationId, dir });
    }
    const children = (byParent.get(id) ?? []).sort(
      (a, b) => a.order - b.order || a.createdAt - b.createdAt,
    );
    for (const child of children) walk(child.id, `${dir}${slugify(child.name)}/`);
  };
  walk(folderId, '');
  return out;
}

/** Adds `-2`, `-3`… before the extension until the path is unused, then records it. */
export function uniquePath(used: Set<string>, path: string): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const dot = path.lastIndexOf('.');
  const stem = dot > path.lastIndexOf('/') ? path.slice(0, dot) : path;
  const ext = dot > path.lastIndexOf('/') ? path.slice(dot) : '';
  for (let n = 2; ; n += 1) {
    const candidate = `${stem}-${n}${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

export function zipFilename(folderName: string, date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}-${slugify(folderName)}.zip`;
}
