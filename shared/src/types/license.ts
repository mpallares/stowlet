export type LicenseTier = 'free' | 'pro';

/**
 * What the license service last said about the stored key.
 * - `valid`: the key unlocks Pro.
 * - `inactive`: the key exists but nothing behind it grants Pro (ended, paused or refunded).
 * - `invalid`: the key is unknown or revoked.
 * - `unreachable`: the service could not be asked; the previous tier is kept.
 */
export type LicenseCheck = 'valid' | 'inactive' | 'invalid' | 'unreachable';

export interface LicenseState {
  tier: LicenseTier;
  /** License key as typed by the user. */
  key: string | null;
  /** Epoch ms of the last time the license service answered for this key, null if never. */
  checkedAt: number | null;
  /** Outcome of the latest check, null when no key is stored or it was never checked. */
  check: LicenseCheck | null;
}

export const DEFAULT_LICENSE_STATE: LicenseState = {
  tier: 'free',
  key: null,
  checkedAt: null,
  check: null,
};

/** The site's license check: `{ key }` in, `{ valid, tier }` out. Carries the key and nothing else. */
export const LICENSE_VALIDATE_URL = 'https://stowlet.app/api/license/validate';
/** Where a customer manages their purchase. */
export const LICENSE_ACCOUNT_URL = 'https://stowlet.app/account';

export const FREE_FOLDER_LIMIT = 5;

export function folderLimit(tier: LicenseTier): number {
  return tier === 'pro' ? Number.POSITIVE_INFINITY : FREE_FOLDER_LIMIT;
}
