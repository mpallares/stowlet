import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { customers, licenses, subscriptions, transactions } from '../db/schema';
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
  await db
    .insert(customers)
    .values(c)
    .onConflictDoUpdate({
      target: customers.customerId,
      set: {
        email: sql`excluded.email`,
        eventAt: sql`excluded.event_at`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`${customers.eventAt} <= excluded.event_at`,
    });
}

export async function getCustomerEmail(db: Db, customerId: string): Promise<string | null> {
  const rows = await db
    .select({ email: customers.email })
    .from(customers)
    .where(eq(customers.customerId, customerId));
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
  await db
    .insert(subscriptions)
    .values(s)
    .onConflictDoUpdate({
      target: subscriptions.subscriptionId,
      set: {
        customerId: sql`excluded.customer_id`,
        status: sql`excluded.status`,
        priceId: sql`excluded.price_id`,
        productId: sql`excluded.product_id`,
        scheduledChangeAction: sql`excluded.scheduled_change_action`,
        scheduledChangeAt: sql`excluded.scheduled_change_at`,
        eventAt: sql`excluded.event_at`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`${subscriptions.eventAt} <= excluded.event_at`,
    });
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
  await db.insert(transactions).values(t).onConflictDoNothing({
    target: transactions.transactionId,
  });
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
  const rows = await db
    .update(transactions)
    .set({ refundedAt: sql`coalesce(${transactions.refundedAt}, ${refundedAt}::timestamptz)` })
    .where(eq(transactions.transactionId, transactionId))
    .returning({ transactionId: transactions.transactionId });
  return rows.length > 0;
}

/**
 * The subscription a refunded transaction paid for, if that subscription should now be
 * cancelled: the transaction is its most recent payment and it is not already cancelled.
 * Null for a one-time purchase, an older payment, or a subscription that has already ended.
 */
export async function subscriptionToCancelAfterRefund(
  db: Db,
  transactionId: string,
): Promise<string | null> {
  const rows = await db
    .select({ subscriptionId: subscriptions.subscriptionId })
    .from(transactions)
    .innerJoin(subscriptions, eq(subscriptions.subscriptionId, transactions.subscriptionId))
    .where(
      and(
        eq(transactions.transactionId, transactionId),
        sql`${subscriptions.status} <> 'canceled'`,
        sql`not exists (
          select 1 from transactions later
           where later.subscription_id = ${transactions.subscriptionId}
             and later.completed_at > ${transactions.completedAt})`,
      ),
    );
  return rows[0]?.subscriptionId ?? null;
}

/** Returns the customer's license, creating it with `candidateKey` only if none exists yet. */
export async function ensureLicense(
  db: Db,
  customerId: string,
  candidateKey: string,
): Promise<{ licenseKey: string; emailed: boolean }> {
  await db
    .insert(licenses)
    .values({ licenseKey: candidateKey, customerId })
    .onConflictDoNothing({ target: licenses.customerId });
  const rows = await db
    .select({ licenseKey: licenses.licenseKey, emailedAt: licenses.emailedAt })
    .from(licenses)
    .where(eq(licenses.customerId, customerId));
  const row = rows[0];
  if (!row) throw new Error('license-missing-after-insert');
  return { licenseKey: row.licenseKey, emailed: row.emailedAt !== null };
}

export async function markLicenseEmailed(db: Db, customerId: string): Promise<void> {
  await db
    .update(licenses)
    .set({ emailedAt: sql`now()` })
    .where(and(eq(licenses.customerId, customerId), isNull(licenses.emailedAt)));
}

/** Everything `resolveTier` needs for a key; null when the key does not exist. */
export async function findEntitlement(db: Db, licenseKey: string): Promise<Entitlement | null> {
  const [license] = await db
    .select({ customerId: licenses.customerId, revokedAt: licenses.revokedAt })
    .from(licenses)
    .where(eq(licenses.licenseKey, licenseKey));
  if (!license) return null;

  const [lifetime, standing] = await Promise.all([
    // A lifetime purchase counts until it is refunded.
    db
      .select({ transactionId: transactions.transactionId })
      .from(transactions)
      .where(
        and(
          eq(transactions.customerId, license.customerId),
          eq(transactions.lifetime, true),
          isNull(transactions.refundedAt),
        ),
      )
      .limit(1),
    // A subscription counts unless its most recent payment was refunded; the next
    // successful payment brings it back.
    db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.customerId, license.customerId),
          // Written out by name: in a single-table query Drizzle leaves column names
          // unqualified, which a correlated subquery over the same table cannot use.
          sql`not coalesce((
            select latest.refunded_at is not null from transactions latest
             where latest.subscription_id = subscriptions.subscription_id
             order by latest.completed_at desc limit 1), false)`,
        ),
      ),
  ]);

  return {
    customerId: license.customerId,
    revoked: license.revokedAt !== null,
    lifetime: lifetime.length > 0,
    subscriptionStatuses: standing.map((s) => s.status),
  };
}

export async function listSubscriptionIds(db: Db, customerId: string): Promise<string[]> {
  const rows = await db
    .select({ subscriptionId: subscriptions.subscriptionId })
    .from(subscriptions)
    .where(eq(subscriptions.customerId, customerId))
    .orderBy(desc(subscriptions.createdAt));
  return rows.map((r) => r.subscriptionId);
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
  const rows = await db
    .select({ licenseKey: licenses.licenseKey })
    .from(transactions)
    .innerJoin(licenses, eq(licenses.customerId, transactions.customerId))
    .where(
      and(
        eq(transactions.transactionId, transactionId),
        isNull(licenses.revokedAt),
        isNull(transactions.refundedAt),
        sql`${transactions.createdAt} > now() - make_interval(mins => ${windowMinutes}::int)`,
      ),
    );
  return rows[0]?.licenseKey ?? null;
}
