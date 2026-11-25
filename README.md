# Stowlet

Folders, full-text search and export for AI chat apps. ChatGPT and Claude now, Gemini and Grok later.
Local-first: chat content never leaves the browser.

A Chrome extension (Manifest V3) built with WXT, React, Tailwind, Zustand, Dexie and MiniSearch.

## Layout

| Path         | What                                                          |
| ------------ | ------------------------------------------------------------- |
| `extension/` | The extension (WXT + React + TypeScript + Tailwind)           |
| `shared/`    | Types and the `VendorAdapter` contract shared across packages |
| `web/`       | Marketing site, checkout and license service (Next.js)        |

## Requirements

- Node 22+
- pnpm 12 (`corepack enable` gives you the pinned version)
- Chrome or Chromium for manual testing

## Build

```sh
pnpm install
pnpm build          # builds extension (-> extension/.output/chrome-mv3) and web
pnpm dev            # extension dev server with hot reload (opens a Chrome profile)
```

## Load unpacked in Chrome

1. `pnpm build`
2. Open `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked** and pick `extension/.output/chrome-mv3`.
4. Open https://chatgpt.com or https://claude.ai. The Stowlet panel sits on the
   right edge; use the drawer tab to collapse or expand it.

The extension only requests `storage` and host permissions for
`https://chatgpt.com/*` and `https://claude.ai/*`. Nothing else.

## Plans

Plan rules live in one place, `extension/src/entitlements.ts`, and every gated
feature asks it. Free: 5 folders (no sub-folders), title search only, single-chat
Markdown export. Pro: unlimited folders and sub-folders, full-text content search,
tags and notes, bulk export in Markdown and JSON. Content is indexed for everyone;
Free sees title matches plus a count of hidden content matches. The license key is
entered in the popup; the background worker checks it with the site's license service,
re-checks it once a day, and keeps the last confirmed tier when the service cannot be reached.

## Website

`web/` is a Next.js site: landing page with Paddle checkout, privacy, terms, support and
the remote-config JSON, plus the license service under `/api` (see below). Every external value (store URL, checkout links, prices, support
email, company name) is a constant in `web/src/config.ts`. The site is always dark;
the demo video and stills are dark, so one palette is enough.

```sh
pnpm --filter @stowlet/web dev     # http://localhost:3000
pnpm --filter @stowlet/web build   # pages are prerendered; /api routes need a Node host
```

### Payments and licenses

Paddle is the merchant of record. Copy `web/.env.example` to `web/.env.local` and fill it in;
the build fails without a Paddle environment and client token.

| Route                        | What it does                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/paddle/webhook`   | Verifies Paddle's signature, mirrors customers, subscriptions and completed transactions into Postgres, issues one license key per customer and emails it |
| `POST /api/license/validate` | `{ key }` → `{ valid, tier }`, for the extension                                                                                                          |
| `GET /api/license/claim`     | Lets `/welcome` show the key for the checkout that just finished                                                                                          |
| `POST /api/portal`           | License key → redirect to the customer's Paddle billing portal (`/account`)                                                                               |

```sh
pnpm --filter @stowlet/web db:generate  # after editing src/server/db/schema.ts: write a new migration
pnpm --filter @stowlet/web db:migrate   # apply the migrations in web/drizzle/ to the database
pnpm --filter @stowlet/web test         # webhook, access-rule and portal tests (in-process Postgres, real migrations)
```

The database is accessed through Drizzle. Tables are defined in
`web/src/server/db/schema.ts` and every schema change ships as a numbered SQL file in
`web/drizzle/`, generated with `db:generate` and committed. Run `db:migrate` against the
database before deploying code that needs the change. Never edit a migration that has already
been applied.

Who gets Pro is decided in `web/src/server/billing/access.ts`. An approved full
refund or chargeback switches off what that payment bought, through Paddle's `adjustment`
events, and cancels the subscription in Paddle when it was that subscription's latest payment. To revoke a key for another reason (for example one shared publicly), set
`licenses.revoked_at` by hand.

## Tests

```sh
pnpm lint           # eslint + prettier --check
pnpm typecheck      # tsc in every package
pnpm test           # vitest: Dexie layer, search wrapper, export formatting, ChatGPT parsers
pnpm test:e2e       # builds the e2e bundle, then Playwright drives Chromium with it loaded
```

The Playwright run needs a browser once: `pnpm --filter @stowlet/extension exec playwright install chromium`.

The e2e build (`STOWLET_E2E=1`) adds `http://127.0.0.1:4173/*` to the manifest so
the content script runs on a local fixture page served from
`extension/test/e2e/fixture-page/`. On that page the extension uses the
`MockAdapter` fed by `extension/test/fixtures/mock-conversations.json`. The
production build never includes the localhost match; CI asserts this.

