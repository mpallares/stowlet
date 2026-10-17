import { useGaveta } from '@/store/context';
import { PRICING_URL, UPGRADE_COPY } from '@/entitlements';

const TEXT: Partial<Record<ReturnType<typeof useStatus>, string>> = {
  'needs-update':
    'Gaveta needs an update for this site. Folders and search still work on what is already indexed.',
  unauthenticated: 'Log in to the chat app so Gaveta can read your conversations.',
  network: 'Network problem while syncing. Will retry on next navigation.',
  disabled: 'This site is temporarily disabled by the Gaveta team.',
};

function useStatus() {
  return useGaveta((s) => s.status);
}

export function StatusBanner() {
  const status = useStatus();
  const notice = useGaveta((s) => s.notice);
  const progress = useGaveta((s) => s.progress);
  const upgrade = useGaveta((s) => s.upgrade);
  const dismissUpgrade = useGaveta((s) => s.dismissUpgrade);
  const lastError = useGaveta((s) => s.lastError);
  const dismissError = useGaveta((s) => s.dismissError);

  const text = TEXT[status];
  return (
    <div className="flex flex-col gap-1" data-testid="status" data-status={status}>
      {notice && <p className="rounded bg-(--g-bg-hover) px-2 py-1 text-xs">{notice}</p>}
      {text && (
        <p
          className="rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
          role="status"
        >
          {text}
        </p>
      )}
      {status === 'syncing' && progress && progress.total > 0 && (
        <p className="px-2 text-[11px] text-(--g-fg-muted)" role="status">
          Indexing {progress.done}/{progress.total}
        </p>
      )}
      {upgrade && (
        <div
          className="rounded-lg border border-(--g-accent) bg-(--g-accent-soft) px-3 py-2.5 text-xs"
          role="alert"
          data-testid="upgrade-state"
          data-reason={upgrade}
        >
          <p className="font-semibold">{UPGRADE_COPY[upgrade].title}</p>
          <p className="mt-0.5 text-(--g-fg-muted)">{UPGRADE_COPY[upgrade].body}</p>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={PRICING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-(--g-accent) px-2 py-1 font-semibold text-white hover:opacity-90"
            >
              See plans
            </a>
            <button
              type="button"
              onClick={dismissUpgrade}
              className="rounded-md px-2 py-1 text-(--g-fg-muted) hover:bg-(--g-bg-hover)"
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {lastError && (
        <p
          className="flex items-start gap-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
          role="alert"
        >
          <span className="flex-1">{lastError}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}
    </div>
  );
}
