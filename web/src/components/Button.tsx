import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-strong focus-visible:outline-accent dark:bg-orange-500 dark:hover:bg-orange-400 dark:text-neutral-950',
  secondary:
    'border border-neutral-300 text-neutral-900 hover:bg-neutral-100 focus-visible:outline-neutral-500 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800',
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  external = false,
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
