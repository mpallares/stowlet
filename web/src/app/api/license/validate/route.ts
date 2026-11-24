import { resolveTier } from '@/server/billing/access';
import { normalizeLicenseKey } from '@/server/billing/licenseKey';
import { findEntitlement } from '@/server/billing/store';
import { getDb } from '@/server/db';
import { logFailure } from '@/server/log';

export const runtime = 'nodejs';

// Called by the extension's background worker, whose origin is chrome-extension://<id>.
// The response carries no cookies or per-origin data, so any origin may read it.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

/** `{ key }` in, `{ valid, tier }` out. Reads only the local mirror, never the Paddle API. */
export async function POST(request: Request): Promise<Response> {
  let submitted: unknown;
  try {
    const body: unknown = await request.json();
    submitted = typeof body === 'object' && body !== null && 'key' in body ? body.key : undefined;
  } catch {
    return Response.json({ error: 'Expected JSON' }, { status: 400, headers: CORS });
  }

  const key = normalizeLicenseKey(submitted);
  if (!key) return Response.json({ valid: false, tier: 'free' }, { headers: CORS });

  try {
    const entitlement = await findEntitlement(getDb(), key);
    const valid = entitlement !== null && !entitlement.revoked;
    return Response.json({ valid, tier: resolveTier(entitlement) }, { headers: CORS });
  } catch (error) {
    // A 5xx tells the extension "could not check", so it keeps its last known tier.
    logFailure('license.validate.failed', error);
    return Response.json({ error: 'Unavailable' }, { status: 503, headers: CORS });
  }
}
