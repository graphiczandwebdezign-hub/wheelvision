import type { PreviewSelection } from '@/features/preview/state/preview-store';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';

export type { KeyValueStorage } from '@/features/preview/state/key-value-storage';

/**
 * Saved-configuration persistence.
 *
 * Configurations live in localStorage behind the `ConfigurationStorage`
 * interface so a backend implementation (dealer account, cross-kiosk sync)
 * can drop in without touching call sites. The preview store stays untouched
 * by this module; callers pass it a snapshot of the selection.
 *
 * Every entry is stamped with an `ownerId`: `null` means the shared showroom
 * pool, a consultant-profile id scopes the save to that consultant's list.
 * Payloads are versioned (v1 → v2 adds ownership) and corruption-tolerant:
 * anything unreadable recovers to an empty list rather than crashing a kiosk.
 */

export interface SavedConfiguration {
  readonly id: string;
  readonly name: string;
  readonly savedAt: string; // ISO-8601
  readonly selection: PreviewSelection;
  /** Human-readable summary for list views (e.g. "2025 Toyota Hilux Legend"). */
  readonly label: string;
  /** ConsultantProfile id, or null for the shared showroom pool. */
  readonly ownerId: string | null;
}

export interface SaveConfigurationInput {
  readonly selection: PreviewSelection;
  readonly label: string;
  readonly name?: string;
  readonly ownerId?: string | null;
}

export interface ConfigurationStorage {
  save: (input: SaveConfigurationInput) => SavedConfiguration;
  /** Omit the scope to list everything; null = shared pool; id = one consultant. */
  list: (scope?: string | null) => readonly SavedConfiguration[];
  remove: (id: string) => void;
  rename: (id: string, label: string) => void;
}

export const SAVED_CONFIGURATIONS_STORAGE_KEY = 'wheelvision:saved-configurations';

const STORAGE_VERSION = 2;
const MAX_SAVED_CONFIGURATIONS = 20;

const EMPTY_SELECTION: PreviewSelection = {
  vehicleId: null,
  colour: null,
  wheelId: null,
  wheelFinish: null,
  wheelSizeId: null,
  tyreId: null,
  tyreProfileId: null,
};

interface StoredShape {
  readonly version: number;
  readonly configurations: unknown[];
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cfg-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function normaliseSelection(value: unknown): PreviewSelection {
  if (typeof value !== 'object' || value === null) {
    return { ...EMPTY_SELECTION };
  }
  const record = value as Record<string, unknown>;
  const selection: Record<string, string | null> = { ...EMPTY_SELECTION };
  for (const key of Object.keys(EMPTY_SELECTION)) {
    const field = record[key];
    selection[key] = typeof field === 'string' ? field : null;
  }
  return selection as unknown as PreviewSelection;
}

function normaliseEntry(value: unknown): SavedConfiguration | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return null;
  }
  if (typeof record.selection !== 'object' || record.selection === null) {
    return null;
  }
  return {
    id: record.id,
    name:
      typeof record.name === 'string'
        ? record.name
        : typeof record.label === 'string'
          ? record.label
          : record.id,
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date(0).toISOString(),
    label: typeof record.label === 'string' ? record.label : 'Saved configuration',
    ownerId: typeof record.ownerId === 'string' ? record.ownerId : null, // v1 payloads → shared pool
    selection: normaliseSelection(record.selection),
  };
}

function parseStored(raw: string | null): SavedConfiguration[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredShape> | null;
    if (parsed && Array.isArray(parsed.configurations)) {
      return parsed.configurations
        .map(normaliseEntry)
        .filter((entry): entry is SavedConfiguration => entry !== null);
    }
  } catch {
    // Corrupted payload: recover gracefully with an empty list rather than crash.
  }
  return [];
}

export function createLocalConfigurationStorage(storage: KeyValueStorage): ConfigurationStorage {
  const readAll = (): SavedConfiguration[] =>
    parseStored(storage.getItem(SAVED_CONFIGURATIONS_STORAGE_KEY));

  const writeAll = (configurations: readonly SavedConfiguration[]): void => {
    const payload: StoredShape = { version: STORAGE_VERSION, configurations: [...configurations] };
    storage.setItem(SAVED_CONFIGURATIONS_STORAGE_KEY, JSON.stringify(payload));
  };

  const matchesScope = (entry: SavedConfiguration, scope: string | null): boolean =>
    scope === null ? entry.ownerId === null : entry.ownerId === scope;

  return {
    save: ({ selection, label, name, ownerId }) => {
      const configuration: SavedConfiguration = {
        id: createId(),
        name: name ?? label,
        savedAt: new Date().toISOString(),
        selection: { ...selection },
        label,
        ownerId: typeof ownerId === 'string' ? ownerId : null,
      };
      const next = [configuration, ...readAll()].slice(0, MAX_SAVED_CONFIGURATIONS);
      writeAll(next);
      return configuration;
    },
    list: (scope) =>
      typeof scope === 'undefined'
        ? readAll()
        : readAll().filter((entry) => matchesScope(entry, scope)),
    remove: (id) => {
      writeAll(readAll().filter((configuration) => configuration.id !== id));
    },
    rename: (id, label) => {
      const trimmed = label.trim();
      if (trimmed.length === 0) {
        return; // empty rename keeps the previous label — never blank a save
      }
      writeAll(
        readAll().map((configuration) =>
          configuration.id === id ? { ...configuration, label: trimmed } : configuration,
        ),
      );
    },
  };
}

/** Browser default: localStorage-backed, resolved lazily so SSR stays safe. */
export function getBrowserConfigurationStorage(): ConfigurationStorage {
  const fallback: KeyValueStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  const storage: KeyValueStorage = typeof window === 'undefined' ? fallback : window.localStorage;
  return createLocalConfigurationStorage(storage);
}
