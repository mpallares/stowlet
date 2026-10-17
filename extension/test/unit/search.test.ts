import { describe, expect, it } from 'vitest';
import type { Conversation } from '@stowlet/shared';
import { MockAdapter } from '@/adapters/mock/MockAdapter';
import { loadSerializedIndex, listConversationMeta } from '@/db';
import { syncVendor } from '@/lib/search/indexer';
import { docFromConversation, previewOf, SearchIndex } from '@/lib/search/SearchIndex';

const conv = (id: string, title: string, text: string): Conversation => ({
  id,
  title,
  createdAt: 1,
  updatedAt: 1,
  messages: [{ role: 'user', text, ts: 1 }],
});

describe('SearchIndex', () => {
  it('finds by title and by content, boosting titles', () => {
    const idx = SearchIndex.empty();
    idx.upsert(
      docFromConversation('mock', 'mock:a', conv('a', 'Sourdough tips', 'rye flour feeding')),
    );
    idx.upsert(
      docFromConversation(
        'mock',
        'mock:b',
        conv('b', 'Rust lifetimes', 'sourdough mentioned once'),
      ),
    );
    const hits = idx.search('sourdough');
    expect(hits.map((h) => h.id)).toEqual(['mock:a', 'mock:b']);
    expect(hits[0]?.matchedFields).toContain('title');
    expect(hits[1]?.matchedFields).toEqual(['content']);
    expect(idx.search('rye')).toHaveLength(1);
    expect(idx.search('')).toEqual([]);
  });

  it('matches prefixes and small typos', () => {
    const idx = SearchIndex.empty();
    idx.upsert(
      docFromConversation(
        'mock',
        'mock:a',
        conv('a', 'Kubernetes networking', 'ingress controllers'),
      ),
    );
    expect(idx.search('kuber')).toHaveLength(1);
    expect(idx.search('ingres')).toHaveLength(1);
  });

  it('upserts replace older content', () => {
    const idx = SearchIndex.empty();
    idx.upsert(docFromConversation('mock', 'mock:a', conv('a', 'Old title', 'alpha')));
    idx.upsert(docFromConversation('mock', 'mock:a', conv('a', 'New title', 'beta')));
    expect(idx.search('alpha')).toHaveLength(0);
    expect(idx.search('beta')).toHaveLength(1);
    expect(idx.size).toBe(1);
    idx.remove('mock:a');
    expect(idx.size).toBe(0);
  });

  it('round-trips through JSON and rejects foreign payloads', () => {
    const idx = SearchIndex.empty();
    idx.upsert(docFromConversation('mock', 'mock:a', conv('a', 'Hello', 'world')));
    const restored = SearchIndex.fromJSON(idx.toJSON());
    expect(restored?.search('world')).toHaveLength(1);
    expect(SearchIndex.fromJSON('not json')).toBeNull();
    expect(SearchIndex.fromJSON('{"v":99,"index":"{}"}')).toBeNull();
  });

  it('builds a short preview from the first user message', () => {
    const c = conv('a', 'T', `  ${'x'.repeat(300)}  `);
    expect(previewOf(c)).toHaveLength(160);
    expect(previewOf(c).endsWith('…')).toBe(true);
  });
});

describe('syncVendor (incremental indexing)', () => {
  it('indexes every conversation on first run and only changed ones afterwards', async () => {
    const adapter = new MockAdapter({ win: undefined as unknown as Window });
    const idx = SearchIndex.empty();

    const first = await syncVendor(adapter, idx);
    expect(first).toMatchObject({ ok: true, listed: 5, indexed: 5, failed: 0 });
    expect(adapter.calls.get).toBe(5);
    expect(idx.search('acetone')).toHaveLength(1);

    const second = await syncVendor(adapter, idx);
    expect(second).toMatchObject({ ok: true, indexed: 0 });
    expect(adapter.calls.get).toBe(5);

    adapter.touch('mock-0002', [
      { role: 'assistant', text: 'xylophone lifetimes', ts: Date.now() },
    ]);
    const third = await syncVendor(adapter, idx);
    expect(third).toMatchObject({ ok: true, indexed: 1 });
    expect(adapter.calls.get).toBe(6);
    expect(idx.search('xylophone').map((h) => h.id)).toEqual(['mock:mock-0002']);

    const stored = await loadSerializedIndex();
    expect(stored?.docCount).toBe(5);
    const metas = await listConversationMeta('mock');
    expect(metas.every((m) => m.indexedUpdatedAt !== null)).toBe(true);
  });

  it('removes conversations the vendor deleted, but only from a complete list', async () => {
    const adapter = new MockAdapter({ win: undefined as unknown as Window });
    const idx = SearchIndex.empty();
    await syncVendor(adapter, idx);
    const before = await listConversationMeta('mock');
    expect(before.length).toBeGreaterThan(1);
    const victim = before[0]?.conversationId ?? '';
    const key = `mock:${victim}` as const;
    expect(idx.has(key)).toBe(true);

    adapter.remove(victim);
    adapter.listComplete = false;
    const partial = await syncVendor(adapter, idx);
    expect(partial.ok && partial.removed).toBe(0);
    expect(idx.has(key)).toBe(true);
    expect((await listConversationMeta('mock')).length).toBe(before.length);

    adapter.listComplete = true;
    const full = await syncVendor(adapter, idx);
    expect(full.ok && full.removed).toBe(1);
    expect(idx.has(key)).toBe(false);
    expect((await listConversationMeta('mock')).map((c) => c.id)).not.toContain(key);
    const stored = await loadSerializedIndex();
    expect(stored?.docCount).toBe(before.length - 1);
    expect(stored ? SearchIndex.fromJSON(stored.json)?.has(key) : null).toBe(false);
  });

  it('surfaces adapter failures instead of throwing', async () => {
    const adapter = new MockAdapter({
      failWith: 'needs-update',
      win: undefined as unknown as Window,
    });
    const result = await syncVendor(adapter, SearchIndex.empty());
    expect(result).toEqual({ ok: false, error: { code: 'needs-update', message: 'Mock failure' } });
  });
});
