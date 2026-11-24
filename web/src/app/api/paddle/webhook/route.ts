import { webhookDeps } from '@/server/billing/deps';
import { handleWebhookRequest } from '@/server/billing/webhookRequest';

export const runtime = 'nodejs';

/** Paddle notification destination. Verification and processing live in server/billing. */
export function POST(request: Request): Promise<Response> {
  return handleWebhookRequest(request, webhookDeps);
}
