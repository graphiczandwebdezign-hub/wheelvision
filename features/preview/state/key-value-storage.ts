/**
 * Minimal Storage contract shared by the local persistence modules
 * (saved configurations, consultant profiles). Real `localStorage` satisfies
 * it directly; tests inject an in-memory double.
 */
export interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}
