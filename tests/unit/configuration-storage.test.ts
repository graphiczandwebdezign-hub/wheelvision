import { describe, expect, it } from 'vitest';
import {
  createLocalConfigurationStorage,
  SAVED_CONFIGURATIONS_STORAGE_KEY,
  type KeyValueStorage,
} from '@/features/preview/state/configuration-storage';
import type { PreviewSelection } from '@/features/preview/state/preview-store';

function memoryStorage(): KeyValueStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

const selection: PreviewSelection = {
  vehicleId: 'veh-hilux-sr5',
  colour: 'Silver',
  wheelId: 'wh-te37',
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyreId: 'ty-ps4',
  tyreProfileId: 'pf-265-65-17',
};

describe('ConfigurationStorage (local, future-API-ready)', () => {
  it('saves a configuration with id + timestamp and lists it first', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());

    const first = storage.save({ selection, label: '2025 Toyota Hilux SR5 Double Cab' });
    expect(first.id).toBeTruthy();
    expect(Date.parse(first.savedAt)).not.toBeNaN();
    expect(first.selection).toEqual(selection);

    const second = storage.save({ selection, label: 'Second' });
    expect(second.id).not.toBe(first.id);

    const listed = storage.list();
    expect(listed).toHaveLength(2);
    expect(listed[0].id).toBe(second.id); // most recent first
  });

  it('persists to the injected storage under the versioned key', () => {
    const backend = memoryStorage();
    createLocalConfigurationStorage(backend).save({ selection, label: 'X' });

    const raw = backend.dump()[SAVED_CONFIGURATIONS_STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw) as { version: number; configurations: unknown[] };
    // Version 2 adds ownerId; writes always use the current version.
    expect(parsed.version).toBe(2);
    expect(parsed.configurations).toHaveLength(1);
  });

  it('removes exactly the requested configuration', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const a = storage.save({ selection, label: 'A' });
    const b = storage.save({ selection, label: 'B' });

    storage.remove(a.id);
    const listed = storage.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(b.id);
  });

  it('renames exactly the requested configuration, trimming whitespace', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const a = storage.save({ selection, label: 'Original' });
    const b = storage.save({ selection, label: 'Other' });

    storage.rename(a.id, '  Mrs Nkosi — Hilux 4x4  ');
    const listed = storage.list();
    expect(listed.find((item) => item.id === a.id)?.label).toBe('Mrs Nkosi — Hilux 4x4');
    expect(listed.find((item) => item.id === b.id)?.label).toBe('Other');
  });

  it('keeps the previous label when the rename input is empty', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const saved = storage.save({ selection, label: 'Keep me' });
    storage.rename(saved.id, '   ');
    expect(storage.list()[0].label).toBe('Keep me');
  });

  it('caps the history at 20 entries (kiosk storage stays bounded)', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    for (let index = 0; index < 25; index += 1) {
      storage.save({ selection, label: `Config ${index}` });
    }
    const listed = storage.list();
    expect(listed).toHaveLength(20);
    expect(listed[0].label).toBe('Config 24');
  });

  it('recovers from a corrupted payload as an empty list instead of crashing', () => {
    const backend = memoryStorage();
    backend.setItem(SAVED_CONFIGURATIONS_STORAGE_KEY, '{broken json');
    expect(createLocalConfigurationStorage(backend).list()).toEqual([]);
  });

  it('filters shapeless entries out of an otherwise valid payload', () => {
    const backend = memoryStorage();
    backend.setItem(
      SAVED_CONFIGURATIONS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        configurations: [
          { id: 'ok', savedAt: '2026-07-31T08:00:00.000Z', label: 'Kept', selection },
          { id: 'no-selection' },
          null,
          { notAnId: true },
        ],
      }),
    );
    const listed = createLocalConfigurationStorage(backend).list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: 'ok', label: 'Kept', ownerId: null });
    expect(listed[0].selection).toEqual(selection);
  });
});

describe('owner scoping (consultant profiles)', () => {
  it('stamps the owning consultant on save and filters by scope', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const poolEntry = storage.save({ selection, label: 'Showroom build' });
    const thandiEntry = storage.save({ selection, label: 'Thandi build', ownerId: 'profile-1' });

    expect(poolEntry.ownerId).toBeNull();
    expect(thandiEntry.ownerId).toBe('profile-1');

    expect(storage.list(null).map((entry) => entry.id)).toEqual([poolEntry.id]);
    expect(storage.list('profile-1').map((entry) => entry.id)).toEqual([thandiEntry.id]);
    expect(storage.list('profile-other')).toEqual([]);
  });

  it('omitting the scope lists everything (legacy callers)', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    storage.save({ selection, label: 'Pool' });
    storage.save({ selection, label: 'Thandi', ownerId: 'profile-1' });
    expect(storage.list()).toHaveLength(2);
  });

  it('migrates version-1 payloads into the shared showroom pool without losing them', () => {
    const backend = memoryStorage();
    backend.setItem(
      SAVED_CONFIGURATIONS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        configurations: [
          {
            id: 'cfg-v1',
            savedAt: '2026-07-31T08:00:00.000Z',
            label: 'Legacy save',
            selection,
          },
        ],
      }),
    );
    const storage = createLocalConfigurationStorage(backend);
    const listed = storage.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: 'cfg-v1', ownerId: null, label: 'Legacy save' });
    expect(storage.list(null).map((entry) => entry.id)).toEqual(['cfg-v1']);

    // The next write re-persists the migrated entry at version 2.
    storage.save({ selection, label: 'Newer', ownerId: 'profile-1' });
    const raw = backend.dump()[SAVED_CONFIGURATIONS_STORAGE_KEY];
    const parsed = JSON.parse(raw) as {
      version: number;
      configurations: Array<{ ownerId?: string | null }>;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.configurations).toHaveLength(2);
    expect(parsed.configurations[1].ownerId).toBeNull();
  });

  it('renames and removes across scopes without touching other lists', () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const poolEntry = storage.save({ selection, label: 'Pool' });
    const thandiEntry = storage.save({ selection, label: 'Thandi', ownerId: 'profile-1' });

    storage.rename(thandiEntry.id, 'Thandi — final');
    expect(storage.list('profile-1')[0].label).toBe('Thandi — final');
    expect(storage.list(null)[0].label).toBe('Pool');

    storage.remove(poolEntry.id);
    expect(storage.list(null)).toEqual([]);
    expect(storage.list('profile-1')).toHaveLength(1);
  });

  it('drops entries whose selection is malformed instead of restoring junk', () => {
    const backend = memoryStorage();
    backend.setItem(
      SAVED_CONFIGURATIONS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        configurations: [
          { id: 'bad', savedAt: 'x', label: 'Bad', selection: 'not-an-object' },
          { id: 'ok', savedAt: 'x', label: 'Ok', selection: { vehicleId: 42, colour: 'Silver' } },
        ],
      }),
    );
    const listed = createLocalConfigurationStorage(backend).list();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe('ok');
    // Non-string fields coerce to null rather than propagating junk.
    expect(listed[0].selection).toEqual({
      vehicleId: null,
      colour: 'Silver',
      wheelId: null,
      wheelFinish: null,
      wheelSizeId: null,
      tyreId: null,
      tyreProfileId: null,
    });
  });
});
