import { useState } from 'react';
import type { Folder } from '@/db';
import { childrenOf, descendantIds } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { can } from '@/entitlements';
import { ColorPicker } from './ColorPicker';
import { readDragKey, useDropTarget } from './dnd';
import { IconChevron, IconFolder, IconMore } from './icons';
import { InlineInput } from './InlineInput';
import { Menu, MenuItem, ProBadge } from './Menu';

interface Props {
  folder: Folder;
  depth: number;
}

export function FolderNode({ folder, depth }: Props) {
  const folders = useGaveta((s) => s.folders);
  const items = useGaveta((s) => s.items);
  const view = useGaveta((s) => s.view);
  const expanded = useGaveta((s) => s.expanded[folder.id] ?? true);
  const toggleExpanded = useGaveta((s) => s.toggleExpanded);
  const setView = useGaveta((s) => s.setView);
  const renameFolder = useGaveta((s) => s.renameFolder);
  const deleteFolder = useGaveta((s) => s.deleteFolder);
  const setFolderColor = useGaveta((s) => s.setFolderColor);
  const createFolder = useGaveta((s) => s.createFolder);
  const moveToFolder = useGaveta((s) => s.moveToFolder);
  const dragging = useGaveta((s) => s.dragging);
  const tier = useGaveta((s) => s.license.tier);
  const requirePro = useGaveta((s) => s.requirePro);

  const [mode, setMode] = useState<'idle' | 'rename' | 'new-child' | 'color'>('idle');
  const { over: dragOver, handlers: dropHandlers, reset: resetDrop } = useDropTarget();

  const children = childrenOf(folders, folder.id);
  const subtree = descendantIds(folders, folder.id);
  const count = items.filter((i) => subtree.has(i.folderId)).length;
  const selected = view.kind === 'folder' && view.id === folder.id;

  return (
    <li data-testid={`folder-${folder.id}`} data-folder-name={folder.name}>
      <div
        data-drop-target={dragging ? (dragOver ? 'over' : 'ready') : undefined}
        className={`group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-[13px] transition-[background-color,box-shadow] duration-100 ${
          selected ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
        } ${dragging && !dragOver ? 'outline-1 outline-dashed outline-(--g-accent) -outline-offset-1' : ''} ${
          dragOver ? 'bg-(--g-accent-soft) ring-2 ring-(--g-accent) ring-inset' : ''
        }`}
        style={{ paddingLeft: 4 + depth * 12 }}
        {...dropHandlers}
        onDrop={(e) => {
          e.preventDefault();
          resetDrop();
          const key = readDragKey(e);
          if (key) void moveToFolder(key, folder.id);
        }}
      >
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={() => toggleExpanded(folder.id)}
          className={`rounded p-0.5 text-(--g-fg-muted) hover:text-(--g-fg) ${children.length === 0 ? 'invisible' : ''}`}
        >
          <IconChevron open={expanded} />
        </button>
        <span className="shrink-0" style={{ color: folder.color }}>
          <IconFolder />
        </span>
        {mode === 'rename' ? (
          <InlineInput
            initial={folder.name}
            testId="folder-rename-input"
            onSubmit={(v) => {
              void renameFolder(folder.id, v);
              setMode('idle');
            }}
            onCancel={() => setMode('idle')}
          />
        ) : (
          <button
            type="button"
            data-testid="folder-select"
            onClick={() => setView({ kind: 'folder', id: folder.id })}
            onDoubleClick={() => setMode('rename')}
            className="min-w-0 flex-1 truncate text-left"
            title={folder.name}
          >
            {folder.name}
          </button>
        )}
        {dragOver ? (
          <span className="rounded bg-(--g-accent) px-1.5 py-0.5 text-[11px] font-semibold text-white">
            Drop here
          </span>
        ) : (
          <span className="text-[11px] text-(--g-fg-muted)" data-testid="folder-count">
            {count}
          </span>
        )}
        <Menu
          testId="folder-menu"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Folder actions"
              data-testid="folder-menu-button"
              onClick={open}
              className="rounded p-0.5 text-(--g-fg-muted) opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-(--g-fg)"
            >
              <IconMore />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                testId="folder-action-rename"
                onClick={() => {
                  setMode('rename');
                  close();
                }}
              >
                Rename
              </MenuItem>
              <MenuItem
                testId="folder-action-new-child"
                trailing={can(tier, 'subfolders') ? undefined : <ProBadge />}
                onClick={() => {
                  if (requirePro('subfolders')) setMode('new-child');
                  close();
                }}
              >
                New sub-folder
              </MenuItem>
              <MenuItem
                testId="folder-action-color"
                onClick={() => {
                  setMode('color');
                  close();
                }}
              >
                Change colour
              </MenuItem>
              <MenuItem
                danger
                testId="folder-action-delete"
                onClick={() => {
                  void deleteFolder(folder.id);
                  close();
                }}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      {mode === 'color' && (
        <div className="ml-6" data-testid="folder-color-picker">
          <ColorPicker
            value={folder.color}
            onChange={(c) => {
              void setFolderColor(folder.id, c);
              setMode('idle');
            }}
          />
        </div>
      )}

      {mode === 'new-child' && (
        <div className="py-1" style={{ paddingLeft: 20 + depth * 12 }}>
          <InlineInput
            placeholder="Sub-folder name"
            testId="subfolder-name-input"
            onSubmit={(v) => {
              void createFolder(v, folder.id);
              setMode('idle');
            }}
            onCancel={() => setMode('idle')}
          />
        </div>
      )}

      {expanded && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FolderNode key={child.id} folder={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
