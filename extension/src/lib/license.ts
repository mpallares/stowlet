import {
  DEFAULT_LICENSE_STATE,
  LICENSE_VALIDATE_URL,
  type LicenseCheck,
  type LicenseState,
  type LicenseTier,
} from '@stowlet/shared';
import { browser } from 'wxt/browser';
import { errorKind, log } from './log';

const KEY = 'license';
const TIMEOUT_MS = 5000;
/** A stored key is re-checked once it is older than this, so an ended subscription drops to Free. */
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;

const CHECKS: readonly LicenseCheck[] = ['valid', 'inactive', 'invalid', 'unreachable'];

/** License state lives in `chrome.storage.sync` (tiny, follows the user's profile). */
export async function getLicenseState(): Promise<LicenseState> {
  const stored = await browser.storage.sync.get(KEY);
  const raw = stored[KEY] as Partial<LicenseState> | undefined;
  if (!raw) return DEFAULT_LICENSE_STATE;
  return {
    tier: raw.tier === 'pro' ? 'pro' : 'free',
    key: typeof raw.key === 'string' ? raw.key : null,
    checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : null,
    check: CHECKS.find((c) => c === raw.check) ?? null,
  };
}

export type LicenseAnswer =
  { kind: 'answered'; valid: boolean; tier: LicenseTier } | { kind: 'unreachable' };

/**
 * Asks the license service about a key. The request carries the key and nothing else.
 * Anything other than a well-formed answer (offline, timeout, 5xx, odd JSON) is `unreachable`,
 * which callers treat as "keep what we knew". The key is never logged.
 */
export async function askLicenseService(
  key: string,
  opts: { url?: string; fetchImpl?: typeof fetch } = {},
): Promise<LicenseAnswer> {
  try {
    const res = await (opts.fetchImpl ?? fetch)(opts.url ?? LICENSE_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) {
      log.warn('license', 'check-failed', { status: res.status });
      return { kind: 'unreachable' };
    }
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null || !('valid' in body) || !('tier' in body)) {
      log.warn('license', 'invalid-shape');
      return { kind: 'unreachable' };
    }
    if (typeof body.valid !== 'boolean' || (body.tier !== 'pro' && body.tier !== 'free')) {
      log.warn('license', 'invalid-shape');
      return { kind: 'unreachable' };
    }
    return { kind: 'answered', valid: body.valid, tier: body.tier };
  } catch (e) {
    log.warn('license', 'check-failed', { kind: errorKind(e) });
    return { kind: 'unreachable' };
  }
}

/** The state to store after asking about `key`. Pure, so the rules are easy to test. */
export function nextLicenseState(
  current: LicenseState,
  key: string,
  answer: LicenseAnswer,
  now: number,
): LicenseState {
  if (answer.kind === 'unreachable') {
    // Same key as before: keep the tier we last confirmed. A new, unconfirmed key grants nothing.
    const sameKey = current.key === key;
    return {
      tier: sameKey ? current.tier : 'free',
      key,
      checkedAt: sameKey ? current.checkedAt : null,
      check: 'unreachable',
    };
  }
  if (!answer.valid) return { tier: 'free', key, checkedAt: now, check: 'invalid' };
  return answer.tier === 'pro'
    ? { tier: 'pro', key, checkedAt: now, check: 'valid' }
    : { tier: 'free', key, checkedAt: now, check: 'inactive' };
}

export function isStale(state: LicenseState, now: number): boolean {
  if (state.key === null) return false;
  return state.checkedAt === null || now - state.checkedAt >= RECHECK_AFTER_MS;
}

async function store(state: LicenseState): Promise<LicenseState> {
  await browser.storage.sync.set({ [KEY]: state });
  return state;
}

/** Saves a key typed in the popup and checks it straight away. An empty key clears the license. */
export async function setLicenseKey(key: string | null): Promise<LicenseState> {
  const trimmed = key?.trim() ?? '';
  if (trimmed === '') return store(DEFAULT_LICENSE_STATE);
  const current = await getLicenseState();
  const next = nextLicenseState(current, trimmed, await askLicenseService(trimmed), Date.now());
  log.info('license', 'checked', { check: next.check, tier: next.tier });
  return store(next);
}

/** Re-checks the stored key when it is due. Returns the state that is now stored. */
export async function refreshLicenseIfStale(): Promise<LicenseState> {
  const current = await getLicenseState();
  if (current.key === null || !isStale(current, Date.now())) return current;
  const next = nextLicenseState(
    current,
    current.key,
    await askLicenseService(current.key),
    Date.now(),
  );
  // Another save may have landed while we were asking; never overwrite a different key.
  if ((await getLicenseState()).key !== current.key) return getLicenseState();
  log.info('license', 'rechecked', { check: next.check, tier: next.tier });
  return store(next);
}
