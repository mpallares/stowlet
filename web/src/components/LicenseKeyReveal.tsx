'use client';

import { useEffect, useState } from 'react';
import { recallTransaction } from '@/lib/lastCheckout';

const POLL_MS = 2000;
const MAX_ATTEMPTS = 30;

type State =
  | { phase: 'waiting' }
  | { phase: 'ready'; key: string }
  /** No checkout in this tab, or the key did not show up in time: the email is the fallback. */
  | { phase: 'email-only' };

/** Shows the license key for the checkout that just completed in this tab. */
export function LicenseKeyReveal() {
  const [state, setState] = useState<State>({ phase: 'waiting' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const transactionId = recallTransaction();

    async function poll(attempt: number): Promise<void> {
      if (stopped) return;
      if (!transactionId || attempt >= MAX_ATTEMPTS) {
        setState({ phase: 'email-only' });
        return;
      }
      try {
        const response = await fetch(
          `/api/license/claim?transaction=${encodeURIComponent(transactionId)}`,
          { cache: 'no-store' },
        );
        if (response.ok) {
          const body: unknown = await response.json();
          if (typeof body === 'object' && body !== null && 'key' in body) {
            const { key } = body;
            if (typeof key === 'string' && !stopped) {
              setState({ phase: 'ready', key });
              return;
            }
          }
        }
      } catch {
        // Network hiccup: try again.
      }
      timer = setTimeout(() => void poll(attempt + 1), POLL_MS);
    }

    void poll(0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  if (state.phase === 'email-only') return null;

  return (
    <div
      className="not-prose my-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
      data-testid="license-reveal"
    >
      <p className="text-sm font-medium text-neutral-300">Your license key</p>
      {state.phase === 'waiting' ? (
        <p className="mt-2 text-sm text-neutral-400" role="status">
          Preparing your key…
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code
            className="font-mono text-base break-all text-neutral-100"
            data-testid="license-key"
          >
            {state.key}
          </code>
          <button
            type="button"
            data-testid="license-copy"
            onClick={() => {
              void navigator.clipboard.writeText(state.key).then(() => setCopied(true));
            }}
            className="cursor-pointer rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
