// DRAFT FOR LEGAL REVIEW. Governing law and entity name are placeholders in src/config.ts.
import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import {
  COMPANY_NAME,
  GOVERNING_LAW,
  LEGAL_LAST_UPDATED,
  SITE_NAME,
  SUPPORT_EMAIL,
} from '@/config';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: `License scope, refunds and warranty for the ${SITE_NAME} extension.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <PageShell prose>
      <h1>Terms of service</h1>
      <p>
        Last updated {LEGAL_LAST_UPDATED}. These terms apply to the {SITE_NAME} Chrome extension and
        to Pro licenses sold on this site by {COMPANY_NAME} (&quot;we&quot;). Installing the
        extension or buying a license means you accept them.
      </p>

      <h2>1. The software</h2>
      <p>
        {SITE_NAME} is a browser extension that organises, searches and exports conversations you
        have on third-party chat services. We are not affiliated with OpenAI, Anthropic, Google or
        xAI. Those services may change at any time in ways that stop features of the extension from
        working until we ship an update.
      </p>

      <h2>2. Free tier</h2>
      <p>
        The free tier may be used without payment for as long as we offer it, subject to the limits
        shown on the pricing section of this site.
      </p>

      <h2>3. Pro license</h2>
      <ul>
        <li>
          A Pro license key is for one person. You may use it on every Chrome profile and computer
          you personally use. Sharing or reselling a key is not allowed.
        </li>
        <li>
          A monthly or annual subscription unlocks Pro features and updates while it is active. If
          it is cancelled or not renewed, the extension returns to the free tier; your folders and
          data stay on your device.
        </li>
        <li>
          A lifetime license unlocks Pro features, including support for assistants added later, and
          all future updates of the extension for as long as we distribute it. It is a license to
          the software, not a guarantee that the software will exist forever or support any
          particular chat service.
        </li>
        <li>We may revoke a key that is shared publicly, obtained fraudulently or charged back.</li>
      </ul>

      <h2>4. Payments and refunds</h2>
      <p>
        Purchases are processed by Lemon Squeezy, which acts as merchant of record. Its terms and
        privacy policy apply to the checkout. Refunds are available within 14 days of purchase.
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order number and we
        will issue the refund through Lemon Squeezy. After a refund the license key stops working.
      </p>

      <h2>5. Your data</h2>
      <p>
        The extension stores your data in your browser. We do not receive it. See the{' '}
        <a href="/privacy">privacy policy</a>. You are responsible for keeping your own backups, for
        example by exporting conversations.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Use the extension only with accounts you own and in accordance with the terms of the chat
        services you use it with. Do not reverse-engineer the license mechanism or distribute
        modified builds under the {SITE_NAME} name.
      </p>

      <h2>7. No warranty</h2>
      <p>
        The extension is provided &quot;as is&quot; without warranty of any kind, express or
        implied, including fitness for a particular purpose and non-infringement. We do not warrant
        that it will be error-free or uninterrupted, or that it will keep working with any
        third-party service.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by law, our total liability for any claim relating to the extension
        or a license is limited to the amount you paid us in the twelve months before the claim. We
        are not liable for indirect, incidental or consequential damages, including lost data.
        Nothing in these terms limits liability that cannot be limited under applicable law,
        including statutory consumer rights.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms. The date at the top shows the current version. Continued use
        after a change means you accept the new terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-law
        rules. Consumers keep the protection of mandatory law in their country of residence.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </PageShell>
  );
}
