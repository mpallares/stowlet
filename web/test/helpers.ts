import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Paddle } from '@paddle/paddle-node-sdk';
import type { WebhookRequestDeps } from '@/server/billing/webhookRequest';
import type { Db } from '@/server/db';

export const SECRET = 'pdl_ntfset_test_secret';
export const LIFETIME_PRICE = 'pri_01testlifetime0000000000000';
export const ANNUAL_PRICE = 'pri_01testannual00000000000000';
export const CUSTOMER = 'ctm_01testcustomer000000000000';
export const SUBSCRIPTION = 'sub_01testsubscription00000000';

/** In-process Postgres loaded with the real schema file. */
export async function createTestDb(): Promise<Db> {
  const pg = new PGlite();
  await pg.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  return {
    async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
      return (await pg.query<T>(text, params)).rows;
    },
  };
}

export interface Harness {
  db: Db;
  deps: () => WebhookRequestDeps;
  emails: { to: string; key: string }[];
  customerLookups: string[];
  failEmail: (fail: boolean) => void;
}

/** Real signature verification (Paddle SDK) and real SQL; only email and the Paddle API are faked. */
export async function createHarness(): Promise<Harness> {
  const db = await createTestDb();
  const paddle = new Paddle('unused-in-tests');
  const emails: Harness['emails'] = [];
  const customerLookups: string[] = [];
  let emailFails = false;
  let counter = 0;
  const resolved: WebhookRequestDeps = {
    db,
    webhookSecret: SECRET,
    unmarshal: (rawBody, secret, signature) =>
      paddle.webhooks.unmarshal(rawBody, secret, signature),
    lifetimePriceIds: new Set([LIFETIME_PRICE]),
    fetchCustomerEmail: (customerId) => {
      customerLookups.push(customerId);
      return Promise.resolve('looked-up@example.test');
    },
    sendLicenseEmail: (to, key) => {
      if (emailFails) return Promise.reject(new Error('email-down'));
      emails.push({ to, key });
      return Promise.resolve();
    },
    generateLicenseKey: () => `STOW-AAAAA-AAAAA-AAAAA-AAAAA-${String(counter++).padStart(5, '0')}`,
  };
  return {
    db,
    deps: () => resolved,
    emails,
    customerLookups,
    failEmail: (fail) => {
      emailFails = fail;
    },
  };
}

/** Builds a request signed exactly the way Paddle signs deliveries. */
export function signedRequest(payload: object, secret = SECRET): Request {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return new Request('https://stowlet.test/api/paddle/webhook', {
    method: 'POST',
    headers: { 'paddle-signature': `ts=${ts};h1=${h1}`, 'content-type': 'application/json' },
    body,
  });
}

let eventCounter = 0;
function envelope(eventType: string, occurredAt: string, data: object) {
  eventCounter += 1;
  return {
    event_id: `evt_01test${String(eventCounter).padStart(20, '0')}`,
    event_type: eventType,
    occurred_at: occurredAt,
    notification_id: `ntf_01test${String(eventCounter).padStart(20, '0')}`,
    data,
  };
}

// The payloads below follow the shape of real sandbox deliveries.

export function customerEvent(
  type: 'customer.created' | 'customer.updated',
  occurredAt: string,
  email = 'buyer@example.test',
  customerId = CUSTOMER,
) {
  return envelope(type, occurredAt, {
    id: customerId,
    name: null,
    email,
    marketing_consent: false,
    status: 'active',
    custom_data: null,
    locale: 'en',
    created_at: occurredAt,
    updated_at: occurredAt,
    import_meta: null,
  });
}

function price(id: string, recurring: boolean) {
  return {
    id,
    name: recurring ? 'Annual' : 'Lifetime',
    type: 'standard',
    status: 'active',
    quantity: { minimum: 1, maximum: 1 },
    tax_mode: 'location',
    created_at: '2026-11-24T10:15:52.117Z',
    updated_at: '2026-11-24T10:15:52.117Z',
    product_id: recurring ? 'pro_01testsubscription00000000' : 'pro_01testlifetime000000000000',
    unit_price: { amount: recurring ? '4900' : '9900', currency_code: 'USD' },
    custom_data: null,
    description: 'test price',
    import_meta: null,
    trial_period: null,
    billing_cycle: recurring ? { interval: 'year', frequency: 1 } : null,
    unit_price_overrides: [],
  };
}

