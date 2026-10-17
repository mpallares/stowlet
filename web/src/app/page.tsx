import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/Button';
import { Container } from '@/components/Container';
import { Faq, type FaqItem } from '@/components/Faq';
import { PageShell } from '@/components/PageShell';
import {
  CHROME_WEB_STORE_URL,
  DESCRIPTION,
  FOUNDING_SEATS,
  FREE_FOLDER_LIMIT,
  LEMON_SQUEEZY_ANNUAL_URL,
  LEMON_SQUEEZY_LIFETIME_URL,
  LEMON_SQUEEZY_MONTHLY_URL,
  LISTING_TITLE,
  PRICE_ANNUAL,
  PRICE_LIFETIME,
  PRICE_LIFETIME_FOUNDING,
  PRICE_MONTHLY,
  PRICE_TEAMS_SEAT,
  SITE_NAME,
  SITE_URL,
  TAGLINE,
  TEAMS_MIN_SEATS,
  mailto,
} from '@/config';

export const metadata: Metadata = {
  title: { absolute: LISTING_TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
};

type IconName = 'folder' | 'search' | 'download' | 'browser' | 'database' | 'shield' | 'check';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
    browser: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </>
    ),
    shield: <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6zm-3 9 2 2 4-4" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

const features = [
  {
    title: 'Folders',
    icon: 'folder' as IconName,
    lead: 'Put chats where you can find them again.',
    how: 'A panel on the right edge of ChatGPT and Claude. Create folders, give them a colour, drag chats in, pin the ones you keep coming back to. Pro adds tags and a private note on any chat. Everything is saved in your browser and survives reloads.',
    image: { src: '/feature-folders.webp', width: 720, height: 582 },
  },
  {
    title: 'Search',
    icon: 'search' as IconName,
    lead: 'Search every conversation as you type.',
    how: 'Stowlet reads each chat through the site you are already logged into and builds an index in IndexedDB. Free matches titles; Pro matches the text of every message. Only chats that changed since the last visit are re-read.',
    image: { src: '/feature-search.webp', width: 720, height: 806 },
  },
  {
    title: 'Export',
    icon: 'download' as IconName,
    lead: 'Take a conversation out as a file.',
    how: 'One click on any chat downloads it to your computer. Markdown for notes and docs; Pro adds JSON for scripts and a zip of a whole folder, sub-folders included. Your tags and notes travel with the file. Nothing is uploaded anywhere on the way.',
    image: { src: '/feature-export.webp', width: 720, height: 870 },
  },
];

const faq: FaqItem[] = [
  {
    q: 'Does Stowlet read my chats?',
    a: 'Yes, inside your browser, to build the search index. The text is stored in IndexedDB on your computer and is never sent to us or anyone else.',
  },
  {
    q: 'What leaves my browser?',
    a: 'Two things only: a license-key check when you enter a key, and a small configuration file the extension downloads from this site that tells it which chat apps are supported. Neither contains chat content.',
  },
  {
    q: 'Which apps are supported?',
    a: `ChatGPT (chatgpt.com) and Claude (claude.ai) today. Gemini and Grok are next. The extension asks for permission on those two sites only.`,
  },
  {
    q: 'What happens when ChatGPT or Claude changes its layout?',
    a: 'The panel shows a notice that Stowlet needs an update and keeps working on what it has already indexed. Updates ship through the Chrome Web Store. See the support page if the panel disappears.',
  },
  {
    q: 'What is the difference between Free and Pro?',
    a: 'Free: 5 folders (no sub-folders), title search only, single-chat Markdown export. Pro: unlimited folders + sub-folders, full-text content search, tags/notes, bulk export (Markdown + JSON). Free still indexes your chats; a search shows title matches and how many more matches sit inside your chats.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes, within 14 days of purchase, through the payment provider. Email support with your order number.',
  },
];

