/**
 * Every external value the site needs. Fill in the placeholders before deploying.
 * Nothing in src/app or src/components should hardcode a URL, price or address.
 */

/** Canonical origin, no trailing slash. Used for canonical URLs, sitemap, robots and OG image. */
export const SITE_URL = 'https://stowlet.app';

/** Chrome Web Store listing. Set after the first store review. */
export const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/REPLACE_WITH_EXTENSION_ID'; // TODO

/** Lemon Squeezy checkout links. */
export const LEMON_SQUEEZY_MONTHLY_URL =
  'https://REPLACE.lemonsqueezy.com/checkout/buy/REPLACE_MONTHLY_VARIANT'; // TODO
export const LEMON_SQUEEZY_ANNUAL_URL =
  'https://REPLACE.lemonsqueezy.com/checkout/buy/REPLACE_ANNUAL_VARIANT'; // TODO
export const LEMON_SQUEEZY_LIFETIME_URL =
  'https://REPLACE.lemonsqueezy.com/checkout/buy/REPLACE_LIFETIME_VARIANT'; // TODO

/** Display prices. Keep them in sync with the Lemon Squeezy products. */
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
export const SUPPORT_EMAIL = 'support@stowlet.app'; // TODO: confirm mailbox exists

/** Shown on legal pages. */
export const COMPANY_NAME = 'Stowlet'; // TODO: legal entity name
export const GOVERNING_LAW = 'REPLACE_JURISDICTION'; // TODO: e.g. "Spain" or "the State of Delaware, USA"
export const LEGAL_LAST_UPDATED = '2026-10-16';

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
