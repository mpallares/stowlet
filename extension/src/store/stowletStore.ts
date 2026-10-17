import {
  conversationKey,
  DEFAULT_LICENSE_STATE,
  type AdapterErrorCode,
  type Conversation,
  type ConversationKey,
  type ExportFile,
  type ExportFormat,
  type LicenseState,
  type RemoteConfig,
  type VendorAdapter,
} from '@stowlet/shared';
import { can, limits, type Feature, type UpgradeReason } from '@/entitlements';
import { createStore, type StoreApi } from 'zustand/vanilla';
import * as db from '@/db';
import type { ConversationMeta, Folder, FolderItem, Tag } from '@/db';
import type { Downloadable } from '@/lib/export/download';
import {
  buildZip,
  planFolderExport,
  uniquePath,
  zipFilename,
  type ExportExtras,
  type ZipEntry,
} from '@/lib/export';
import { errorKind, log } from '@/lib/log';
import { syncVendor, type SyncProgress } from '@/lib/search/indexer';
import { SearchIndex, type SearchHit } from '@/lib/search/SearchIndex';

export type AdapterStatus =
  'booting' | 'ready' | 'syncing' | 'needs-update' | 'unauthenticated' | 'network' | 'disabled';

export type View =
  | { kind: 'all' }
  | { kind: 'pinned' }
  | { kind: 'unfiled' }
  | { kind: 'folder'; id: string }
  | { kind: 'tag'; id: string };

export interface ExportProgress {
  done: number;
  total: number;
}

export interface StowletDeps {
  adapter: VendorAdapter;
  getLicense: () => Promise<LicenseState>;
  getRemoteConfig: () => Promise<RemoteConfig>;
  /** Builds the export file (normally in the background worker). */
  buildExport: (
    conversation: Conversation,
    format: ExportFormat,
    extras: ExportExtras,
  ) => Promise<ExportFile>;
  download: (file: Downloadable) => void;
  readPanelOpen: () => Promise<boolean>;
  writePanelOpen: (open: boolean) => Promise<void>;
}

export interface StowletState {
  status: AdapterStatus;
  notice: string | null;
  license: LicenseState;
  folders: Folder[];
  items: FolderItem[];
  tags: Tag[];
  conversations: ConversationMeta[];
  view: View;
  expanded: Record<string, boolean>;
  query: string;
  hits: SearchHit[];
  /** Content-only matches hidden from a Free user (title matches still show). */
  hiddenMatches: number;
  panelOpen: boolean;
  currentConversationId: string | null;
  progress: SyncProgress | null;
  /** Set when the user tried something their plan does not include. */
  upgrade: UpgradeReason | null;
  /** Non-null while a folder export is fetching conversations. */
  exportProgress: ExportProgress | null;
  lastError: string | null;
  /** Conversation currently being dragged, so drop targets can light up. */
  dragging: ConversationKey | null;

