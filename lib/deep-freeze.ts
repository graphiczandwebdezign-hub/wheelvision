/**
 * Recursive structural freeze. Immutable domain objects (quote snapshots,
 * quote DTOs) are frozen at assembly time so no later code path can mutate
 * them — in development a stray write throws immediately instead of
 * silently corrupting a shared reference.
 *
 * Cycle-safe (WeakSet) and idempotent; already-frozen graphs are returned
 * as-is. Only own enumerable properties of plain objects/arrays are walked.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);

  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (typeof child === 'object' && child !== null) {
      deepFreeze(child, seen);
    }
  }

  return Object.freeze(value);
}
