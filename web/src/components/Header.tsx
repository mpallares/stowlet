import Link from 'next/link';
import { ButtonLink } from './Button';
import { Container } from './Container';
import { Logo } from './Logo';
import { CHROME_WEB_STORE_URL, SITE_NAME } from '@/config';

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/70">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo className="h-6 w-6 text-accent dark:text-orange-400" />
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-lg px-2.5 py-1.5 text-neutral-600 transition-colors sm:inline-block hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              {l.label}
            </Link>
          ))}
          <ButtonLink
            href={CHROME_WEB_STORE_URL}
            external
            className="min-h-9 px-3.5 text-sm sm:ml-2"
          >
            Add to Chrome
          </ButtonLink>
        </nav>
      </Container>
    </header>
  );
}
