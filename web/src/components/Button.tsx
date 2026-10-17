import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent-strong hover:shadow-lg hover:shadow-accent/30 focus-visible:outline-accent dark:bg-orange-500 dark:text-neutral-950 dark:shadow-orange-500/20 dark:hover:bg-orange-400',
  secondary:
    'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 focus-visible:outline-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800',
  ghost:
    'text-neutral-700 hover:bg-neutral-100 focus-visible:outline-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-800',
};

const sizes: Record<Size, string> = {
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  external = false,
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </a>
  );
}
