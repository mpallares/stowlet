import { useRef, useState } from 'react';
import type { ConversationKey } from '@gaveta/shared';

export const DND_MIME = 'application/x-gaveta-conversation';

export function setDragKey(e: React.DragEvent, key: ConversationKey): void {
  e.dataTransfer.setData(DND_MIME, key);
  e.dataTransfer.setData('text/plain', key);
  e.dataTransfer.effectAllowed = 'move';
}

export function readDragKey(e: React.DragEvent): ConversationKey | null {
  const v = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData('text/plain');
  return v && v.includes(':') ? (v as ConversationKey) : null;
}

export function isConversationDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(DND_MIME);
}

/**
 * Tracks whether a conversation drag is over an element. Chrome fires dragleave
 * with no related element when the pointer crosses child nodes, so a plain
 * enter/leave toggle flickers; counting enters and leaves does not.
 */
export function useDropTarget(): {
  over: boolean;
  handlers: Pick<React.DOMAttributes<HTMLElement>, 'onDragEnter' | 'onDragOver' | 'onDragLeave'>;
  reset: () => void;
} {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const reset = () => {
    depth.current = 0;
    setOver(false);
  };
  return {
    over,
    reset,
    handlers: {
      onDragEnter: (e) => {
        if (!isConversationDrag(e)) return;
        depth.current += 1;
        if (!over) setOver(true);
      },
      onDragOver: (e) => {
        if (!isConversationDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      },
    },
  };
}
