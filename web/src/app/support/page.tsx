import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import {
  CHROME_WEB_STORE_URL,
  FREE_FOLDER_LIMIT,
  SITE_NAME,
  SUPPORT_EMAIL,
  mailto,
} from '@/config';

export const metadata: Metadata = {
  title: 'Support',
  description: `Installing ${SITE_NAME}, entering a license key, fixing a missing panel, export formats and refunds.`,
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <PageShell prose>
      <h1>Support</h1>
      <p>
        Answers to the usual questions. If yours is not here, email{' '}
        <a href={mailto(`${SITE_NAME} support`)}>{SUPPORT_EMAIL}</a>. Include your Chrome version
        and which site you were on; never paste chat content into the email.
      </p>

      <h2>Installing</h2>
      <ol>
        <li>
          Open the{' '}
          <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer">
            Chrome Web Store listing
          </a>{' '}
          and click <strong>Add to Chrome</strong>.
        </li>
        <li>
          Chrome shows the two sites the extension can access, chatgpt.com and claude.ai. Accept.
        </li>
        <li>
          Open or reload chatgpt.com or claude.ai. A small drawer tab appears on the right edge;
          click it to open the panel.
        </li>
      </ol>
      <p>
        Gaveta works in Chrome and in Chromium-based browsers that install from the Chrome Web Store
        (Edge, Brave, Arc, Vivaldi). Firefox and Safari are not supported.
      </p>

      <h2>Finding and entering your license key</h2>
      <p>
        After checkout, Lemon Squeezy emails you a receipt with the license key and also shows it on
        the order confirmation page. The key looks like a long string of letters, digits and dashes.
      </p>
      <ol>
        <li>
          Click the {SITE_NAME} icon in the Chrome toolbar. If it is hidden, click the puzzle-piece
          icon and pin it.
        </li>
        <li>Paste the key into the license field and click Save.</li>
        <li>
          Reload the chat site. The panel no longer shows the {FREE_FOLDER_LIMIT}-folder limit.
        </li>
      </ol>
      <p>
        The key is stored in Chrome&apos;s synced extension storage, so other Chrome profiles signed
        in with the same Google account pick it up on their own. If you lost the email, write to
        support with the email address you used at checkout.
      </p>

      <h2>The panel disappeared or shows &quot;needs an update&quot;</h2>
      <p>
        ChatGPT and Claude change their pages often. When that happens the extension stops reading
        conversations rather than guessing, and the panel shows a notice. Folders and anything
        already indexed keep working. Try these in order:
      </p>
      <ol>
        <li>
          <strong>Reload</strong> the tab. The sites sometimes load in a state the extension cannot
          attach to.
        </li>
        <li>
          <strong>Update</strong>: go to <code>chrome://extensions</code>, turn on Developer mode,
          click <strong>Update</strong>. Chrome checks for extension updates only every few hours by
          itself.
        </li>
        <li>
          <strong>Report</strong>: if the newest version still shows the notice, email{' '}
          <a href={mailto(`${SITE_NAME} needs an update`)}>{SUPPORT_EMAIL}</a> with the site name,
          the extension version (shown on <code>chrome://extensions</code>) and what the panel says.
          A fix usually ships within a few days.
        </li>
      </ol>
      <p>
        If the panel is missing entirely with no notice, check that the extension is enabled on{' '}
        <code>chrome://extensions</code> and that the site access setting there still includes the
        site you are on.
      </p>

      <h2>Export formats</h2>
      <ul>
        <li>
          <strong>Markdown (.md)</strong>: a heading with the title and date, then each message with
          the speaker in bold. Pastes cleanly into Obsidian, Notion or any editor.
        </li>
        <li>
          <strong>JSON (.json)</strong>: the title, vendor, timestamps and an array of messages with{' '}
          <code>role</code>, <code>text</code> and <code>createdAt</code>. For scripts and backups.
        </li>
      </ul>
      <p>
        Files go to your normal Chrome downloads folder. The file name is the chat title, shortened
        and made safe for file systems. Free exports one chat at a time as Markdown; bulk export of
        a whole folder is a Pro feature.
      </p>

      <h2>Search</h2>
      <p>
        Free searches titles. Pro searches the full text of messages and lets you tag chats and add
        notes. The index is built in the background the first time you open the panel on a site and
        updated for chats that changed since. On a very large history the first index can take a
        minute; the panel stays usable.
      </p>

      <h2>Refunds</h2>
      <p>
        Within 14 days of purchase, email{' '}
        <a href={mailto(`${SITE_NAME} refund`)}>{SUPPORT_EMAIL}</a> with the order number from your
        Lemon Squeezy receipt. The refund is issued through Lemon Squeezy to the original payment
        method, and the key is deactivated.
      </p>

      <h2>Removing your data</h2>
      <p>
        Uninstall the extension from <code>chrome://extensions</code>. Chrome deletes the folders,
        index and settings with it. There is nothing to delete on our side.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={mailto(`${SITE_NAME} support`)}>{SUPPORT_EMAIL}</a>
        {/* TODO: a contact form would go here; using mailto on purpose until there is a backend. */}
      </p>
    </PageShell>
  );
}
