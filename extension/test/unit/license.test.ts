import { DEFAULT_LICENSE_STATE, type LicenseState } from '@stowlet/shared';
import { describe, expect, it } from 'vitest';
import { askLicenseService, isStale, nextLicenseState } from '@/lib/license';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const KEY = 'STOW-AAAAA-AAAAA-AAAAA-AAAAA-AAAAA';
const pro: LicenseState = { tier: 'pro', key: KEY, checkedAt: NOW - DAY, check: 'valid' };

const respond = (status: number, body: unknown): typeof fetch =>
  (() => Promise.resolve(new Response(JSON.stringify(body), { status }))) as typeof fetch;

describe('askLicenseService', () => {
  it('sends the key and nothing else', async () => {
    let sent: { url: string; body: unknown } | null = null;
    const fetchImpl = ((url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)) };
      return Promise.resolve(new Response(JSON.stringify({ valid: true, tier: 'pro' })));
    }) as typeof fetch;
    const answer = await askLicenseService(KEY, {
      url: 'https://example.test/validate',
      fetchImpl,
    });
    expect(answer).toEqual({ kind: 'answered', valid: true, tier: 'pro' });
    expect(sent).toEqual({ url: 'https://example.test/validate', body: { key: KEY } });
  });

  it('passes on an unknown key', async () => {
    const answer = await askLicenseService(KEY, {
      fetchImpl: respond(200, { valid: false, tier: 'free' }),
    });
    expect(answer).toEqual({ kind: 'answered', valid: false, tier: 'free' });
  });

  it.each([
    ['a server error', respond(503, { error: 'Unavailable' })],
    ['a malformed answer', respond(200, { ok: true })],
    ['a wrong tier value', respond(200, { valid: true, tier: 'enterprise' })],
    ['a network failure', (() => Promise.reject(new TypeError('offline'))) as typeof fetch],
  ])('treats %s as unreachable', async (_name, fetchImpl) => {
    expect(await askLicenseService(KEY, { fetchImpl })).toEqual({ kind: 'unreachable' });
  });
});

describe('nextLicenseState', () => {
  it('unlocks Pro for a valid key', () => {
    const next = nextLicenseState(
      DEFAULT_LICENSE_STATE,
      KEY,
      { kind: 'answered', valid: true, tier: 'pro' },
      NOW,
    );
    expect(next).toEqual({ tier: 'pro', key: KEY, checkedAt: NOW, check: 'valid' });
  });

  it('drops to Free when the key is genuine but nothing behind it is active', () => {
    const next = nextLicenseState(pro, KEY, { kind: 'answered', valid: true, tier: 'free' }, NOW);
    expect(next).toEqual({ tier: 'free', key: KEY, checkedAt: NOW, check: 'inactive' });
  });

  it('drops to Free for an unknown or revoked key', () => {
    const next = nextLicenseState(pro, KEY, { kind: 'answered', valid: false, tier: 'free' }, NOW);
    expect(next).toEqual({ tier: 'free', key: KEY, checkedAt: NOW, check: 'invalid' });
  });

  it('keeps the confirmed tier when the service cannot be reached', () => {
    const next = nextLicenseState(pro, KEY, { kind: 'unreachable' }, NOW);
    expect(next).toEqual({ tier: 'pro', key: KEY, checkedAt: NOW - DAY, check: 'unreachable' });
  });

  it('grants nothing to a new key that could not be checked', () => {
    const other = 'STOW-BBBBB-BBBBB-BBBBB-BBBBB-BBBBB';
    const next = nextLicenseState(pro, other, { kind: 'unreachable' }, NOW);
    expect(next).toEqual({ tier: 'free', key: other, checkedAt: null, check: 'unreachable' });
  });
});

describe('isStale', () => {
  it('never re-checks when no key is stored', () => {
    expect(isStale(DEFAULT_LICENSE_STATE, NOW)).toBe(false);
  });
  it('re-checks a key that was never confirmed', () => {
    expect(isStale({ ...pro, checkedAt: null }, NOW)).toBe(true);
  });
  it('re-checks after a day, not before', () => {
    expect(isStale({ ...pro, checkedAt: NOW - DAY }, NOW)).toBe(true);
    expect(isStale({ ...pro, checkedAt: NOW - DAY + 1 }, NOW)).toBe(false);
  });
});
