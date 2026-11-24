// DRAFT FOR LEGAL REVIEW. Not reviewed by a lawyer. Check the GDPR section, the
// controller identity and the retention statements before publishing.
import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { COMPANY_NAME, LEGAL_LAST_UPDATED, SITE_NAME, SUPPORT_EMAIL } from '@/config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `What the ${SITE_NAME} extension stores, what it sends, and the permissions it asks for.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <PageShell prose>
      <h1>Privacy policy</h1>
      <p>
        Last updated {LEGAL_LAST_UPDATED}. This policy covers the {SITE_NAME} Chrome extension and
        this website, both operated by {COMPANY_NAME} (&quot;we&quot;).
      </p>
      <p>
        The short version: the extension works inside your browser. It never sends your chats, their
        titles or your folders to us or to anyone else. The only data that leaves your browser is a
        license key, when you enter one.
      </p>

      <h2>What the extension stores, and where</h2>
      <p>
        Everything below is stored locally in your Chrome profile using the browser&apos;s own
        storage (IndexedDB and <code>chrome.storage</code>). We cannot read it.
      </p>
      <ul>
        <li>
          <strong>Folders, pins and tags</strong> you create, and which conversation belongs to
          which folder.
        </li>
        <li>
          <strong>Conversation metadata</strong>: the title, the vendor (ChatGPT or Claude), the
          conversation identifier, the last-modified time and a short preview used in search
          results.
        </li>
        <li>
          <strong>A search index</strong> built from the text of your conversations, so that search
          can match message content. The index is derived from your chats and stays on your device.
        </li>
        <li>
          <strong>Your license key</strong> and the resulting plan (free or Pro), in{' '}
          <code>chrome.storage.sync</code>. Chrome may sync this small value between your own
          signed-in Chrome profiles; that is Chrome&apos;s feature and is governed by Google&apos;s
          privacy policy.
        </li>
        <li>
          <strong>A cached copy of the configuration file</strong> described below, and whether the
          panel was last open or closed.
        </li>
      </ul>

      <h2>What the extension sends</h2>
      <h3>License validation</h3>
      <p>
        When you enter a license key in the extension, the key is sent to our license service to
        check that it is valid and which plan it belongs to. The request carries the key and nothing
        else: no chat content, titles, folder names or browsing history. Payments themselves are
        handled by our payment provider, Paddle, under its own privacy policy.
      </p>
      <h3>Configuration file</h3>
      <p>
        On startup, and at most every six hours, the extension downloads a small static JSON file
        from this website. It lists which chat apps are currently supported and may contain a short
        notice to show in the panel. This is an ordinary HTTP request to our static host, which may
        log your IP address and user agent in standard server logs. The file is configuration only,
        never code.
      </p>
      <h3>Requests to the chat apps themselves</h3>
      <p>
        To list and read your conversations, the extension makes requests to chatgpt.com or
        claude.ai from within those pages, using the session you are already logged into. These
        requests go to the chat provider you are using, not to us, and are the same kind of request
        the site makes on its own.
      </p>
      <p>There is no analytics, no telemetry, no crash reporting and no advertising.</p>

      <h2>Chrome permissions and why each exists</h2>
      <table>
        <thead>
          <tr>
            <th>Permission</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>storage</code>
            </td>
            <td>Save your license key, the plan it unlocks and the configuration cache.</td>
          </tr>
          <tr>
            <td>
              <code>https://chatgpt.com/*</code>
            </td>
            <td>
              Show the panel on ChatGPT and read your ChatGPT conversations from inside that page.
            </td>
          </tr>
          <tr>
            <td>
              <code>https://claude.ai/*</code>
            </td>
            <td>
              Show the panel on Claude and read your Claude conversations from inside that page.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The extension does not request access to all websites, tabs, history, cookies on other
        sites, downloads or the clipboard. Exports are saved through a normal browser download that
        you trigger.
      </p>

      <h2>No sale, no sharing</h2>
      <p>
        We do not sell, rent, share or otherwise disclose any personal data, because we do not hold
        any beyond your license record and what Paddle processes for payment. The license record is
        the key, the email address you bought with, and the state of your purchase (which plan,
        whether a subscription is active, and the Paddle identifiers that link them). We receive it
        from Paddle when you buy, keep it in our database, and use the email address once, to send
        you the key through our email provider. We never see your card details. We have no access to
        your conversations.
      </p>

      <h2>This website</h2>
      <p>
        This site loads no fonts or analytics, and we set no cookies of our own. After a purchase,
        your browser tab remembers the order reference until you close it, so the thank-you page can
        show your license key. Our hosting provider may keep standard access logs (IP address, user
        agent, requested URL) for a limited time for security and operations.
      </p>
      <p>
        There is one third-party script. The home page loads Paddle.js from our payment provider,
        Paddle, to show prices for your country and to open the checkout. To do that Paddle receives
        your IP address, and it may set cookies or use browser storage that it needs to run the
        checkout and prevent fraud. The checkout itself is an overlay served by Paddle, and what you
        type into it goes to Paddle under its own privacy policy, not to us. The other pages of this
        site, including this one, do not load it.
      </p>

      <h2>How to delete everything</h2>
      <p>
        Uninstall the extension. Chrome removes the extension&apos;s IndexedDB database and its{' '}
        <code>chrome.storage</code> data at that point. If Chrome sync is on, the license-key value
        in <code>chrome.storage.sync</code> is removed from the synced set as well. To delete your
        license record and the purchase record associated with your email, contact us: we will
        delete the former and relay the request for the latter to Paddle.
      </p>

      <h2>Your rights</h2>
      <p>
        If you are in the European Economic Area, the United Kingdom or another jurisdiction with
        similar law, you have the right to access, correct, export and erase personal data we hold
        about you, to restrict or object to its processing, and to complain to your supervisory
        authority. In practice the only such data is your purchase and license record. Write to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will respond within 30 days.
      </p>
      <p>
        The legal basis for processing the license key is performance of the contract you entered
        when buying a license. The controller is {COMPANY_NAME}; contact details are above.
      </p>

      <h2>Children</h2>
      <p>The extension and this site are not directed at children under 16.</p>

      <h2>Chrome Web Store Limited Use disclosure</h2>
      <p>
        {SITE_NAME}&apos;s use of information received from Chrome APIs and from the websites it has
        permission to access adheres to the Chrome Web Store User Data Policy, including the Limited
        Use requirements. Specifically: the extension only uses the data it accesses to provide the
        user-facing features described on this site; it does not transfer that data to anyone except
        as necessary to provide those features (the license check), to comply with applicable law,
        or as part of a merger or acquisition with prior notice; it does not use the data for
        advertising; and it does not allow humans to read it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top changes with it. Material changes will also be
        mentioned in the extension&apos;s release notes on the Chrome Web Store.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </PageShell>
  );
}
