import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  trigger: (open: () => void, isOpen: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  testId?: string;
}

const GAP = 4;
const EDGE = 8;

/**
 * Minimal popover menu. Positioned against the viewport (not the trigger's box) so it is
 * never clipped by the scrolling folder and chat lists. Closes on outside click, Escape,
 * scroll or resize.
 */
export function Menu({ trigger, children, align = 'right', testId }: MenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Writes the position straight to the menu element after it mounts, so the menu can be
  // measured first and no extra render is needed.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!open || !anchor || !menu) return;
    const a = anchor.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const roomBelow = window.innerHeight - a.bottom - EDGE;
    const openUp = menuHeight + GAP > roomBelow && a.top > roomBelow;
    const st = menu.style;
    if (openUp) st.bottom = `${window.innerHeight - a.top + GAP}px`;
    else st.top = `${a.bottom + GAP}px`;
    if (align === 'right') st.right = `${Math.max(EDGE, window.innerWidth - a.right)}px`;
    else st.left = `${Math.max(EDGE, a.left)}px`;
    st.visibility = 'visible';
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    const onDown = (e: Event): void => {
      const path = e.composedPath();
      const inside =
        (anchorRef.current && path.includes(anchorRef.current)) ||
        (menuRef.current && path.includes(menuRef.current));
      if (!inside) close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className="inline-flex">
      {trigger(() => setOpen((v) => !v), open)}
      {open && (
        <div
          ref={menuRef}
          data-testid={testId}
          role="menu"
          style={{ visibility: 'hidden' }}
          className="fixed z-30 min-w-40 rounded-md border border-(--g-border) bg-(--g-bg-elevated) p-1 text-xs shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
  testId,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      onClick={onClick}
      className={`block w-full rounded px-2 py-1.5 text-left hover:bg-(--g-bg-hover) ${danger ? 'text-red-500' : ''}`}
    >
      {children}
    </button>
  );
}
