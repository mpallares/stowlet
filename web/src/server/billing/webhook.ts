import {
  type AdjustmentCreatedEvent,
  type AdjustmentUpdatedEvent,
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
  markTransactionRefunded,
  subscriptionToCancelAfterRefund,
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
  /** Cancels a subscription in Paddle with immediate effect. */
  cancelSubscription: (subscriptionId: string) => Promise<void>;
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
    case EventName.AdjustmentCreated:
    case EventName.AdjustmentUpdated:
      return handleAdjustment(event, deps);
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

/**
 * A refund or chargeback takes back what the transaction bought, and cancels the subscription
 * it paid for when that was the subscription's latest payment. Only an approved, full one
 * counts: a pending refund may still be rejected, and a partial refund is a price adjustment.
 */
async function handleAdjustment(
  event: AdjustmentCreatedEvent | AdjustmentUpdatedEvent,
  deps: WebhookDeps,
): Promise<void> {
  const adj = event.data;
  const takesBack = adj.action === 'refund' || adj.action === 'chargeback';
  if (!takesBack || adj.status !== 'approved' || adj.type !== 'full') {
    logEvent('webhook.adjustment.ignored', { adjustment: adj.id, action: adj.action });
    return;
  }
  const known = await markTransactionRefunded(deps.db, adj.transactionId, event.occurredAt);
  logEvent(known ? 'license.refunded' : 'webhook.adjustment.unknown-transaction', {
    adjustment: adj.id,
    transaction: adj.transactionId,
  });
  if (!known) return;

  // A refund does not stop the subscription in Paddle: left alone it would bill again at the
  // next renewal. Access is already off above; if this call fails we throw, Paddle redelivers,
  // and the cancel is tried again. Once Paddle's subscription.canceled event has been mirrored,
  // a redelivery finds nothing left to cancel.
  const subscriptionId = await subscriptionToCancelAfterRefund(deps.db, adj.transactionId);
  if (subscriptionId) {
    await deps.cancelSubscription(subscriptionId);
    logEvent('subscription.canceled-after-refund', { subscription: subscriptionId });
  }
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
