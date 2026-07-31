'use client';

import { useEffect, useState } from 'react';

export const DEFAULT_DEBOUNCE_MS = 150;

/**
 * Returns the input value after it has been stable for `delayMs`.
 * The general-purpose companion to SearchBox: panels that derive state
 * (rather than just reporting keystrokes) debounce through this hook so
 * expensive derivations and queries don't run per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
