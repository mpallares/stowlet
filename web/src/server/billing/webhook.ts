import {
  type CustomerCreatedEvent,
  type CustomerUpdatedEvent,
  type EventEntity,
  EventName,
  type SubscriptionCanceledEvent,
  type SubscriptionCreatedEvent,
  type SubscriptionUpdatedEvent,
  type TransactionCompletedEvent,
} from '@paddle/paddle-node-sdk';
import type { Db } from '../db';
import { logEvent } from '../log';
import {
  ensureLicense,
  getCustomerEmail,
  markLicenseEmailed,
  recordTransaction,
  upsertCustomer,
  upsertSubscription,
} from './store';

export interface WebhookDeps {
  db: Db;
  /** Price IDs that are a one-time lifetime purchase in this Paddle environment. */
  lifetimePriceIds: ReadonlySet<string>;
  /** Looks a customer's email up in Paddle, for when their event has not arrived yet. */
  fetchCustomerEmail: (customerId: string) => Promise<string>;
  sendLicenseEmail: (to: string, licenseKey: string) => Promise<void>;
  generateLicenseKey: () => string;
}

/** Timestamp for rows written from an API lookup, so any real customer event supersedes them. */
const BEFORE_ANY_EVENT = '1970-01-01T00:00:00Z';

/**
 * Applies one verified Paddle event. Deliveries are at-least-once and unordered, so every
 * branch converges: running it twice, or after a newer event, leaves the same state.
 * Throwing makes the route answer non-2xx, which is how Paddle knows to redeliver.
 */
export async function processEvent(event: EventEntity, deps: WebhookDeps): Promise<void> {
  switch (event.eventType) {
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      return handleCustomer(event, deps);
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return handleSubscription(event, deps);
    case EventName.TransactionCompleted:
      return handleTransactionCompleted(event, deps);
    default:
      logEvent('webhook.ignored', { type: event.eventType });
  }
}

async function handleCustomer(
  event: CustomerCreatedEvent | CustomerUpdatedEvent,
  deps: WebhookDeps,
): Promise<void> {
  await upsertCustomer(deps.db, {
    customerId: event.data.id,
    email: event.data.email,
    eventAt: event.occurredAt,
  });
}

/** Subscription and transaction rows reference the customer, whose own event may come later. */
async function ensureCustomer(customerId: string, deps: WebhookDeps): Promise<string> {
  const known = await getCustomerEmail(deps.db, customerId);
  if (known !== null) return known;
  const email = await deps.fetchCustomerEmail(customerId);
  await upsertCustomer(deps.db, { customerId, email, eventAt: BEFORE_ANY_EVENT });
  return email;
}

async function handleSubscription(
  event: SubscriptionCreatedEvent | SubscriptionUpdatedEvent | SubscriptionCanceledEvent,
  deps: WebhookDeps,
): Promise<void> {
  const sub = event.data;
  const price = sub.items[0]?.price;
  if (!price) {
    logEvent('webhook.subscription.no-price', { subscription: sub.id });
    return;
  }
  await ensureCustomer(sub.customerId, deps);
  await upsertSubscription(deps.db, {
    subscriptionId: sub.id,
    customerId: sub.customerId,
    status: sub.status,
    priceId: price.id,
    productId: price.productId,
    scheduledChangeAction: sub.scheduledChange?.action ?? null,
    scheduledChangeAt: sub.scheduledChange?.effectiveAt ?? null,
    eventAt: event.occurredAt,
  });
}

async function handleTransactionCompleted(
  event: TransactionCompletedEvent,
  deps: WebhookDeps,
): Promise<void> {
  const txn = event.data;
  const price = txn.items[0]?.price;
  if (!txn.customerId || !price) {
    logEvent('webhook.transaction.incomplete', { transaction: txn.id });
    return;
  }
  const email = await ensureCustomer(txn.customerId, deps);
  await recordTransaction(deps.db, {
    transactionId: txn.id,
    customerId: txn.customerId,
    subscriptionId: txn.subscriptionId,
    priceId: price.id,
    productId: price.productId,
    lifetime: txn.items.some((i) => i.price !== null && deps.lifetimePriceIds.has(i.price.id)),
    completedAt: event.occurredAt,
  });

  // The key is stored before the email goes out. If sending fails we throw, Paddle
  // redelivers, the writes above are no-ops and only the email is attempted again.
  const license = await ensureLicense(deps.db, txn.customerId, deps.generateLicenseKey());
  if (!license.emailed) {
    await deps.sendLicenseEmail(email, license.licenseKey);
    await markLicenseEmailed(deps.db, txn.customerId);
    logEvent('license.emailed', { transaction: txn.id });
  }
}
