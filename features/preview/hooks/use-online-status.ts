'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Server render assumes online (the badge corrects on hydration if needed). */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Browser connectivity as React state. Tears faithfully through
 * `useSyncExternalStore` — transitions are surfaced as a badge + toast in
 * the preview experience; the store itself never blocks on connectivity.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
