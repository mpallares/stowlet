import type { ConversationMeta } from '@/db';
import { keyOf } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { can } from '@/entitlements';
import { relativeTime } from '@/lib/time';
import { setDragKey } from './dnd';
import { IconCheck, IconDownload, IconFolder, IconPin } from './icons';
import { Menu, MenuItem, MenuLabel, MenuSeparator, ProBadge } from './Menu';

interface Props {
  meta: ConversationMeta;
  /** Shown under the title (search preview or folder name). */
  subtitle?: string | undefined;
  conversationUrl: (id: string) => string;
}

export function ConversationRow({ meta, subtitle, conversationUrl }: Props) {
  const key = keyOf(meta);
  const folders = useGaveta((s) => s.folders);
  const items = useGaveta((s) => s.items);
  const current = useGaveta((s) => s.currentConversationId);
  const togglePinned = useGaveta((s) => s.togglePinned);
  const moveToFolder = useGaveta((s) => s.moveToFolder);
  const dragging = useGaveta((s) => s.dragging);
  const setDragging = useGaveta((s) => s.setDragging);
  const exportConversation = useGaveta((s) => s.exportConversation);
  const tier = useGaveta((s) => s.license.tier);

  const item = items.find((i) => i.id === key);
  const folder = item ? folders.find((f) => f.id === item.folderId) : undefined;
  const isCurrent = current === meta.conversationId;

  return (
    <li
      draggable
      data-testid={`conversation-${meta.conversationId}`}
      data-conversation-key={key}
      onDragStart={(e) => {
        setDragKey(e, key);
        setDragging(key);
      }}
      onDragEnd={() => setDragging(null)}
      className={`group flex cursor-grab items-start gap-1 rounded-md px-2.5 py-2 text-[13px] transition-opacity active:cursor-grabbing ${
        isCurrent ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
      } ${dragging === key ? 'opacity-40' : ''}`}
    >
      <a
        href={conversationUrl(meta.conversationId)}
        className="min-w-0 flex-1"
        title={meta.title}
        data-testid="conversation-link"
      >
        <span className="block truncate font-medium">{meta.title || 'Untitled'}</span>
        <span className="block truncate text-[11px] text-(--g-fg-muted)">
          {subtitle ?? meta.preview}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-(--g-fg-muted)">
          {folder && (
            <span
              className="inline-flex items-center gap-1 rounded bg-(--g-bg-hover) px-1"
              data-testid="row-folder"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: folder.color }}
              />
              {folder.name}
            </span>
          )}
          <span>{relativeTime(meta.updatedAt)}</span>
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100">
        <button
          type="button"
          aria-label={meta.pinned ? 'Unpin' : 'Pin'}
          aria-pressed={meta.pinned === 1}
          data-testid="pin-button"
          onClick={() => void togglePinned(key)}
          className={`rounded p-1 hover:bg-(--g-bg-hover) ${meta.pinned ? 'text-(--g-accent)' : 'text-(--g-fg-muted)'}`}
        >
          <IconPin filled={meta.pinned === 1} />
        </button>
        <Menu
          testId="export-menu"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Export"
              data-testid="export-button"
              onClick={open}
              className="rounded p-1 text-(--g-fg-muted) hover:bg-(--g-bg-hover)"
            >
              <IconDownload />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Export</MenuLabel>
              <MenuItem
                testId="export-markdown"
                icon={<IconDownload />}
                onClick={() => {
                  void exportConversation(key, 'markdown');
                  close();
                }}
              >
                Markdown
              </MenuItem>
              <MenuItem
                testId="export-json"
                icon={<IconDownload />}
                trailing={can(tier, 'json-export') ? undefined : <ProBadge />}
                onClick={() => {
                  void exportConversation(key, 'json');
                  close();
                }}
              >
                JSON
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Move to</MenuLabel>
              <div data-testid="move-select">
                <MenuItem
                  testId="move-unfiled"
                  icon={<IconFolder />}
                  selected={!item}
                  trailing={!item ? <IconCheck className="text-(--g-accent)" /> : undefined}
                  onClick={() => {
                    void moveToFolder(key, null);
                    close();
                  }}
                >
                  Unfiled
                </MenuItem>
                {folders.map((f) => {
                  const active = item?.folderId === f.id;
                  return (
                    <MenuItem
                      key={f.id}
                      testId={`move-${f.id}`}
                      icon={<IconFolder style={{ color: f.color }} />}
                      selected={active}
                      trailing={active ? <IconCheck className="text-(--g-accent)" /> : undefined}
                      onClick={() => {
                        void moveToFolder(key, f.id);
                        close();
                      }}
                    >
                      {f.name}
                    </MenuItem>
                  );
                })}
              </div>
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}
