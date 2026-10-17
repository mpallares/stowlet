import { visibleConversations } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { can } from '@/entitlements';
import { ConversationRow } from './ConversationRow';

export function ConversationList({ conversationUrl }: { conversationUrl: (id: string) => string }) {
  const query = useGaveta((s) => s.query);
  const hits = useGaveta((s) => s.hits);
  const hiddenMatches = useGaveta((s) => s.hiddenMatches);
  const requirePro = useGaveta((s) => s.requirePro);
  const contentSearch = useGaveta((s) => can(s.license.tier, 'content-search'));
  const conversations = useGaveta((s) => s.conversations);
  const view = useGaveta((s) => s.view);
  const items = useGaveta((s) => s.items);
  const folders = useGaveta((s) => s.folders);
  const tags = useGaveta((s) => s.tags);
  const status = useGaveta((s) => s.status);

  if (query.trim() !== '') {
    const byKey = new Map(conversations.map((c) => [c.id, c]));
    const rows = hits
      .map((h) => ({ hit: h, meta: byKey.get(h.id) }))
      .filter((r) => r.meta !== undefined);
    return (
      <section aria-label="Search results" data-testid="search-results">
        <p className="px-2 py-1 text-[11px] text-(--g-fg-muted)">
          {contentSearch
            ? `${rows.length} result${rows.length === 1 ? '' : 's'}`
            : `${rows.length} title match${rows.length === 1 ? '' : 'es'}`}
        </p>
        {rows.length === 0 && hiddenMatches === 0 ? (
          <p className="px-2 py-4 text-center text-[13px] text-(--g-fg-muted)">No matches.</p>
        ) : (
          <ul>
            {rows.map(({ hit, meta }) =>
              meta ? (
                <ConversationRow
                  key={hit.id}
                  meta={meta}
                  conversationUrl={conversationUrl}
                  subtitle={
                    contentSearch && hit.matchedFields.includes('content')
                      ? `matches in messages · ${meta.preview}`
                      : meta.preview
                  }
                />
              ) : null,
            )}
          </ul>
        )}
        {hiddenMatches > 0 && (
          <button
            type="button"
            data-testid="pro-matches"
            onClick={() => requirePro('content-search')}
            className="mx-2 my-1 block w-[calc(100%-1rem)] rounded border border-dashed border-(--g-accent) px-2 py-1.5 text-left text-xs text-(--g-fg-muted) hover:bg-(--g-bg-hover)"
          >
            {hiddenMatches} more match{hiddenMatches === 1 ? '' : 'es'} inside your chats
            <span className="ml-1 rounded bg-(--g-accent) px-1 text-[11px] font-semibold text-white">
              Pro
            </span>
          </button>
        )}
      </section>
    );
  }

  const rows = visibleConversations({ view, conversations, items, folders });
  const title =
    view.kind === 'all'
      ? 'All chats'
      : view.kind === 'pinned'
        ? 'Pinned'
        : view.kind === 'unfiled'
          ? 'Unfiled'
          : view.kind === 'tag'
            ? (tags.find((t) => t.id === view.id)?.name ?? 'Tag')
            : (folders.find((f) => f.id === view.id)?.name ?? 'Folder');

  return (
    <section aria-label={title} data-testid="conversation-list">
      <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="px-2 py-4 text-center text-[13px] text-(--g-fg-muted)">
          {status === 'syncing' ? 'Loading…' : 'Nothing here yet.'}
        </p>
      ) : (
        <ul>
          {rows.map((meta) => (
            <ConversationRow key={meta.id} meta={meta} conversationUrl={conversationUrl} />
          ))}
        </ul>
      )}
    </section>
  );
}
