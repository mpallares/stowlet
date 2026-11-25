import { beforeEach, describe, expect, it } from 'vitest';
import { resolveTier } from '@/server/billing/access';
import { createPortalUrl } from '@/server/billing/portal';
import { claimLicenseByTransaction, findEntitlement } from '@/server/billing/store';
import { handleWebhookRequest } from '@/server/billing/webhookRequest';
import {
  CUSTOMER,
  type Harness,
  SUBSCRIPTION,
  adjustmentEvent,
  createHarness,
  customerEvent,
  signedRequest,
  subscriptionEvent,
  transactionCompletedEvent,
} from './helpers';

let h: Harness;
beforeEach(async () => {
  h = await createHarness();
});

const deliver = (payload: object) => handleWebhookRequest(signedRequest(payload), h.deps);
const count = async (table: string) =>
  Number((await h.db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM ${table}`))[0]?.n);
const onlyKey = async () =>
  (await h.db.query<{ license_key: string }>('SELECT license_key FROM licenses'))[0]?.license_key ??
  '';
const tier = async () => resolveTier(await findEntitlement(h.db, await onlyKey()));

const T0 = '2026-11-24T12:21:08Z';
const T1 = '2026-11-24T12:21:13Z';
const T2 = '2026-11-24T12:21:14Z';
const T3 = '2026-12-01T09:00:00Z';
const T4 = '2027-11-24T12:21:13Z';

async function buySubscription() {
  expect((await deliver(customerEvent('customer.created', T0))).status).toBe(200);
  expect((await deliver(subscriptionEvent('subscription.created', T1))).status).toBe(200);
  expect((await deliver(transactionCompletedEvent(T2))).status).toBe(200);
}

describe('signature verification', () => {
  it('rejects a wrong secret without a 2xx and writes nothing', async () => {
    const response = await handleWebhookRequest(
      signedRequest(customerEvent('customer.created', T0), 'pdl_ntfset_wrong'),
      h.deps,
    );
    expect(response.status).toBe(500);
    expect(await count('customers')).toBe(0);
  });

  it('rejects a body altered after signing', async () => {
    const signed = signedRequest(customerEvent('customer.created', T0));
    const tampered = new Request(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: (await signed.text()).replace('buyer@', 'thief@'),
    });
    expect((await handleWebhookRequest(tampered, h.deps)).status).toBe(500);
    expect(await count('customers')).toBe(0);
  });

  it('answers 400 when the signature header is missing', async () => {
    const request = new Request('https://stowlet.test/api/paddle/webhook', {
      method: 'POST',
      body: JSON.stringify(customerEvent('customer.created', T0)),
    });
    expect((await handleWebhookRequest(request, h.deps)).status).toBe(400);
  });
});

describe('subscription purchase', () => {
  it('mirrors customer, subscription and transaction, issues one key and emails it', async () => {
    await buySubscription();
    expect(await count('customers')).toBe(1);
    expect(await count('subscriptions')).toBe(1);
    expect(await count('transactions')).toBe(1);
    expect(await count('licenses')).toBe(1);
    expect(h.emails).toEqual([{ to: 'buyer@example.test', key: await onlyKey() }]);
    expect(await tier()).toBe('pro');
  });

  it('is idempotent when Paddle redelivers every event', async () => {
    await buySubscription();
    const key = await onlyKey();
    await buySubscription();
    expect(await count('subscriptions')).toBe(1);
    expect(await count('transactions')).toBe(1);
    expect(await count('licenses')).toBe(1);
    expect(await onlyKey()).toBe(key);
    expect(h.emails).toHaveLength(1);
  });

  it('keeps one key per customer across renewals', async () => {
    await buySubscription();
    await deliver(
      transactionCompletedEvent(T4, { transactionId: 'txn_01testrenewal0000000000000' }),
    );
    expect(await count('transactions')).toBe(2);
    expect(await count('licenses')).toBe(1);
    expect(h.emails).toHaveLength(1);
  });

  it('answers non-2xx when the email fails, then sends it on redelivery', async () => {
    await deliver(customerEvent('customer.created', T0));
    h.failEmail(true);
    expect((await deliver(transactionCompletedEvent(T2))).status).toBe(500);
    expect(await count('licenses')).toBe(1);
    expect(h.emails).toHaveLength(0);

    h.failEmail(false);
    expect((await deliver(transactionCompletedEvent(T2))).status).toBe(200);
    expect(h.emails).toHaveLength(1);
    expect(await count('licenses')).toBe(1);
  });
});

describe('ordering', () => {
  it('handles a transaction that arrives before its customer event', async () => {
    expect((await deliver(transactionCompletedEvent(T2))).status).toBe(200);
    expect(h.customerLookups).toEqual([CUSTOMER]);
    expect(h.emails[0]?.to).toBe('looked-up@example.test');

    // The real customer event then replaces the looked-up row.
    await deliver(customerEvent('customer.created', T0));
    const rows = await h.db.query<{ email: string }>('SELECT email FROM customers');
    expect(rows).toEqual([{ email: 'buyer@example.test' }]);
  });

  it('does not let an older event overwrite newer subscription state', async () => {
    await deliver(customerEvent('customer.created', T0));
    await deliver(subscriptionEvent('subscription.canceled', T4, { status: 'canceled' }));
    await deliver(subscriptionEvent('subscription.created', T1));
    const rows = await h.db.query<{ status: string }>('SELECT status FROM subscriptions');
    expect(rows).toEqual([{ status: 'canceled' }]);
  });

  it('does not let an older customer event overwrite a newer email', async () => {
    await deliver(customerEvent('customer.updated', T3, 'new@example.test'));
    await deliver(customerEvent('customer.created', T0, 'old@example.test'));
    const rows = await h.db.query<{ email: string }>('SELECT email FROM customers');
    expect(rows).toEqual([{ email: 'new@example.test' }]);
  });
});

describe('access through the subscription lifecycle', () => {
  it('keeps Pro while a cancellation is only scheduled, and ends it when canceled', async () => {
    await buySubscription();
    await deliver(
      subscriptionEvent('subscription.updated', T3, {
        scheduledChange: { action: 'cancel', effective_at: T4, resume_at: null },
      }),
    );
    const rows = await h.db.query<{ status: string; scheduled_change_action: string }>(
      'SELECT status, scheduled_change_action FROM subscriptions',
    );
    expect(rows).toEqual([{ status: 'active', scheduled_change_action: 'cancel' }]);
    expect(await tier()).toBe('pro');

    await deliver(subscriptionEvent('subscription.canceled', T4, { status: 'canceled' }));
    expect(await tier()).toBe('free');
  });

  it('keeps Pro on past_due and removes it while paused', async () => {
    await buySubscription();
    await deliver(subscriptionEvent('subscription.updated', T3, { status: 'past_due' }));
    expect(await tier()).toBe('pro');
    await deliver(subscriptionEvent('subscription.updated', T4, { status: 'paused' }));
    expect(await tier()).toBe('free');
  });
});

describe('lifetime purchase', () => {
  it('grants Pro with no subscription, and a revoked key loses it', async () => {
    await deliver(customerEvent('customer.created', T0));
    await deliver(transactionCompletedEvent(T2, { lifetime: true }));
    expect(await count('subscriptions')).toBe(0);
    expect(await tier()).toBe('pro');

    await h.db.query('UPDATE licenses SET revoked_at = NOW()');
    expect(await tier()).toBe('free');
  });
});

describe('refunds and chargebacks', () => {
  const RENEWAL = 'txn_01testrenewal0000000000000';

  it('ends Pro when a lifetime purchase is refunded, and is idempotent', async () => {
    await deliver(customerEvent('customer.created', T0));
    await deliver(transactionCompletedEvent(T2, { lifetime: true }));
    expect(await tier()).toBe('pro');

    expect((await deliver(adjustmentEvent('adjustment.updated', T3))).status).toBe(200);
    expect(await tier()).toBe('free');

    await deliver(adjustmentEvent('adjustment.updated', T4));
    const rows = await h.db.query<{ refunded_at: Date }>('SELECT refunded_at FROM transactions');
    expect(rows[0]?.refunded_at.toISOString()).toBe(new Date(T3).toISOString());
    // The key still exists, so the customer can reach their invoices and buy again.
    expect((await findEntitlement(h.db, await onlyKey()))?.revoked).toBe(false);
  });

  it('ends Pro when the latest subscription payment is refunded, until the next payment', async () => {
    await buySubscription();
    await deliver(adjustmentEvent('adjustment.created', T3));
    expect(await tier()).toBe('free');

    await deliver(transactionCompletedEvent(T4, { transactionId: RENEWAL }));
    expect(await tier()).toBe('pro');
  });

  it('keeps Pro when an older payment is refunded but a later one stands', async () => {
    await buySubscription();
    await deliver(transactionCompletedEvent(T4, { transactionId: RENEWAL }));
    await deliver(adjustmentEvent('adjustment.created', T4));
    expect(await tier()).toBe('pro');
  });

  it('treats a chargeback like a refund', async () => {
    await buySubscription();
    await deliver(adjustmentEvent('adjustment.created', T3, { action: 'chargeback' }));
    expect(await tier()).toBe('free');
  });

  it.each([
    ['a refund still pending approval', { status: 'pending_approval' }],
    ['a rejected refund', { status: 'rejected' }],
    ['a partial refund', { kind: 'partial' as const }],
    ['a credit', { action: 'credit' }],
    ['a chargeback warning', { action: 'chargeback_warning' }],
  ])('keeps Pro for %s', async (_name, options) => {
    await buySubscription();
    expect((await deliver(adjustmentEvent('adjustment.created', T3, options))).status).toBe(200);
    expect(await tier()).toBe('pro');
  });

  it('acknowledges a refund for a transaction it never recorded', async () => {
    await buySubscription();
    const response = await deliver(
      adjustmentEvent('adjustment.created', T3, {
        transactionId: 'txn_01unknown00000000000000000',
      }),
    );
    expect(response.status).toBe(200);
    expect(await tier()).toBe('pro');
  });

  it('stops the welcome page handing out the key for a refunded transaction', async () => {
    await buySubscription();
    await deliver(adjustmentEvent('adjustment.created', T3));
    expect(await claimLicenseByTransaction(h.db, 'txn_01testtransaction000000000', 30)).toBeNull();
  });
});

describe('other events', () => {
  it('acknowledges event types it does not handle', async () => {
    const payload = { ...customerEvent('customer.created', T0), event_type: 'address.created' };
    expect((await deliver(payload)).status).toBe(200);
    expect(await count('customers')).toBe(0);
  });
});

describe('welcome-page claim', () => {
  it('returns the key for a fresh transaction only', async () => {
    await buySubscription();
    const txn = 'txn_01testtransaction000000000';
    expect(await claimLicenseByTransaction(h.db, txn, 30)).toBe(await onlyKey());
    expect(await claimLicenseByTransaction(h.db, 'txn_01unknown00000000000000000', 30)).toBeNull();

    await h.db.query(`UPDATE transactions SET created_at = NOW() - INTERVAL '31 minutes'`);
    expect(await claimLicenseByTransaction(h.db, txn, 30)).toBeNull();
  });
});

describe('billing portal', () => {
  it('mints a session for the customer behind the key, with their subscriptions', async () => {
    await buySubscription();
    const calls: { customerId: string; subscriptionIds: string[] }[] = [];
    const result = await createPortalUrl(` ${(await onlyKey()).toLowerCase()} `, {
      db: h.db,
      createSession: (customerId, subscriptionIds) => {
        calls.push({ customerId, subscriptionIds });
        return Promise.resolve('https://portal.example.test/session');
      },
    });
    expect(result).toEqual({ url: 'https://portal.example.test/session' });
    expect(calls).toEqual([{ customerId: CUSTOMER, subscriptionIds: [SUBSCRIPTION] }]);
  });

  it.each(['', 'not-a-key', 'STOW-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ', CUSTOMER, null])(
    'never calls Paddle for %j',
    async (submitted) => {
      await buySubscription();
      let called = false;
      const result = await createPortalUrl(submitted, {
        db: h.db,
        createSession: () => {
          called = true;
          return Promise.resolve('unreachable');
        },
      });
      expect(result).toEqual({ error: 'unknown-key' });
      expect(called).toBe(false);
    },
  );
});