## Adapter status

Both adapters are confirmed against live responses captured on 2026-10-16.
To refresh the captures, see
`extension/test/fixtures/chatgpt/README.md` and
`extension/test/fixtures/claude/README.md` for the DevTools snippets that
capture real responses as fixtures. If an API shape changed, the panel shows
"Stowlet needs an update for this site" instead of crashing, and the sidebar DOM
is used as a read-only fallback for the conversation list.

## Recording the landing-page demo

The hero video is produced by a script, not a screen recorder, so the cursor moves
on eased paths and every run is identical. `extension/scripts/record-demo.mjs` opens
chatgpt.com, draws its own cursor, creates a folder, drags a chat into it, searches
message text and opens the result. Frames come from Chrome's screencast at 2x and
ffmpeg writes `web/public/demo.mp4` and `demo-poster.webp`, with the
vendor's own sidebar cropped out. Encoding adds a camera layer from the script's
step timestamps: the frame pushes in on the panel once it opens, pans to follow
the drag and the search, pulls back out when the chat opens, and each step gets a
short fading caption. Clicks show an orange pulse. Needs ffmpeg
(`brew install ffmpeg`).

Google refuses to sign in to a browser that a script launched, so the reliable
flow attaches to a Chrome you start yourself:

```sh
pnpm build
open -na "Google Chrome" --args --remote-debugging-port=9222 \
  --user-data-dir="$HOME/stowlet-demo-profile" --window-size=1500,1000 https://chatgpt.com/
```

In that window: log in, load the unpacked extension from `extension/.output/chrome-mv3`
(`chrome://extensions`, Developer mode, Load unpacked), set ChatGPT's language to
English in its settings, and reload the tab. Then:

```sh
DEMO_CDP=http://127.0.0.1:9222 pnpm demo:record
```

The profile keeps the login and the extension, so later runs only need the two
commands. Without `DEMO_CDP` the script launches its own Chrome for Testing, which
works for accounts that sign in by email code. Use an account that holds only the
chats you want on camera. `DEMO_FOLDER`, `DEMO_CHAT` and `DEMO_QUERY` override the
folder name, the chat to drag and the search term. Content search is a Pro feature,
so either mark the demo profile Pro (set `license.tier` to `pro` in the extension's
`chrome.storage.sync`) or pick a `DEMO_QUERY` that matches a chat title.

The three feature stills on the landing page come from the mock page instead, so
they always show the current panel with the same sample data:

```sh
pnpm --filter @stowlet/extension build:e2e
pnpm demo:stills                  # writes web/public/feature-{folders,search,export}.webp
```

## Remote config

On startup the background worker fetches `https://stowlet.app/config/v1/config.json`
(per-adapter `enabled` flags plus an optional notice), caches it in
`chrome.storage.local` for six hours and falls back to a bundled default when
offline. The stub lives in `web/public/config/v1/config.json`. The host must send
`Access-Control-Allow-Origin: *`, which `web/vercel.json` sets for `/config/*`.

## License

Private. All rights reserved for now.
