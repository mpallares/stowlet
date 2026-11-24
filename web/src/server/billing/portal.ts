import type { Db } from '../db';
import { normalizeLicenseKey } from './licenseKey';
import { findEntitlement, listSubscriptionIds } from './store';

export type PortalResult = { url: string } | { error: 'unknown-key' };

/**
 * Resolves the Paddle customer from the license key (the customer's only credential; there
 * are no accounts) and mints a one-time portal URL. The customer ID never comes from the
 * request, and only the URL is returned.
 */
export async function createPortalUrl(
  submittedKey: unknown,
  deps: {
    db: Db;
    createSession: (customerId: string, subscriptionIds: string[]) => Promise<string>;
  },
): Promise<PortalResult> {
  const key = normalizeLicenseKey(submittedKey);
  if (!key) return { error: 'unknown-key' };
  // A revoked key still opens the portal: a refunded customer keeps access to their invoices.
  const entitlement = await findEntitlement(deps.db, key);
  if (!entitlement) return { error: 'unknown-key' };
  const subscriptionIds = await listSubscriptionIds(deps.db, entitlement.customerId);
  return { url: await deps.createSession(entitlement.customerId, subscriptionIds) };
}
