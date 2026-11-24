import { CHROME_WEB_STORE_URL, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/config';
import { requireEnv } from '../env';

/**
 * Sends the license key through Resend's HTTP API. Throws on any failure so the webhook
 * answers non-2xx and Paddle redelivers; the error never contains the address or the key.
 */
export async function sendLicenseEmail(to: string, licenseKey: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: requireEnv('LICENSE_EMAIL_FROM'),
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject: `Your ${SITE_NAME} Pro license key`,
      text: [
        `Thank you for buying ${SITE_NAME} Pro.`,
        '',
        'Your license key:',
        '',
        `    ${licenseKey}`,
        '',
        'To turn Pro on:',
        `1. Install the extension if you have not already: ${CHROME_WEB_STORE_URL}`,
        `2. Click the ${SITE_NAME} icon in the Chrome toolbar.`,
        '3. Paste the key into the license field and click Save.',
        '',
        `Manage your subscription, payment method and invoices: ${SITE_URL}/account`,
        `Help: ${SITE_URL}/support or reply to this email.`,
      ].join('\n'),
    }),
    // Paddle waits 5 s for the webhook response; leave room for the database work.
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error(`license-email-rejected-${response.status}`);
}
