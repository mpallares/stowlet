import { useEffect, useState } from 'react';
import { PLAN_SUMMARY } from '@/entitlements';
import {
  DEFAULT_LICENSE_STATE,
  DEFAULT_REMOTE_CONFIG,
  LICENSE_ACCOUNT_URL,
  type LicenseCheck,
  type LicenseState,
  type RemoteConfig,
} from '@stowlet/shared';
import { browser } from 'wxt/browser';
import { sendToBackground } from '@/lib/messaging';

const CHECK_MESSAGE: Record<LicenseCheck, string> = {
  valid: 'Pro is active.',
  inactive: 'This key is genuine, but nothing behind it is active right now.',
  invalid: 'That key was not recognised. Check it against your purchase email.',
  unreachable: 'Could not reach stowlet.app to check the key. Try again in a moment.',
};

export function App() {
  const [license, setLicense] = useState<LicenseState>(DEFAULT_LICENSE_STATE);
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_REMOTE_CONFIG);
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    void sendToBackground('license:get', {}).then((l) => {
      setLicense(l);
      setKey(l.key ?? '');
    });
    void sendToBackground('remoteConfig:get', {}).then(setConfig);
  }, []);

  const save = async (): Promise<void> => {
    setChecking(true);
    try {
      setLicense(await sendToBackground('license:setKey', { key }));
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex flex-col gap-3 p-4 text-sm">
      <header className="flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Stowlet</h1>
        <span className="text-xs text-gray-500">v{version}</span>
      </header>

      {config.notice && (
        <p className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">{config.notice}</p>
      )}

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Plan</h2>
        <p data-testid="tier">{license.tier === 'pro' ? 'Pro' : 'Free'}</p>
        <p className="text-xs text-gray-500">{PLAN_SUMMARY[license.tier]}</p>
      </section>

      <section className="flex flex-col gap-1">
        <label
          htmlFor="license-key"
          className="text-xs font-semibold tracking-wide text-gray-500 uppercase"
        >
          License key
        </label>
        <input
          id="license-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          data-testid="license-input"
          spellCheck={false}
          autoComplete="off"
          placeholder="STOW-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={checking}
          data-testid="license-save"
          className="rounded bg-orange-700 px-2 py-1 text-sm text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {checking ? 'Checking…' : 'Save key'}
        </button>
        {license.check && !checking ? (
          <p className="text-xs" role="status" data-testid="license-status">
            {CHECK_MESSAGE[license.check]}{' '}
            {license.check === 'inactive' ? (
              <a className="underline" href={LICENSE_ACCOUNT_URL} target="_blank" rel="noreferrer">
                Manage your purchase
              </a>
            ) : null}
          </p>
        ) : null}
        <p className="text-xs text-gray-500">
          The key is checked with stowlet.app and stored in your browser profile. Nothing else is
          sent.
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Sites</h2>
        <ul className="text-xs">
          <li>ChatGPT: {config.adapters.chatgpt.enabled ? 'enabled' : 'disabled'}</li>
          <li>Claude: {config.adapters.claude.enabled ? 'enabled' : 'disabled'}</li>
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        Open chatgpt.com or claude.ai to see the Stowlet panel on the right edge.
      </p>
    </main>
  );
}
