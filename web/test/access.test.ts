import { describe, expect, it } from 'vitest';
import { type Entitlement, grantsAccess, resolveTier } from '@/server/billing/access';

const base: Entitlement = {
  customerId: 'ctm_x',
  revoked: false,
  lifetime: false,
  subscriptionStatuses: [],
};

describe('grantsAccess', () => {
  it.each([
    ['active', true],
    ['trialing', true],
    ['past_due', true],
    ['paused', false],
    ['canceled', false],
    ['something_new', false],
  ])('%s → %s', (status, expected) => {
    expect(grantsAccess(status)).toBe(expected);
  });
});

describe('resolveTier', () => {
  it('is free for an unknown key', () => {
    expect(resolveTier(null)).toBe('free');
  });
  it('is free with no purchases', () => {
    expect(resolveTier(base)).toBe('free');
  });
  it('is pro for a lifetime purchase', () => {
    expect(resolveTier({ ...base, lifetime: true })).toBe('pro');
  });
  it('is pro when any subscription grants access', () => {
    expect(resolveTier({ ...base, subscriptionStatuses: ['canceled', 'active'] })).toBe('pro');
  });
  it('is free when every subscription has ended or is paused', () => {
    expect(resolveTier({ ...base, subscriptionStatuses: ['canceled', 'paused'] })).toBe('free');
  });
  it('is free for a revoked key even with a lifetime purchase', () => {
    expect(resolveTier({ ...base, lifetime: true, revoked: true })).toBe('free');
  });
});
