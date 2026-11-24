import { createPortalUrl } from '@/server/billing/portal';
import { getDb } from '@/server/db';
import { logFailure } from '@/server/log';
import { getPaddle } from '@/server/paddle';

export const runtime = 'nodejs';

function back(request: Request, error: string): Response {
  return Response.redirect(new URL(`/account?error=${error}`, request.url), 303);
}

/** Form target of /account: license key in, redirect to a fresh Paddle customer portal session. */
export async function POST(request: Request): Promise<Response> {
  let submitted: unknown;
  try {
    submitted = (await request.formData()).get('key');
  } catch {
    return back(request, 'unknown-key');
  }

  try {
    const result = await createPortalUrl(submitted, {
      db: getDb(),
      createSession: async (customerId, subscriptionIds) => {
        const session = await getPaddle().customerPortalSessions.create(
          customerId,
          subscriptionIds,
        );
        return session.urls.general.overview;
      },
    });
    if ('error' in result) return back(request, result.error);
    // Portal URLs are single-use and short-lived: redirect straight away, never cache.
    return new Response(null, {
      status: 303,
      headers: { Location: result.url, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logFailure('portal.failed', error);
    return back(request, 'unavailable');
  }
}