  init: () => Promise<void>;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
  setQuery: (q: string) => void;
  setView: (view: View) => void;
  toggleExpanded: (folderId: string) => void;
  setPanelOpen: (open: boolean) => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  setFolderColor: (id: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveToFolder: (key: ConversationKey, folderId: string | null) => Promise<void>;
  togglePinned: (key: ConversationKey) => Promise<void>;
  exportConversation: (key: ConversationKey, format: ExportFormat) => Promise<void>;
  /** Downloads every chat in the folder (and its sub-folders) as one zip. Pro. */
  exportFolder: (folderId: string, format: ExportFormat) => Promise<void>;
  createTag: (name: string) => Promise<Tag | null>;
  renameTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  /** Attaches or detaches a tag on a conversation. Pro. */
  toggleTag: (key: ConversationKey, tagId: string) => Promise<void>;
  /** Sets the note on a conversation; empty clears it. Pro. */
  setNote: (key: ConversationKey, note: string) => Promise<void>;
  dismissUpgrade: () => void;
  /** Returns true when allowed; otherwise shows the upgrade banner and returns false. */
  requirePro: (feature: Feature) => boolean;
  dismissError: () => void;
  setDragging: (key: ConversationKey | null) => void;
}

const STATUS_FOR_ERROR: Record<AdapterErrorCode, AdapterStatus> = {
  'needs-update': 'needs-update',
  unauthenticated: 'unauthenticated',
  network: 'network',
  'not-found': 'ready',
  disabled: 'disabled',
  unknown: 'needs-update',
};

export type StowletStore = StoreApi<StowletState>;

export function createStowletStore(deps: StowletDeps): StowletStore {
  const { adapter } = deps;
  let index = SearchIndex.empty();
  let syncing: Promise<void> | null = null;

  return createStore<StowletState>()((set, get) => {
    const runSearch = (): void => {
      const q = get().query;
      if (q.trim() === '') {
        set({ hits: [], hiddenMatches: 0 });
        return;
      }
      const all = index.search(q);
      if (can(get().license.tier, 'content-search')) {
        set({ hits: all, hiddenMatches: 0 });
        return;
      }
      // Free: keep indexing content, but only surface title matches.
      const titleHits = all.filter((h) => h.matchedFields.includes('title'));
      set({ hits: titleHits, hiddenMatches: all.length - titleHits.length });
    };

    /** Tag names and note for a conversation, written into its export. */
    const extrasFor = (key: ConversationKey): ExportExtras => {
      const { conversations, tags } = get();
      const meta = conversations.find((c) => c.id === key);
      if (!meta) return {};
      const names = meta.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter((n): n is string => n !== undefined);
      return { tags: names, note: meta.note };
    };

    const guard = async (label: string, fn: () => Promise<void>): Promise<void> => {
      try {
        await fn();
      } catch (e) {
        log.error('store', `${label}-failed`, { kind: errorKind(e) });
        set({ lastError: e instanceof Error ? e.message : 'Something went wrong' });
      }
    };

    return {
      status: 'booting',
      notice: null,
      license: DEFAULT_LICENSE_STATE,
      folders: [],
      items: [],
      tags: [],
      conversations: [],
      view: { kind: 'all' },
      expanded: {},
      query: '',
      hits: [],
      hiddenMatches: 0,
      panelOpen: true,
      currentConversationId: adapter.getCurrentConversationId(),
      progress: null,
      upgrade: null,
      exportProgress: null,
      lastError: null,
      dragging: null,

      async init() {
        const [license, config, panelOpen, stored] = await Promise.all([
          deps.getLicense().catch(() => DEFAULT_LICENSE_STATE),
          deps.getRemoteConfig(),
          deps.readPanelOpen().catch(() => true),
          db.loadSerializedIndex(),
        ]);
        const restored = stored ? SearchIndex.fromJSON(stored.json) : null;
        if (stored && !restored) {
          log.warn('store', 'index-unreadable-rebuilding');
          await db.clearSerializedIndex();
        }
        index = restored ?? SearchIndex.empty();
        set({ license, notice: config.notice ?? null, panelOpen });
        await get().refresh();
        if (!config.adapters[adapter.id]?.enabled) {
          set({ status: 'disabled' });
          return;
        }
        set({ status: 'ready' });
        await get().sync();
      },

      async sync() {
        if (syncing) return syncing;
        syncing = (async () => {
          set({ status: 'syncing', progress: null });
          const outcome = await syncVendor(adapter, index, {
            onProgress: (progress) => set({ progress }),
          });
          await get().refresh();
          if (outcome.ok) {
            set({ status: 'ready', progress: null });
          } else {
            set({ status: STATUS_FOR_ERROR[outcome.error.code], progress: null });
          }
          runSearch();
        })().finally(() => {
          syncing = null;
        });
        return syncing;
      },

      async refresh() {
        const [folders, items, tags, conversations] = await Promise.all([
          db.listFolders(),
          db.listItems(),
          db.listTags(),
          db.listConversationMeta(adapter.id),
        ]);
        set({
          folders,
          items,
          tags,
          conversations,
          currentConversationId: adapter.getCurrentConversationId(),
        });
      },

      setQuery(query) {
        set({ query });
        runSearch();
      },

      setView(view) {
        set({ view });
      },

      toggleExpanded(folderId) {
        const expanded = { ...get().expanded };
        expanded[folderId] = !(expanded[folderId] ?? true);
        set({ expanded });
      },

      async setPanelOpen(open) {
        set({ panelOpen: open });
        await deps.writePanelOpen(open).catch(() => undefined);
      },

      async createFolder(name, parentId = null) {
        if (parentId && !get().requirePro('subfolders')) return null;
        const limit = limits(get().license.tier).folders;
        try {
          const folder = await db.createFolder({ name, parentId, limit });
          await get().refresh();
          if (parentId) set({ expanded: { ...get().expanded, [parentId]: true } });
          return folder;
        } catch (e) {
          if (e instanceof db.FolderLimitError) {
            set({ upgrade: 'folders' });
            return null;
          }
          set({ lastError: e instanceof Error ? e.message : 'Could not create folder' });
          return null;
        }
      },

      renameFolder: (id, name) =>
        guard('rename-folder', async () => {
          await db.renameFolder(id, name);
          await get().refresh();
        }),

      setFolderColor: (id, color) =>
        guard('set-folder-color', async () => {
          await db.setFolderColor(id, color);
          await get().refresh();
        }),

      deleteFolder: (id) =>
        guard('delete-folder', async () => {
          await db.deleteFolder(id);
          const { view } = get();
          if (view.kind === 'folder' && view.id === id) set({ view: { kind: 'all' } });
          await get().refresh();
        }),

      moveToFolder: (key, folderId) =>
        guard('move-to-folder', async () => {
          if (folderId === null) {
            await db.removeFromFolder(key);
          } else {
            const conversationId = key.slice(adapter.id.length + 1);
            await db.addToFolder(adapter.id, conversationId, folderId);
          }
          await get().refresh();
        }),

      togglePinned: (key) =>
        guard('toggle-pinned', async () => {
          const meta = get().conversations.find((c) => c.id === key);
          if (!meta) return;
          await db.setPinned(key, meta.pinned === 0);
          await get().refresh();
        }),

      exportConversation: (key, format) =>
        guard('export', async () => {
          if (format === 'json' && !get().requirePro('json-export')) return;
          const conversationId = key.slice(adapter.id.length + 1);
          const result = await adapter.getConversation(conversationId);
          if (!result.ok) {
            set({ lastError: `Could not load the conversation (${result.error.code})` });
            return;
          }
          const file = await deps.buildExport(result.value, format, extrasFor(key));
          deps.download(file);
        }),

      exportFolder: (folderId, format) =>
        guard('export-folder', async () => {
          if (!get().requirePro('bulk-export')) return;
          const { folders, items, conversations } = get();
          const folder = folders.find((f) => f.id === folderId);
          if (!folder) return;
          const known = new Set(conversations.map((c) => c.id));
          const plan = planFolderExport(folders, items, folderId);
          const mine = plan.filter((e) => e.vendorId === adapter.id && known.has(e.key));
          const foreign = plan.length - mine.length;
          if (mine.length === 0) {
            set({
              lastError:
                foreign > 0
                  ? 'The chats in this folder belong to another app; open it there to export them.'
                  : 'This folder has no chats to export.',
            });
            return;
          }
          set({ exportProgress: { done: 0, total: mine.length } });
          const entries: ZipEntry[] = [];
          const used = new Set<string>();
          let failed = 0;
          try {
            for (const entry of mine) {
              const result = await adapter.getConversation(entry.conversationId);
              if (result.ok) {
                const file = await deps.buildExport(result.value, format, extrasFor(entry.key));
                entries.push({
                  path: uniquePath(used, entry.dir + file.filename),
                  content: file.content,
                });
              } else {
                failed += 1;
              }
              set({ exportProgress: { done: entries.length + failed, total: mine.length } });
            }
          } finally {
            set({ exportProgress: null });
          }
          if (entries.length === 0) {
            set({ lastError: 'Could not load any chat in this folder. Try again in a moment.' });
            return;
          }
          deps.download({
            filename: zipFilename(folder.name),
            mime: 'application/zip',
            content: buildZip(entries),
          });
          const notes: string[] = [];
          if (failed > 0) notes.push(`${failed} could not be loaded`);
          if (foreign > 0) notes.push(`${foreign} from another app skipped`);
          if (notes.length > 0) {
            set({
              lastError: `Exported ${entries.length} of ${plan.length} chats (${notes.join(', ')}).`,
            });
          }
        }),

      async createTag(name) {
        if (!get().requirePro('tags')) return null;
        try {
          const tag = await db.createTag(name);
          await get().refresh();
          return tag;
        } catch (e) {
          log.error('store', 'create-tag-failed', { kind: errorKind(e) });
          set({ lastError: e instanceof Error ? e.message : 'Could not create tag' });
          return null;
        }
      },

      renameTag: (id, name) =>
        guard('rename-tag', async () => {
          await db.renameTag(id, name);
          await get().refresh();
        }),

      deleteTag: (id) =>
        guard('delete-tag', async () => {
          await db.deleteTag(id);
          const { view } = get();
          if (view.kind === 'tag' && view.id === id) set({ view: { kind: 'all' } });
          await get().refresh();
        }),

      toggleTag: (key, tagId) =>
        guard('toggle-tag', async () => {
          if (!get().requirePro('tags')) return;
          await db.toggleTag(key, tagId);
          await get().refresh();
        }),

      setNote: (key, note) =>
        guard('set-note', async () => {
          if (!get().requirePro('notes')) return;
          await db.setNote(key, note);
          await get().refresh();
        }),

      dismissUpgrade() {
        set({ upgrade: null });
      },

      requirePro(feature) {
        if (can(get().license.tier, feature)) return true;
        set({ upgrade: feature });
        return false;
      },
      dismissError() {
        set({ lastError: null });
      },

      setDragging(key) {
        if (get().dragging !== key) set({ dragging: key });
      },
    };
  });
}

/** Helpers used by the UI. */
export function keyOf(meta: ConversationMeta): ConversationKey {
  return conversationKey(meta.vendorId, meta.conversationId);
}

export function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export function descendantIds(folders: Folder[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Conversations visible under the current view, newest first. */
export function visibleConversations(
  state: Pick<StowletState, 'view' | 'conversations' | 'items' | 'folders'>,
): ConversationMeta[] {
  const { view, conversations, items, folders } = state;
  const folderOf = new Map(items.map((i) => [i.id, i.folderId]));
  switch (view.kind) {
    case 'all':
      return conversations;
    case 'pinned':
      return conversations.filter((c) => c.pinned === 1);
    case 'unfiled':
      return conversations.filter((c) => !folderOf.has(c.id));
    case 'folder': {
      const ids = descendantIds(folders, view.id);
      return conversations.filter((c) => {
        const fid = folderOf.get(c.id);
        return fid !== undefined && ids.has(fid);
      });
    }
    case 'tag':
      return conversations.filter((c) => c.tagIds.includes(view.id));
  }
}
