import { useStowlet } from '@/store/context';
import { IconClose, IconSearch } from './icons';

export function SearchBox() {
  const query = useStowlet((s) => s.query);
  const setQuery = useStowlet((s) => s.setQuery);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-(--g-fg-muted)">
        <IconSearch />
      </span>
      <input
        type="search"
        role="searchbox"
        aria-label="Search conversations"
        data-testid="search-input"
        placeholder="Search titles and messages"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-(--g-border) bg-(--g-bg) py-2 pr-8 pl-8 text-[13px] outline-none focus:border-(--g-accent)"
      />
      {query !== '' && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery('')}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-(--g-fg-muted) hover:text-(--g-fg)"
        >
          <IconClose />
        </button>
      )}
    </div>
  );
}
