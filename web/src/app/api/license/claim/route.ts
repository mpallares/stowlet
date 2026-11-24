import { claimLicenseByTransaction } from '@/server/billing/store';
import { getDb } from '@/server/db';
import { logFailure } from '@/server/log';

export const runtime = 'nodejs';

const TRANSACTION_ID = /^txn_[a-z\d]{26}$/;
/** How long after a purchase the welcome page may still fetch the key. */
const CLAIM_WINDOW_MINUTES = 30;
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Lets the welcome page show the key for the checkout that just finished in this browser.
 * 404 means "not yet": the webhook may not have arrived, so the page retries.
 */
export async function GET(request: Request): Promise<Response> {
  const transactionId = new URL(request.url).searchParams.get('transaction') ?? '';
  if (!TRANSACTION_ID.test(transactionId)) {
    return Response.json({ error: 'Bad transaction' }, { status: 400, headers: NO_STORE });
  }
  try {
    const key = await claimLicenseByTransaction(getDb(), transactionId, CLAIM_WINDOW_MINUTES);
    if (!key) return Response.json({ status: 'pending' }, { status: 404, headers: NO_STORE });
    return Response.json({ key }, { headers: NO_STORE });
  } catch (error) {
    logFailure('license.claim.failed', error);
    return Response.json({ error: 'Unavailable' }, { status: 503, headers: NO_STORE });
  }
}
