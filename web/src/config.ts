/**
 * Every external value the site needs. Fill in the placeholders before deploying.
 * Nothing in src/app or src/components should hardcode a URL, price or address.
 */

/** Canonical origin, no trailing slash. Used for canonical URLs, sitemap, robots and OG image. */
export const SITE_URL = 'https://stowlet.app';

/** Chrome Web Store listing. Set after the first store review. */
export const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/REPLACE_WITH_EXTENSION_ID'; // TODO

/**
 * Paddle price IDs per environment. Sandbox and live are separate accounts with separate IDs.
 * Which set is used comes from NEXT_PUBLIC_PADDLE_ENV (see src/lib/paddle.ts); the build
 * fails if the selected set still holds a placeholder.
 */
export type PaddleEnvironment = 'sandbox' | 'production';
export interface PaddlePriceIds {
  monthly: string;
  annual: string;
  /** Sold while PRICE_LIFETIME_FOUNDING is set. */
  lifetimeFounding: string;
  lifetime: string;
}
export const PADDLE_PRICE_IDS: Record<PaddleEnvironment, PaddlePriceIds> = {
  sandbox: {
    monthly: 'pri_01m86gw0x2h0p432rwbt6np1dd',
    annual: 'pri_01m86gw11n3c5j1vvky8cdfxhf',
    lifetimeFounding: 'pri_01m86gw1axka7fdbmf31rvdp9g',
    lifetime: 'pri_01m86gw1fy0gceav648s4tx55s',
  },
  production: {
    monthly: 'REPLACE_LIVE_MONTHLY_PRICE_ID', // TODO
    annual: 'REPLACE_LIVE_ANNUAL_PRICE_ID', // TODO
    lifetimeFounding: 'REPLACE_LIVE_LIFETIME_FOUNDING_PRICE_ID', // TODO
    lifetime: 'REPLACE_LIVE_LIFETIME_PRICE_ID', // TODO
  },
};

/** Where Paddle sends the buyer after a successful checkout. */
export const CHECKOUT_SUCCESS_PATH = '/welcome';

/**
 * USD list prices. The pricing section shows Paddle's own localized totals; these are only
 * the fallback when Paddle.js cannot load, and feed the structured data. Keep them in sync
 * with the Paddle prices.
 */
export const PRICE_MONTHLY = '$7';
export const PRICE_ANNUAL = '$49';
export const PRICE_LIFETIME = '$99';
/** Founding price for the first FOUNDING_SEATS lifetime licenses. Set to null once they are gone. */
export const PRICE_LIFETIME_FOUNDING: string | null = '$79';
export const FOUNDING_SEATS = 300;
/** Teams plan (Phase 2). Shown as "coming" with a notify link until it exists. */
export const PRICE_TEAMS_SEAT = '$8';
export const TEAMS_MIN_SEATS = 3;

/** Where support, privacy and refund requests go. */
export const SUPPORT_EMAIL = 'hello@stowlet.app';

/** Shown on legal pages. */
export const COMPANY_NAME = 'Stowlet'; // TODO: legal entity name
export const GOVERNING_LAW = 'REPLACE_JURISDICTION'; // TODO: e.g. "Spain" or "the State of Delaware, USA"
export const LEGAL_LAST_UPDATED = '2026-11-24';

export const FREE_FOLDER_LIMIT = 5;

export const SITE_NAME = 'Stowlet';
export const TAGLINE = "Stow every AI chat where you'll find it again.";
/** Store-listing style subtitle, also the document title: "Stowlet — Folders & Search for …". */
export const LISTING_SUBTITLE = 'Folders & Search for ChatGPT & Claude';
export const LISTING_TITLE = `${SITE_NAME} — ${LISTING_SUBTITLE}`;
export const DESCRIPTION =
  'Folders, full-text search and export for ChatGPT and Claude. Local-first: your chats never leave the browser.';

export const mailto = (subject: string): string =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