const proItems = [
  'Unlimited folders + sub-folders',
  'Full-text content search',
  'Tags/notes',
  'Bulk export (Markdown + JSON)',
];

const steps = [
  {
    title: 'Reads your chats in your browser',
    icon: 'browser' as IconName,
    body: 'The panel asks chatgpt.com or claude.ai for your conversations using the session you are already logged into. No account with us.',
  },
  {
    title: 'Builds the index locally',
    icon: 'database' as IconName,
    body: 'Titles and messages go into an IndexedDB database in your Chrome profile. Only chats that changed are re-read.',
  },
  {
    title: 'Sends nothing anywhere',
    icon: 'shield' as IconName,
    body: 'Folders, pins and exports never leave your computer. The only outbound request is a license-key check, if you enter one.',
  },
];

/** Reads a JPEG's pixel size from its SOF marker, so the layout can reserve space. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** Present once `pnpm demo:record` has been run with DEMO_STILL=claude.jpg on claude.ai. */
function readClaudeStill(): { width: number; height: number } | null {
  const file = join(process.cwd(), 'public', 'claude.jpg');
  if (!existsSync(file)) return null;
  return jpegSize(readFileSync(file));
}

const claudeStill = readClaudeStill();

const priceNumber = (s: string): string => s.replace(/[^0-9.]/g, '');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'BrowserApplication',
  operatingSystem: 'Chrome',
  downloadUrl: CHROME_WEB_STORE_URL,
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    {
      '@type': 'Offer',
      name: 'Pro monthly',
      price: priceNumber(PRICE_MONTHLY),
      priceCurrency: 'USD',
    },
    {
      '@type': 'Offer',
      name: 'Pro annual',
      price: priceNumber(PRICE_ANNUAL),
      priceCurrency: 'USD',
    },
    {
      '@type': 'Offer',
      name: 'Pro lifetime',
      price: priceNumber(PRICE_LIFETIME_FOUNDING ?? PRICE_LIFETIME),
      priceCurrency: 'USD',
    },
  ],
};

