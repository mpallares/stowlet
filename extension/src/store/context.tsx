import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { StowletState, StowletStore } from './stowletStore';

const StoreContext = createContext<StowletStore | null>(null);

export const StoreProvider = StoreContext.Provider;

export function useStowlet<T>(selector: (s: StowletState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  return useStore(store, selector);
}
