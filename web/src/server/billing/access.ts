/**
 * Access rules, in one place.
 *
 * - `active` and `trialing` grant Pro.
 * - `past_due` grants Pro: a failed renewal keeps access while Paddle retries the card.
 * - `paused` does not grant Pro until the subscription resumes.
 * - `canceled` does not grant Pro. Paddle only sets it once the cancellation takes effect,
 *   so a pending `scheduled_change` never revokes anything: the status is still `active`.
 * - A lifetime purchase grants Pro for as long as the license is not revoked.
 */
export type Tier = 'free' | 'pro';

const GRANTING_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due']);

export function grantsAccess(status: string): boolean {
  return GRANTING_STATUSES.has(status);
}

/** What the mirror knows about the customer behind a license key. */
export interface Entitlement {
  customerId: string;
  revoked: boolean;
  lifetime: boolean;
  subscriptionStatuses: string[];
}

export function resolveTier(entitlement: Entitlement | null): Tier {
  if (!entitlement || entitlement.revoked) return 'free';
  if (entitlement.lifetime) return 'pro';
  return entitlement.subscriptionStatuses.some(grantsAccess) ? 'pro' : 'free';
}
