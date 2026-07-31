import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalConsultantProfileStorage,
  type ConsultantProfileStorage,
} from '@/features/preview/state/consultant-profiles';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** Point the module-level store at a fresh storage double. */
function reset(storage: ConsultantProfileStorage): ConsultantProfileStorage {
  useConsultantStore.setState({ storage, profiles: [], activeId: null, hydrated: false });
  return storage;
}

describe('useConsultantStore (in-memory mirror over profile storage)', () => {
  beforeEach(() => {
    reset(createLocalConsultantProfileStorage(memoryStorage()));
  });

  it('hydrates from storage, idempotently', () => {
    const storage = reset(createLocalConsultantProfileStorage(memoryStorage()));
    storage.create('Thandi');
    const id = storage.list()[0].id;
    storage.setActive(id);
    reset(storage);

    useConsultantStore.getState().hydrate();
    expect(useConsultantStore.getState().profiles.map((profile) => profile.name)).toEqual([
      'Thandi',
    ]);
    expect(useConsultantStore.getState().activeId).toBe(id);
    expect(useConsultantStore.getState().hydrated).toBe(true);

    useConsultantStore.getState().hydrate();
    expect(useConsultantStore.getState().profiles).toHaveLength(1);
  });

  it('refreshes the mirror after a successful create; failure leaves it untouched', () => {
    useConsultantStore.getState().hydrate();
    const created = useConsultantStore.getState().createProfile('Thandi');
    expect(created.ok).toBe(true);
    expect(useConsultantStore.getState().profiles.map((profile) => profile.name)).toEqual([
      'Thandi',
    ]);
    // Persisted through to the storage module.
    expect(useConsultantStore.getState().storage.list()).toHaveLength(1);

    const duplicate = useConsultantStore.getState().createProfile(' thandi ');
    expect(duplicate).toEqual({ ok: false, reason: 'duplicate' });
    expect(useConsultantStore.getState().profiles).toHaveLength(1);
  });

  it('mirrors renames and reports failures', () => {
    useConsultantStore.getState().hydrate();
    const created = useConsultantStore.getState().createProfile('Thandi');
    const id = created.ok ? created.profile.id : '';

    expect(useConsultantStore.getState().renameProfile(id, 'Thandi M')).toEqual({ ok: true });
    expect(useConsultantStore.getState().profiles[0].name).toBe('Thandi M');
    expect(useConsultantStore.getState().renameProfile('unknown', 'X')).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it('mirrors removal and the active-profile fallback', () => {
    useConsultantStore.getState().hydrate();
    const a = useConsultantStore.getState().createProfile('Thandi');
    const aId = a.ok ? a.profile.id : '';
    useConsultantStore.getState().activateProfile(aId);

    expect(useConsultantStore.getState().removeProfile(aId)).toBe(true);
    expect(useConsultantStore.getState().profiles).toHaveLength(0);
    expect(useConsultantStore.getState().activeId).toBeNull();
  });

  it('activates profiles and settles on the storage answer', () => {
    useConsultantStore.getState().hydrate();
    const created = useConsultantStore.getState().createProfile('Thandi');
    const id = created.ok ? created.profile.id : '';

    expect(useConsultantStore.getState().activateProfile(id)).toBe(true);
    expect(useConsultantStore.getState().activeId).toBe(id);
    expect(useConsultantStore.getState().activateProfile(null)).toBe(true);
    expect(useConsultantStore.getState().activeId).toBeNull();
  });

  it('surfaces storage write failures without corrupting the mirror', () => {
    const backend = memoryStorage();
    const storage = reset(createLocalConsultantProfileStorage(backend));
    useConsultantStore.getState().hydrate();
    const created = useConsultantStore.getState().createProfile('Thandi');
    const id = created.ok ? created.profile.id : '';
    useConsultantStore.getState().activateProfile(id);

    backend.setItem = () => {
      throw new Error('quota exceeded');
    };
    expect(useConsultantStore.getState().removeProfile(id)).toBe(false);
    expect(useConsultantStore.getState().activateProfile(null)).toBe(false);
    expect(useConsultantStore.getState().profiles).toHaveLength(1);
    expect(useConsultantStore.getState().activeId).toBe(id);
    expect(useConsultantStore.getState().createProfile('Pieter')).toEqual({
      ok: false,
      reason: 'storage',
    });
    expect(storage.list()).toHaveLength(1);
  });
});
