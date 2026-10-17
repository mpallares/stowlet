import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { StowletDB, setDb } from '@/db/schema';

let counter = 0;

/** Fresh IndexedDB per test so suites never share state. */
beforeEach(() => {
  counter += 1;
  setDb(new StowletDB(`stowlet-test-${counter}-${Date.now()}`));
});
