import { FREE_FOLDER_LIMIT, type LicenseTier } from '@gaveta/shared';

/**
 * Single source of truth for what each plan may do. The tier comes from the
 * license state the background worker owns; the store reads it and every gated
 * feature asks `can()` or `limits()` here. Nothing else may hard-code a plan rule.
 *
 * Free: 5 folders (no sub-folders), title search only, single-chat Markdown export.
 * Pro: unlimited folders + sub-folders, full-text content search, tags/notes,
 * bulk export (Markdown + JSON).
 */
export type Feature =
  'subfolders' | 'content-search' | 'json-export' | 'bulk-export' | 'tags' | 'notes';

/** Why the upgrade banner is showing. */
export type UpgradeReason = Feature | 'folders';

const PRO_ONLY: ReadonlySet<Feature> = new Set<Feature>([
  'subfolders',
  'content-search',
  'json-export',
  'bulk-export',
  'tags',
  'notes',
]);

export function can(tier: LicenseTier, feature: Feature): boolean {
  return tier === 'pro' || !PRO_ONLY.has(feature);
}

export function limits(tier: LicenseTier): { folders: number } {
  return { folders: tier === 'pro' ? Number.POSITIVE_INFINITY : FREE_FOLDER_LIMIT };
}

/** Where the upgrade banner sends people. */
export const PRICING_URL = 'https://gaveta.app/#pricing';

/** Plan summaries in the exact wording used on the website's pricing cards. */
export const PLAN_SUMMARY: Record<LicenseTier, string> = {
  free: '5 folders (no sub-folders), title search only, single-chat Markdown export',
  pro: 'Unlimited folders + sub-folders, full-text content search, tags/notes, bulk export (Markdown + JSON)',
};

/** Copy for the upgrade banner, keyed by what the user tried to do. */
export const UPGRADE_COPY: Record<UpgradeReason, { title: string; body: string }> = {
  folders: {
    title: `Free plan: ${FREE_FOLDER_LIMIT} folders`,
    body: 'Pro has unlimited folders + sub-folders.',
  },
  subfolders: {
    title: 'Sub-folders are a Pro feature',
    body: 'Free has 5 top-level folders. Pro adds unlimited folders + sub-folders.',
  },
  'content-search': {
    title: 'Full-text content search is a Pro feature',
    body: 'Free searches titles only. Pro searches inside every message.',
  },
  'json-export': {
    title: 'JSON export is a Pro feature',
    body: 'Free exports one chat as Markdown. Pro adds bulk export in Markdown and JSON.',
  },
  'bulk-export': {
    title: 'Bulk export is a Pro feature',
    body: 'Free exports one chat at a time as Markdown.',
  },
  tags: { title: 'Tags are a Pro feature', body: 'Pro adds tags and notes on any chat.' },
  notes: { title: 'Notes are a Pro feature', body: 'Pro adds tags and notes on any chat.' },
};
