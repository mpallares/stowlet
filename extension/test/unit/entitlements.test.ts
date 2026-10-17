import { describe, expect, it } from 'vitest';
import { can, limits, PLAN_SUMMARY, UPGRADE_COPY } from '@/entitlements';

describe('entitlements', () => {
  it('gates every Pro feature on Free and allows it on Pro', () => {
    for (const f of [
      'subfolders',
      'content-search',
      'json-export',
      'bulk-export',
      'tags',
      'notes',
    ] as const) {
      expect(can('free', f)).toBe(false);
      expect(can('pro', f)).toBe(true);
      expect(UPGRADE_COPY[f].title.length).toBeGreaterThan(0);
    }
  });

  it('caps folders on Free only', () => {
    expect(limits('free').folders).toBe(5);
    expect(limits('pro').folders).toBe(Number.POSITIVE_INFINITY);
  });

  it('describes both plans', () => {
    expect(PLAN_SUMMARY.free).toContain('title search only');
    expect(PLAN_SUMMARY.pro).toContain('sub-folders');
  });
});
