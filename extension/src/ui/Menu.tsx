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
    const onScroll = (e: Event): void => {
      // A long menu scrolls on its own; only outside scrolling closes it.
      if (menuRef.current && e.composedPath().includes(menuRef.current)) return;
      close();
    };
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
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onScroll, true);
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
          className="fixed z-30 max-h-[70vh] min-w-52 overflow-y-auto rounded-lg border border-(--g-border) bg-(--g-bg-elevated) p-1.5 text-[13px] shadow-xl shadow-black/20"
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
  icon,
  trailing,
  selected,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  testId?: string;
  /** Leading 14px icon. */
  icon?: ReactNode;
  /** Right-aligned badge or check mark. */
  trailing?: ReactNode;
  /** Marks the current choice in a pick-one list. */
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      role={selected === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={selected}
      data-testid={testId}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-(--g-bg-hover) focus-visible:bg-(--g-bg-hover) ${
        danger ? 'text-red-500' : ''
      }`}
    >
      {icon && (
        <span className="flex w-3.5 shrink-0 justify-center text-(--g-fg-muted)">{icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

/** Small uppercase heading inside a menu. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
      {children}
    </p>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 border-t border-(--g-border)" />;
}

/** "Pro" pill used next to gated actions. */
export function ProBadge() {
  return (
    <span className="rounded bg-(--g-accent) px-1 py-px text-[10px] font-semibold text-white">
      Pro
    </span>
  );
}
