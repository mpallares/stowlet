import type { EventEntity } from '@paddle/paddle-node-sdk';
import { logFailure } from '../log';
import { processEvent, type WebhookDeps } from './webhook';

export interface WebhookRequestDeps extends WebhookDeps {
  /** The notification destination's signing secret. Not the API key. */
  webhookSecret: string;
  /** Verifies the signature against the raw body and returns the typed event; throws if invalid. */
  unmarshal: (rawBody: string, secret: string, signature: string) => Promise<EventEntity>;
}

/**
 * The whole webhook exchange, independent of Next.js so it can be tested with real signatures.
 * Only a fully processed, verified event answers 2xx; everything else is retried by Paddle.
 */
export async function handleWebhookRequest(
  request: Request,
  deps: () => WebhookRequestDeps,
): Promise<Response> {
  const signature = request.headers.get('paddle-signature') ?? '';
  // The raw text is what Paddle signed. Parsing it first would break verification.
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return Response.json({ error: 'Missing signature or body' }, { status: 400 });
  }

  try {
    const resolved = deps();
    const event = await resolved.unmarshal(rawBody, resolved.webhookSecret, signature);
    await processEvent(event, resolved);
    return Response.json({ received: true });
  } catch (error) {
    // A bad signature and a failing handler are indistinguishable to the sender on purpose.
    logFailure('webhook.failed', error);
    return Response.json({ error: 'Webhook not processed' }, { status: 500 });
  }
}
