/** A drawer front with a handle. Same mark as the extension icon. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <rect x="3" y="6" width="26" height="20" rx="4" fill="currentColor" opacity="0.15" />
      <rect x="3" y="6" width="26" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="11" y="15" width="10" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  );
}
