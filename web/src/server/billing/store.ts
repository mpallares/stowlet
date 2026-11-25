import type { Db } from '../db';
import type { Entitlement } from './access';

/**
 * Data access for the Paddle mirror. Every write is an upsert keyed on the Paddle ID, so a
 * redelivered webhook is a no-op, and `event_at` guards stop an older event that arrives late
 * from overwriting newer state.
 */

export async function upsertCustomer(
  db: Db,
  c: { customerId: string; email: string; eventAt: string },
): Promise<void> {
  await db.query(
    `INSERT INTO customers (customer_id, email, event_at) VALUES ($1, $2, $3)
     ON CONFLICT (customer_id) DO UPDATE
       SET email = EXCLUDED.email, event_at = EXCLUDED.event_at, updated_at = NOW()
       WHERE customers.event_at <= EXCLUDED.event_at`,
    [c.customerId, c.email, c.eventAt],
  );
}

export async function getCustomerEmail(db: Db, customerId: string): Promise<string | null> {
  const rows = await db.query<{ email: string }>(
    'SELECT email FROM customers WHERE customer_id = $1',
    [customerId],
  );
  return rows[0]?.email ?? null;
}

export interface SubscriptionRow {
  subscriptionId: string;
  customerId: string;
  status: string;
  priceId: string;
  productId: string;
  scheduledChangeAction: string | null;
  scheduledChangeAt: string | null;
  eventAt: string;
}

export async function upsertSubscription(db: Db, s: SubscriptionRow): Promise<void> {
  await db.query(
    `INSERT INTO subscriptions
       (subscription_id, customer_id, status, price_id, product_id,
        scheduled_change_action, scheduled_change_at, event_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (subscription_id) DO UPDATE
       SET customer_id = EXCLUDED.customer_id, status = EXCLUDED.status,
           price_id = EXCLUDED.price_id, product_id = EXCLUDED.product_id,
           scheduled_change_action = EXCLUDED.scheduled_change_action,
           scheduled_change_at = EXCLUDED.scheduled_change_at,
           event_at = EXCLUDED.event_at, updated_at = NOW()
       WHERE subscriptions.event_at <= EXCLUDED.event_at`,
    [
      s.subscriptionId,
      s.customerId,
      s.status,
      s.priceId,
      s.productId,
      s.scheduledChangeAction,
      s.scheduledChangeAt,
      s.eventAt,
    ],
  );
}

export async function recordTransaction(
  db: Db,
  t: {
    transactionId: string;
    customerId: string;
    subscriptionId: string | null;
    priceId: string;
    productId: string;
    lifetime: boolean;
    completedAt: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO transactions
       (transaction_id, customer_id, subscription_id, price_id, product_id, lifetime, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (transaction_id) DO NOTHING`,
    [
      t.transactionId,
      t.customerId,
      t.subscriptionId,
      t.priceId,
      t.productId,
      t.lifetime,
      t.completedAt,
    ],
  );
}

/**
 * Marks a transaction as refunded. Returns false when we never recorded that transaction.
 * Keeps the first refund time, so a redelivered or later adjustment changes nothing.
 */
export async function markTransactionRefunded(
  db: Db,
  transactionId: string,
  refundedAt: string,
): Promise<boolean> {
  const rows = await db.query<{ transaction_id: string }>(
    `UPDATE transactions SET refunded_at = COALESCE(refunded_at, $2)
      WHERE transaction_id = $1 RETURNING transaction_id`,
    [transactionId, refundedAt],
  );
  return rows.length > 0;
}

/** Returns the customer's license, creating it with `candidateKey` only if none exists yet. */
export async function ensureLicense(
  db: Db,
  customerId: string,
  candidateKey: string,
): Promise<{ licenseKey: string; emailed: boolean }> {
  await db.query(
    `INSERT INTO licenses (license_key, customer_id) VALUES ($1, $2)
     ON CONFLICT (customer_id) DO NOTHING`,
    [candidateKey, customerId],
  );
  const rows = await db.query<{ license_key: string; emailed: boolean }>(
    `SELECT license_key, emailed_at IS NOT NULL AS emailed FROM licenses WHERE customer_id = $1`,
    [customerId],
  );
  const row = rows[0];
  if (!row) throw new Error('license-missing-after-insert');
  return { licenseKey: row.license_key, emailed: row.emailed };
}

export async function markLicenseEmailed(db: Db, customerId: string): Promise<void> {
  await db.query(
    'UPDATE licenses SET emailed_at = NOW() WHERE customer_id = $1 AND emailed_at IS NULL',
    [customerId],
  );
}

/** Everything `resolveTier` needs for a key; null when the key does not exist. */
export async function findEntitlement(db: Db, licenseKey: string): Promise<Entitlement | null> {
  const rows = await db.query<{
    customer_id: string;
    revoked: boolean;
    lifetime: boolean;
    statuses: string[];
  }>(
    `SELECT l.customer_id,
            l.revoked_at IS NOT NULL AS revoked,
            -- A lifetime purchase counts until it is refunded.
            EXISTS (SELECT 1 FROM transactions t
                     WHERE t.customer_id = l.customer_id AND t.lifetime
                       AND t.refunded_at IS NULL) AS lifetime,
            -- A subscription counts unless its most recent payment was refunded; the next
            -- successful payment brings it back.
            ARRAY(SELECT s.status FROM subscriptions s
                   WHERE s.customer_id = l.customer_id
                     AND NOT COALESCE(
                       (SELECT t.refunded_at IS NOT NULL FROM transactions t
                         WHERE t.subscription_id = s.subscription_id
                         ORDER BY t.completed_at DESC LIMIT 1),
                       FALSE)) AS statuses
       FROM licenses l
      WHERE l.license_key = $1`,
    [licenseKey],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    customerId: row.customer_id,
    revoked: row.revoked,
    lifetime: row.lifetime,
    subscriptionStatuses: row.statuses,
  };
}

export async function listSubscriptionIds(db: Db, customerId: string): Promise<string[]> {
  const rows = await db.query<{ subscription_id: string }>(
    'SELECT subscription_id FROM subscriptions WHERE customer_id = $1',
    [customerId],
  );
  return rows.map((r) => r.subscription_id);
}

/**
 * The key for the customer behind a just-completed transaction, for the welcome page.
 * Only answers for `windowMinutes` after we recorded the transaction, so an old
 * transaction ID is not a standing way to read a key.
 */
export async function claimLicenseByTransaction(
  db: Db,
  transactionId: string,
  windowMinutes: number,
): Promise<string | null> {
  const rows = await db.query<{ license_key: string }>(
    `SELECT l.license_key
       FROM transactions t JOIN licenses l ON l.customer_id = t.customer_id
      WHERE t.transaction_id = $1
        AND l.revoked_at IS NULL
        AND t.refunded_at IS NULL
        AND t.created_at > NOW() - make_interval(mins => $2::int)`,
    [transactionId, windowMinutes],
  );
  return rows[0]?.license_key ?? null;
}
