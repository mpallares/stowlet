import Link from 'next/link';
import { Container } from './Container';
import { Logo } from './Logo';
import { CHROME_WEB_STORE_URL, SITE_NAME, SUPPORT_EMAIL, TAGLINE } from '@/config';

const groups = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/#faq', label: 'FAQ' },
      { href: CHROME_WEB_STORE_URL, label: 'Chrome Web Store', external: true },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/support', label: 'Support' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL },
    ],
  },
];

const linkClass =
  'text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
              <Logo className="h-6 w-6" />
              {SITE_NAME}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {TAGLINE} Folders, search and export for ChatGPT and Claude, with nothing leaving your
              browser.
            </p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
                {g.title}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {g.links.map((l) =>
                  'external' in l ? (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p>Not affiliated with OpenAI or Anthropic.</p>
        </div>
      </Container>
    </footer>
  );
}
