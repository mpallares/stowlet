import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { SITE_NAME, SUPPORT_EMAIL, mailto } from '@/config';

export const metadata: Metadata = {
  title: 'Manage your purchase',
  description: `Update your payment method, cancel or download invoices for ${SITE_NAME} Pro.`,
  alternates: { canonical: '/account' },
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  'unknown-key': 'That license key was not recognised. Check it against the email we sent you.',
  unavailable: 'The billing portal could not be opened just now. Please try again in a minute.',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERRORS[error] : undefined;

  return (
    <PageShell prose>
      <h1>Manage your purchase</h1>
      <p>
        Enter your license key to open the billing portal, where you can update your payment method,
        cancel a subscription and download invoices. The portal is run by Paddle, our payment
        provider.
      </p>

      {message ? (
        <p role="alert" data-testid="account-error" className="text-red-400">
          {message}
        </p>
      ) : null}

      <form method="post" action="/api/portal" className="not-prose mt-6 flex flex-col gap-3">
        <label htmlFor="license-key" className="text-sm font-medium">
          License key
        </label>
        <input
          id="license-key"
          name="key"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="STOW-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
          data-testid="account-key"
          className="min-h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-4 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        />
        <button
          type="submit"
          data-testid="account-submit"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center self-start rounded-xl bg-orange-500 px-5 text-sm font-medium text-neutral-950 hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          Open billing portal
        </button>
      </form>

      <p>
        Lost your key? Email <a href={mailto(`${SITE_NAME} license key`)}>{SUPPORT_EMAIL}</a> from
        the address you bought with. More help is on the <Link href="/support">support page</Link>.
      </p>
    </PageShell>
  );
}
