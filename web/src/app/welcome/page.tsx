import type { Metadata } from 'next';
import Link from 'next/link';
import { LicenseKeyReveal } from '@/components/LicenseKeyReveal';
import { PageShell } from '@/components/PageShell';
import { CHROME_WEB_STORE_URL, SITE_NAME, SUPPORT_EMAIL, mailto } from '@/config';

export const metadata: Metadata = {
  title: 'Thank you',
  description: `Your ${SITE_NAME} Pro purchase went through.`,
  alternates: { canonical: '/welcome' },
  robots: { index: false, follow: false },
};

/**
 * Where Paddle redirects after a successful checkout. Purely informational: the purchase is
 * recorded and the license issued by the Paddle webhook, never by this page.
 */
export default function WelcomePage() {
  return (
    <PageShell prose>
      <h1>Thank you for buying {SITE_NAME} Pro</h1>
      <p>Your payment went through.</p>
      <LicenseKeyReveal />
      <p>Two emails are also on their way to the address you used:</p>
      <ul>
        <li>a receipt from Paddle, our payment provider, and</li>
        <li>your license key from us, so you have it for later.</li>
      </ul>

      <h2>Turn Pro on</h2>
      <ol>
        <li>
          Install the extension from the <a href={CHROME_WEB_STORE_URL}>Chrome Web Store</a> if you
          have not already.
        </li>
        <li>Click the {SITE_NAME} icon in the Chrome toolbar.</li>
        <li>Paste the license key into the license field and click Save.</li>
      </ol>
      <p>
        The <Link href="/support">support page</Link> has the details. If the key has not arrived
        within a few minutes, check your spam folder, then email{' '}
        <a href={mailto(`${SITE_NAME} license key`)}>{SUPPORT_EMAIL}</a> with your order number.
      </p>
      <p>
        To change your payment method, cancel or download invoices later, use{' '}
        <Link href="/account">Manage your purchase</Link>.
      </p>
    </PageShell>
  );
}
