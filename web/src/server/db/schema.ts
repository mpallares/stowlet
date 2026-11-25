import { boolean, foreignKey, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

/**
 * Tables of the license service. Rows are mirrored from verified Paddle webhooks: never edit
 * or delete them by hand. After changing this file run `pnpm db:generate` and commit the new
 * migration under web/drizzle/.
 *
 * Timestamps are read and written as strings so Paddle's microsecond precision survives; the
 * `event_at` ordering guards depend on it. Constraint and index names are spelled out to match
 * the database that existed before migrations were introduced.
 */
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const customers = pgTable(
  'customers',
  {
    /** Paddle "ctm_..." */
    customerId: text('customer_id').primaryKey(),
    email: text('email').notNull(),
    /** occurred_at of the event that last wrote this row. */
    eventAt: timestamptz('event_at').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [index('customers_email_idx').on(t.email)],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    /** Paddle "sub_..." */
    subscriptionId: text('subscription_id').primaryKey(),
    customerId: text('customer_id').notNull(),
    /** active | trialing | past_due | paused | canceled */
    status: text('status').notNull(),
    priceId: text('price_id').notNull(),
    productId: text('product_id').notNull(),
    /** cancel | pause | resume. Informational only: a scheduled change never revokes access. */
    scheduledChangeAction: text('scheduled_change_action'),
    scheduledChangeAt: timestamptz('scheduled_change_at'),
    eventAt: timestamptz('event_at').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'subscriptions_customer_id_fkey',
      columns: [t.customerId],
      foreignColumns: [customers.customerId],
    }),
    index('subscriptions_customer_id_idx').on(t.customerId),
  ],
);

/** Completed transactions. `lifetime` marks a one-time Pro lifetime purchase. */
export const transactions = pgTable(
  'transactions',
  {
    /** Paddle "txn_..." */
    transactionId: text('transaction_id').primaryKey(),
    customerId: text('customer_id').notNull(),
    subscriptionId: text('subscription_id'),
    priceId: text('price_id').notNull(),
    productId: text('product_id').notNull(),
    lifetime: boolean('lifetime').notNull(),
    completedAt: timestamptz('completed_at').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    /** Set by an approved full refund or chargeback. */
    refundedAt: timestamptz('refunded_at'),
  },
  (t) => [
    foreignKey({
      name: 'transactions_customer_id_fkey',
      columns: [t.customerId],
      foreignColumns: [customers.customerId],
    }),
    index('transactions_customer_id_idx').on(t.customerId),
  ],
);

/** One license key per customer. Whether it unlocks Pro is derived from the tables above. */
export const licenses = pgTable(
  'licenses',
  {
    licenseKey: text('license_key').primaryKey(),
    customerId: text('customer_id').notNull(),
    /** Null until the key email was accepted. */
    emailedAt: timestamptz('emailed_at'),
    /** Set by hand, e.g. for a key shared publicly. */
    revokedAt: timestamptz('revoked_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'licenses_customer_id_fkey',
      columns: [t.customerId],
      foreignColumns: [customers.customerId],
    }),
    unique('licenses_customer_id_key').on(t.customerId),
  ],
);
