import { useState } from 'react';
import type { Tag } from '@/db';
import { useGaveta } from '@/store/context';
import { IconMore, IconTag } from './icons';
import { InlineInput } from './InlineInput';
import { Menu, MenuItem } from './Menu';

/** One tag in the sidebar: click to filter, menu to rename or delete. */
export function TagNode({ tag }: { tag: Tag }) {
  const view = useGaveta((s) => s.view);
  const setView = useGaveta((s) => s.setView);
  const conversations = useGaveta((s) => s.conversations);
  const renameTag = useGaveta((s) => s.renameTag);
  const deleteTag = useGaveta((s) => s.deleteTag);
  const [renaming, setRenaming] = useState(false);

  const count = conversations.filter((c) => c.tagIds.includes(tag.id)).length;
  const selected = view.kind === 'tag' && view.id === tag.id;

  return (
    <li data-testid={`tag-${tag.id}`} data-tag-name={tag.name}>
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] ${
          selected ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
        }`}
      >
        <span className="shrink-0" style={{ color: tag.color }}>
          <IconTag />
        </span>
        {renaming ? (
          <InlineInput
            initial={tag.name}
            testId="tag-rename-input"
            onSubmit={(v) => {
              void renameTag(tag.id, v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            type="button"
            data-testid="tag-select"
            onClick={() => setView({ kind: 'tag', id: tag.id })}
            onDoubleClick={() => setRenaming(true)}
            className="min-w-0 flex-1 truncate text-left"
            title={tag.name}
          >
            {tag.name}
          </button>
        )}
        <span className="text-[11px] text-(--g-fg-muted)" data-testid="tag-count">
          {count}
        </span>
        <Menu
          testId="tag-menu"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Tag actions"
              data-testid="tag-menu-button"
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
                testId="tag-action-rename"
                onClick={() => {
                  setRenaming(true);
                  close();
                }}
              >
                Rename
              </MenuItem>
              <MenuItem
                danger
                testId="tag-action-delete"
                onClick={() => {
                  void deleteTag(tag.id);
                  close();
                }}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}
