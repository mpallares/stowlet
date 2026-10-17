import { useState } from 'react';
import { folderLimit } from '@stowlet/shared';
import { childrenOf } from '@/store/stowletStore';
import { useStowlet } from '@/store/context';
import { readDragKey, useDropTarget } from './dnd';
import { FolderNode } from './FolderNode';
import { IconPin, IconPlus } from './icons';
import { InlineInput } from './InlineInput';
import { TagNode } from './TagNode';

export function FolderTree() {
  const folders = useStowlet((s) => s.folders);
  const items = useStowlet((s) => s.items);
  const conversations = useStowlet((s) => s.conversations);
  const view = useStowlet((s) => s.view);
  const setView = useStowlet((s) => s.setView);
  const createFolder = useStowlet((s) => s.createFolder);
  const moveToFolder = useStowlet((s) => s.moveToFolder);
  const tier = useStowlet((s) => s.license.tier);
  const tags = useStowlet((s) => s.tags);
  const [creating, setCreating] = useState(false);
  const { over: unfiledOver, handlers: unfiledHandlers, reset: resetUnfiled } = useDropTarget();
  const dragging = useStowlet((s) => s.dragging);

  const roots = childrenOf(folders, null);
  const pinnedCount = conversations.filter((c) => c.pinned === 1).length;
  const unfiledCount =
    conversations.length - items.filter((i) => conversations.some((c) => c.id === i.id)).length;
  const limit = folderLimit(tier);
  const limitLabel = Number.isFinite(limit) ? `${folders.length}/${limit}` : `${folders.length}`;

  const navButton = (
    active: boolean,
    label: string,
    count: number,
    onClick: () => void,
    testId: string,
    extra?: React.HTMLAttributes<HTMLButtonElement>,
  ) => (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] ${
        active ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
      }`}
      {...extra}
    >
      <span className="flex-1 text-left">{label}</span>
      <span className="text-[11px] text-(--g-fg-muted)">{count}</span>
    </button>
  );

  return (
    <nav aria-label="Folders" className="flex flex-col gap-0.5" data-testid="folder-tree">
      {navButton(
        view.kind === 'all',
        'All chats',
        conversations.length,
        () => setView({ kind: 'all' }),
        'view-all',
      )}
      <button
        type="button"
        data-testid="view-pinned"
        onClick={() => setView({ kind: 'pinned' })}
        className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] ${
          view.kind === 'pinned' ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
        }`}
      >
        <IconPin filled />
        <span className="flex-1 text-left">Pinned</span>
        <span className="text-[11px] text-(--g-fg-muted)">{pinnedCount}</span>
      </button>
      {navButton(
        view.kind === 'unfiled',
        'Unfiled',
        unfiledCount,
        () => setView({ kind: 'unfiled' }),
        'view-unfiled',
        {
          className: `flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition-[background-color,box-shadow] duration-100 ${
            view.kind === 'unfiled' ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
          } ${dragging && !unfiledOver ? 'outline-1 outline-dashed outline-(--g-accent) -outline-offset-1' : ''} ${
            unfiledOver ? 'bg-(--g-accent-soft) ring-2 ring-(--g-accent) ring-inset' : ''
          }`,
          ...unfiledHandlers,
          onDrop: (e) => {
            e.preventDefault();
            resetUnfiled();
            const key = readDragKey(e);
            if (key) void moveToFolder(key, null);
          },
        },
      )}

      <div className="mt-2 flex items-center justify-between px-2 text-[11px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
        <span>Folders</span>
        <span className="flex items-center gap-1">
          <span data-testid="folder-limit">{limitLabel}</span>
          <button
            type="button"
            aria-label="New folder"
            data-testid="new-folder-button"
            onClick={() => setCreating(true)}
            className="rounded p-0.5 hover:bg-(--g-bg-hover) hover:text-(--g-fg)"
          >
            <IconPlus />
          </button>
        </span>
      </div>

      {creating && (
        <div className="px-1 py-1">
          <InlineInput
            placeholder="Folder name"
            testId="new-folder-input"
            onSubmit={(v) => {
              void createFolder(v, null);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {roots.length === 0 && !creating ? (
        <p className="px-2 py-1 text-xs text-(--g-fg-muted)">
          No folders yet. Drag a chat onto a folder to file it.
        </p>
      ) : (
        <ul>
          {roots.map((f) => (
            <FolderNode key={f.id} folder={f} depth={0} />
          ))}
        </ul>
      )}

      {tags.length > 0 && (
        <>
          <div className="mt-2 px-2 text-[11px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
            Tags
          </div>
          <ul data-testid="tag-list">
            {tags.map((t) => (
              <TagNode key={t.id} tag={t} />
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
