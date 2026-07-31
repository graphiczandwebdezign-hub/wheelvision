/**
 * Shared unique-id generator for the local persistence modules. Prefers
 * `crypto.randomUUID` and degrades to a timestamped random suffix so older
 * kiosk browsers never crash on save.
 */
export function createStorageId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
