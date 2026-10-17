import { useEffect, useRef, useState } from 'react';

interface Props {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/** Small textarea under a chat row. Saves on blur or Ctrl/Cmd+Enter, Escape cancels. */
export function NoteEditor({ initial, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const save = (): void => {
    if (value.trim() === initial.trim()) onCancel();
    else onSave(value);
  };
  return (
    <div className="px-1 pt-1 pb-1.5" data-testid="note-editor">
      <textarea
        ref={ref}
        data-testid="note-input"
        value={value}
        rows={3}
        placeholder="Write a note for this chat…"
        aria-label="Note"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        onBlur={save}
        className="w-full resize-y rounded border border-(--g-border) bg-(--g-bg) px-2 py-1.5 text-[13px] leading-5 outline-none focus:border-(--g-accent)"
      />
      <p className="mt-0.5 px-0.5 text-[11px] text-(--g-fg-muted)">
        Saved on blur · Esc to cancel · empty removes the note
      </p>
    </div>
  );
}