export default function Home() {
  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-10 sm:pt-24">
        <div className="hero-backdrop" aria-hidden="true" />
        <Container className="flex flex-col items-center text-center">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Chrome extension for ChatGPT and Claude
          </p>
          <h1 className="rise rise-2 mt-6 max-w-4xl text-5xl font-semibold tracking-tighter text-balance sm:text-7xl">
            {TAGLINE}
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-lg leading-8 text-pretty text-neutral-600 dark:text-neutral-400">
            Folders, full-text search and export for your AI conversations. Everything stays in your
            browser.
          </p>
          <div className="rise rise-4 mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={CHROME_WEB_STORE_URL} external size="lg">
              <Icon name="browser" className="h-5 w-5" />
              Add to Chrome
            </ButtonLink>
            <ButtonLink href="#features" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>
          <ul className="rise rise-4 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {[
              `Free for ${FREE_FOLDER_LIMIT} folders`,
              'No account',
              'Nothing leaves your browser',
            ].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Icon name="check" className="h-3.5 w-3.5 text-emerald-500" />
                {t}
              </li>
            ))}
          </ul>
        </Container>
        <Container className="rise rise-5 mt-14 max-w-5xl">
          <div className="browser-frame">
            <div className="browser-frame-bar">
              <span className="browser-dot" />
              <span className="browser-dot" />
              <span className="browser-dot" />
              <span className="mx-auto rounded-md bg-neutral-800 px-3 py-0.5 text-xs text-neutral-400">
                chatgpt.com
              </span>
              <span className="w-12" aria-hidden="true" />
            </div>
            <video
              className="block aspect-[1200/840] w-full bg-neutral-950"
              width={1200}
              height={840}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/demo-poster.webp"
              aria-label="Stowlet panel on ChatGPT: creating a folder, filing a chat and searching message text"
            >
              <source src="/demo.mp4" type="video/mp4" />
            </video>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            The panel on chatgpt.com: a folder, a drag, a search inside messages.
          </p>
        </Container>
      </section>

      {/* Works on */}
      <section className="py-8">
        <Container className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Works on</span>
          {[
            { label: 'chatgpt.com', live: true },
            { label: 'claude.ai', live: true },
            { label: 'Gemini', live: false },
            { label: 'Grok', live: false },
          ].map((s) => (
            <span
              key={s.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium ${
                s.live
                  ? 'border-neutral-200 bg-white text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
                  : 'border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${s.live ? 'bg-emerald-500' : 'bg-neutral-400'}`}
                aria-hidden="true"
              />
              {s.label}
              {!s.live && <span className="text-xs">soon</span>}
            </span>
          ))}
        </Container>
      </section>

      {/* Steps */}
      <section className="py-14">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Local-first, from the first click.
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="card card-hover p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-orange-400/10 dark:text-orange-400">
                    <Icon name={step.icon} />
                  </span>
                  <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-14">
        <Container>
          <Eyebrow>What it does</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Three things, done properly.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="card card-hover flex flex-col overflow-hidden">
                <div className="relative h-60 overflow-hidden border-b border-neutral-200 bg-neutral-900 dark:border-neutral-800">
                  <img
                    src={f.image.src}
                    width={f.image.width}
                    height={f.image.height}
                    loading="lazy"
                    alt={`Stowlet panel: ${f.title.toLowerCase()}`}
                    className="w-full"
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-900 to-transparent"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2">
                    <span className="text-accent dark:text-orange-400">
                      <Icon name={f.icon} />
                    </span>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                  </div>
                  <p className="mt-2 font-medium text-neutral-800 dark:text-neutral-200">
                    {f.lead}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {f.how}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {claudeStill && (
            <div className="card mt-8 grid items-center gap-8 p-6 md:grid-cols-[1fr_1.4fr] md:p-8">
              <div>
                <h3 className="text-lg font-semibold">The same panel on Claude</h3>
                <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-400">
                  Folders, search and export work the same way on claude.ai. Your folders are kept
                  per site, and nothing is shared between the two.
                </p>
              </div>
              <img
                src="/claude.jpg"
                width={claudeStill.width}
                height={claudeStill.height}
                loading="lazy"
                alt="Stowlet panel on claude.ai"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
              />
            </div>
          )}
        </Container>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-20 py-14">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-neutral-950 px-6 py-12 text-neutral-100 sm:px-12 dark:bg-neutral-900">
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative grid gap-10 md:grid-cols-[1fr_1.2fr]">
              <div>
                <Eyebrow light>Private by design</Eyebrow>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
                  There is no server for your chats.
                </h2>
                <p className="mt-4 leading-7 text-neutral-300">
                  Folders, pins and the search index live in IndexedDB in your Chrome profile.
                  Export writes a file straight to your downloads folder.
                </p>
                <Link
                  href="/privacy"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-orange-300 hover:text-orange-200"
                >
                  Read the privacy policy
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <ul className="grid gap-4 self-center">
                {[
                  'No account, no analytics, no telemetry.',
                  'Permission on chatgpt.com and claude.ai only. Never every site.',
                  'The one outbound request is a license-key check, and it carries the key.',
                  'Uninstall and everything it stored is gone.',
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-neutral-200">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    <span className="leading-6">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-14">
        <Container>
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Start free. Pay once if you like it.
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            One license key works on every Chrome profile you use. Prices in USD.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Plan
              name="Free"
              price="$0"
              period=""
              items={[
                '5 folders (no sub-folders)',
                'Title search only',
                'Single-chat Markdown export',
              ]}
              cta={{ href: CHROME_WEB_STORE_URL, label: 'Add to Chrome', external: true }}
            />
            <Plan
              name="Pro monthly"
              price={PRICE_MONTHLY}
              period="per month"
              items={proItems}
              cta={{ href: LEMON_SQUEEZY_MONTHLY_URL, label: 'Buy monthly', external: true }}
            />
            <Plan
              name="Pro annual"
              price={PRICE_ANNUAL}
              period="per year"
              badge="Best value"
              items={proItems}
              cta={{ href: LEMON_SQUEEZY_ANNUAL_URL, label: 'Buy annual', external: true }}
              highlight
            />
            <Plan
              name="Pro lifetime"
              price={PRICE_LIFETIME_FOUNDING ?? PRICE_LIFETIME}
              compareAt={PRICE_LIFETIME_FOUNDING ? PRICE_LIFETIME : undefined}
              period="once"
              badge={PRICE_LIFETIME_FOUNDING ? 'Founding price' : undefined}
              note={
                PRICE_LIFETIME_FOUNDING
                  ? `For the first ${FOUNDING_SEATS} licenses, then ${PRICE_LIFETIME}.`
                  : undefined
              }
              items={[
                'Everything in Pro, forever',
                'All current and future assistants',
                'All future updates',
                'Pay once',
              ]}
              cta={{ href: LEMON_SQUEEZY_LIFETIME_URL, label: 'Buy lifetime', external: true }}
            />
          </div>
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-dashed border-neutral-300 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700">
            <div>
              <h3 className="text-lg font-semibold">
                Teams{' '}
                <span className="ml-1 rounded-full border border-neutral-300 px-2 py-0.5 align-middle text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                  Coming later
                </span>
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {PRICE_TEAMS_SEAT} per seat per month, billed annually, {TEAMS_MIN_SEATS}-seat
                minimum. Shared folders, a shared prompt library and admin export.
              </p>
            </div>
            {/* TODO: replace the mailto with a waitlist form once there is a backend. */}
            <ButtonLink
              href={mailto(`${SITE_NAME} Teams`)}
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
            >
              Tell me when it ships
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-14">
        <Container className="max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Before you install</h2>
          <div className="mt-6">
            <Faq items={faq} />
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="pt-6 pb-16">
        <Container className="card flex flex-col items-center gap-5 px-6 py-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Your chats, in drawers.
          </h2>
          <p className="max-w-md text-neutral-600 dark:text-neutral-400">
            Install in a minute. Nothing to sign up for, nothing to configure.
          </p>
          <ButtonLink href={CHROME_WEB_STORE_URL} external size="lg">
            <Icon name="browser" className="h-5 w-5" />
            Add to Chrome
          </ButtonLink>
        </Container>
      </section>
    </PageShell>
  );
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold tracking-wide uppercase ${
        light ? 'text-orange-300' : 'text-accent dark:text-orange-400'
      }`}
    >
      {children}
    </p>
  );
}

function Plan({
  name,
  price,
  period,
  items,
  cta,
  badge,
  compareAt,
  note,
  highlight = false,
}: {
  name: string;
  price: string;
  period: string;
  items: string[];
  cta: { href: string; label: string; external: boolean };
  badge?: string;
  compareAt?: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card card-hover flex flex-col p-6 ${highlight ? 'plan-highlight border-transparent' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold whitespace-nowrap">{name}</h3>
        {badge ? (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white dark:bg-orange-500 dark:text-neutral-950">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-4">
        {compareAt ? (
          <span className="mr-2 text-lg text-neutral-500 line-through dark:text-neutral-400">
            {compareAt}
          </span>
        ) : null}
        <span className="text-4xl font-semibold tracking-tight">{price}</span>
        {period ? (
          <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">{period}</span>
        ) : null}
      </p>
      {note ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note}</p> : null}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-1.5 text-accent dark:text-orange-400">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            {i}
          </li>
        ))}
      </ul>
      <ButtonLink
        href={cta.href}
        external={cta.external}
        variant={highlight ? 'primary' : 'secondary'}
        className="mt-6"
      >
        {cta.label}
      </ButtonLink>
    </div>
  );
}
