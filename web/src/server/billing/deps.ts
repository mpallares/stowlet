import { PADDLE_PRICE_IDS } from '@/config';
import { paddleEnvironment } from '@/lib/paddle';
import { getDb } from '../db';
import { requireEnv } from '../env';
import { getPaddle } from '../paddle';
import { sendLicenseEmail } from './email';
import { generateLicenseKey } from './licenseKey';
import type { WebhookRequestDeps } from './webhookRequest';

/** Production wiring for the webhook: real database, Paddle SDK and email. */
export function webhookDeps(): WebhookRequestDeps {
  const paddle = getPaddle();
  const ids = PADDLE_PRICE_IDS[paddleEnvironment()];
  return {
    db: getDb(),
    webhookSecret: requireEnv('PADDLE_NOTIFICATION_WEBHOOK_SECRET'),
    unmarshal: (rawBody, secret, signature) =>
      paddle.webhooks.unmarshal(rawBody, secret, signature),
    lifetimePriceIds: new Set([ids.lifetime, ids.lifetimeFounding]),
    fetchCustomerEmail: async (customerId) => (await paddle.customers.get(customerId)).email,
    sendLicenseEmail,
    generateLicenseKey,
    cancelSubscription: async (subscriptionId) => {
      await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: 'immediately' });
    },
  };
}