export function subscriptionEvent(
  type: 'subscription.created' | 'subscription.updated' | 'subscription.canceled',
  occurredAt: string,
  overrides: {
    status?: string;
    scheduledChange?: { action: string; effective_at: string; resume_at: string | null } | null;
    customerId?: string;
  } = {},
) {
  return envelope(type, occurredAt, {
    id: SUBSCRIPTION,
    status: overrides.status ?? 'active',
    customer_id: overrides.customerId ?? CUSTOMER,
    address_id: 'add_01testaddress0000000000000',
    business_id: null,
    currency_code: 'USD',
    created_at: '2026-11-24T12:21:13.612Z',
    updated_at: occurredAt,
    started_at: '2026-11-24T12:21:13.096368Z',
    first_billed_at: '2026-11-24T12:21:13.096368Z',
    next_billed_at: '2027-11-24T12:21:13.096368Z',
    paused_at: null,
    canceled_at: null,
    discount: null,
    collection_mode: 'automatic',
    billing_details: null,
    current_billing_period: {
      starts_at: '2026-11-24T12:21:13.096368Z',
      ends_at: '2027-11-24T12:21:13.096368Z',
    },
    billing_cycle: { interval: 'year', frequency: 1 },
    scheduled_change: overrides.scheduledChange ?? null,
    items: [
      {
        price: price(ANNUAL_PRICE, true),
        status: 'active',
        quantity: 1,
        recurring: true,
        created_at: '2026-11-24T12:21:13.612Z',
        updated_at: '2026-11-24T12:21:13.612Z',
        trial_dates: null,
        next_billed_at: '2027-11-24T12:21:13.096368Z',
        previously_billed_at: '2026-11-24T12:21:13.096368Z',
      },
    ],
    custom_data: null,
    import_meta: null,
  });
}

export function adjustmentEvent(
  type: 'adjustment.created' | 'adjustment.updated',
  occurredAt: string,
  options: {
    transactionId?: string;
    action?: string;
    status?: string;
    kind?: 'full' | 'partial';
  } = {},
) {
  const totals = { subtotal: '4900', tax: '0', total: '4900' };
  return envelope(type, occurredAt, {
    id: 'adj_01testadjustment0000000000',
    action: options.action ?? 'refund',
    type: options.kind ?? 'full',
    transaction_id: options.transactionId ?? 'txn_01testtransaction000000000',
    subscription_id: null,
    customer_id: CUSTOMER,
    reason: 'requested by customer',
    credit_applied_to_balance: null,
    currency_code: 'USD',
    status: options.status ?? 'approved',
    items: [
      {
        id: 'adjitm_01testitem00000000000000',
        item_id: 'txnitm_01testitem00000000000000',
        type: options.kind ?? 'full',
        amount: '4900',
        proration: null,
        totals,
      },
    ],
    totals: { ...totals, fee: '317', earnings: '-4583', currency_code: 'USD' },
    payout_totals: null,
    tax_rates_used: [{ tax_rate: '0', totals }],
    created_at: occurredAt,
    updated_at: occurredAt,
  });
}

export function transactionCompletedEvent(
  occurredAt: string,
  options: { lifetime?: boolean; transactionId?: string; customerId?: string } = {},
) {
  const lifetime = options.lifetime ?? false;
  const totals = { tax: '0', total: '4900', discount: '0', subtotal: '4900' };
  const fullTotals = {
    ...totals,
    fee: '317',
    credit: '0',
    balance: '0',
    earnings: '4583',
    grand_total: '4900',
    currency_code: 'USD',
    grand_total_tax: '0',
    credit_to_balance: '0',
  };
  return envelope('transaction.completed', occurredAt, {
    id: options.transactionId ?? 'txn_01testtransaction000000000',
    status: 'completed',
    customer_id: options.customerId ?? CUSTOMER,
    address_id: 'add_01testaddress0000000000000',
    business_id: null,
    custom_data: null,
    currency_code: 'USD',
    origin: 'web',
    subscription_id: lifetime ? null : SUBSCRIPTION,
    invoice_id: 'inv_01testinvoice0000000000000',
    invoice_number: '1-10001',
    collection_mode: 'automatic',
    discount_id: null,
    billing_details: null,
    billing_period: null,
    items: [
      {
        price: price(lifetime ? LIFETIME_PRICE : ANNUAL_PRICE, !lifetime),
        quantity: 1,
        proration: null,
      },
    ],
    details: {
      totals: fullTotals,
      line_items: [],
      payout_totals: { ...fullTotals, fee_rate: '0.05', exchange_rate: '1' },
      tax_rates_used: [{ totals, tax_rate: '0' }],
      adjusted_totals: { ...fullTotals, retained_fee: '0' },
    },
    payments: [],
    checkout: { url: null },
    created_at: occurredAt,
    updated_at: occurredAt,
    billed_at: occurredAt,
    revised_at: null,
  });
}
