import type { Metadata } from 'next';
import Link from 'next/link';
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
  PRICE_ANNUAL,
  PRICE_LIFETIME,
  PRICE_LIFETIME_FOUNDING,
  PRICE_MONTHLY,
  PRICE_TEAMS_SEAT,
  SITE_NAME,
  TAGLINE,
  TEAMS_MIN_SEATS,
  mailto,
} from '@/config';

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: ${TAGLINE}` },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
};

const features = [
  {
    title: 'Folders',
    lead: 'Put chats where you can find them again.',
    how: 'A panel on the right edge of ChatGPT and Claude. Create folders and sub-folders, give them a colour, drag chats in, pin the ones you keep coming back to. The folder tree is saved in your browser and survives reloads.',
  },
  {
    title: 'Search',
    lead: 'Search the text of every conversation, not just the titles.',
    how: 'Gaveta reads each chat through the site you are already logged into and builds an index in IndexedDB. Results show up as you type. Only chats that changed since the last visit are re-read, so it stays fast.',
  },
  {
    title: 'Export',
    lead: 'Take a conversation out as Markdown or JSON.',
    how: 'One click on any chat downloads a file to your computer. Markdown for notes and docs, JSON for scripts. Nothing is uploaded anywhere on the way.',
  },
];

const faq: FaqItem[] = [
  {
    q: 'Does Gaveta read my chats?',
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
    a: 'The panel shows a notice that Gaveta needs an update and keeps working on what it has already indexed. Updates ship through the Chrome Web Store. See the support page if the panel disappears.',
  },
  {
    q: 'What is the difference between Free and Pro?',
    a: `Free gives you ${FREE_FOLDER_LIMIT} folders, title search and Markdown export of one chat at a time. Pro removes the folder limit and adds full-text search over message content, tags and notes, and bulk export of a whole folder. Pro is the same on monthly, annual and lifetime; only the billing differs.`,
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes, within 14 days of purchase, through the payment provider. Email support with your order number.',
  },
];

const proItems = [
  'Unlimited folders and sub-folders',
  'Full-text search over message content',
  'Tags and notes',
  'Bulk export of a folder',
];

export default function Home() {
  return (
    <PageShell>
      <section className="py-20 sm:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{TAGLINE}</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-neutral-600 dark:text-neutral-400">
              Folders, full-text search and export for ChatGPT and Claude. Everything stays in your
              browser.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={CHROME_WEB_STORE_URL} external>
                Add to Chrome
              </ButtonLink>
              <ButtonLink href="#pricing" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              Free for {FREE_FOLDER_LIMIT} folders. No account needed.
            </p>
          </div>
          {/* TODO: replace with the demo GIF (same 16:10 box, add width/height to avoid layout shift). */}
          <div
            aria-label="Demo placeholder"
            role="img"
            className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
          >
            Demo GIF
          </div>
        </Container>
      </section>

      <section id="features" className="scroll-mt-16 py-16">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">What it does</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 font-medium text-neutral-800 dark:text-neutral-200">{f.lead}</p>
                <p className="mt-3 leading-7 text-neutral-600 dark:text-neutral-400">{f.how}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="privacy"
        className="scroll-mt-16 border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <Container className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <h2 className="text-2xl font-semibold tracking-tight">Private by design</h2>
          <div className="space-y-4 leading-7 text-neutral-700 dark:text-neutral-300">
            <p>
              Gaveta has no server for your data. Folders, pins and the search index live in
              IndexedDB in your Chrome profile. Export writes a file straight to your downloads
              folder.
            </p>
            <p>
              The only request that carries anything about you is the license-key check, and it
              carries the key. There is no account, no analytics and no telemetry. The extension
              asks for permission on chatgpt.com and claude.ai only.
            </p>
            <p>
              Uninstalling the extension deletes everything it stored.{' '}
              <Link href="/privacy" className="underline underline-offset-2">
                Read the privacy policy.
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <section id="pricing" className="scroll-mt-16 py-16">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            One license key works on every Chrome profile you use. Prices in USD.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Plan
              name="Free"
              price="$0"
              period=""
              items={[
                `${FREE_FOLDER_LIMIT} folders`,
                'Search by title',
                'Export one chat as Markdown',
                'Pin chats',
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
          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-dashed border-neutral-300 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700">
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

      <section id="faq" className="scroll-mt-16 py-16">
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6">
            <Faq items={faq} />
          </div>
        </Container>
      </section>
    </PageShell>
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
      className={`flex flex-col rounded-xl border p-6 ${
        highlight
          ? 'border-accent dark:border-orange-500'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
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
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
        {period ? (
          <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">{period}</span>
        ) : null}
      </p>
      {note ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note}</p> : null}
      <ul className="mt-6 flex-1 space-y-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-accent dark:text-orange-400">
              –
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
