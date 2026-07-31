import { describe, expect, it } from 'vitest';
import {
  CONSULTANT_PROFILES_STORAGE_KEY,
  createLocalConsultantProfileStorage,
  MAX_CONSULTANT_PROFILES,
  normaliseConsultantName,
} from '@/features/preview/state/consultant-profiles';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe('normaliseConsultantName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normaliseConsultantName('  Thandi   Mokoena ')).toBe('Thandi Mokoena');
  });

  it('rejects blank names', () => {
    expect(normaliseConsultantName('   ')).toBeNull();
    expect(normaliseConsultantName('')).toBeNull();
  });
});

describe('ConsultantProfileStorage (local, future-API-ready)', () => {
  it('creates profiles with id + timestamp, newest appended', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const first = storage.create('Thandi');
    const second = storage.create('Pieter');
    expect(first.ok && first.profile.id).toBeTruthy();
    expect(first.ok && Date.parse(first.profile.createdAt)).not.toBeNaN();
    const listed = storage.list();
    expect(listed.map((profile) => profile.name)).toEqual(['Thandi', 'Pieter']);
    expect(second.ok && listed[1].id === (second.ok ? second.profile.id : '')).toBe(true);
  });

  it('normalises names on create', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const result = storage.create('   Sipho  Dlamini   ');
    expect(result.ok && result.profile.name).toBe('Sipho Dlamini');
  });

  it('rejects empty names', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    expect(storage.create('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(storage.list()).toHaveLength(0);
  });

  it('rejects duplicate names case-insensitively', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    storage.create('Thandi');
    expect(storage.create(' thandi ')).toEqual({ ok: false, reason: 'duplicate' });
    expect(storage.list()).toHaveLength(1);
  });

  it(`caps profiles at ${MAX_CONSULTANT_PROFILES}`, () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    for (let index = 0; index < MAX_CONSULTANT_PROFILES; index += 1) {
      expect(storage.create(`Consultant ${index}`).ok).toBe(true);
    }
    expect(storage.create('One too many')).toEqual({ ok: false, reason: 'full' });
    expect(storage.list()).toHaveLength(MAX_CONSULTANT_PROFILES);
  });

  it('renames a profile, preserving its id', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const created = storage.create('Thandi');
    const id = created.ok ? created.profile.id : '';
    expect(storage.rename(id, '  Thandi M ')).toEqual({ ok: true });
    expect(storage.list()[0]).toMatchObject({ id, name: 'Thandi M' });
  });

  it('rejects renames that are empty, duplicate or for a missing profile', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const a = storage.create('Thandi');
    storage.create('Pieter');
    const id = a.ok ? a.profile.id : '';
    expect(storage.rename(id, '   ')).toEqual({ ok: false, reason: 'empty' });
    expect(storage.rename(id, ' pieter ')).toEqual({ ok: false, reason: 'duplicate' });
    expect(storage.rename('unknown-id', 'New')).toEqual({ ok: false, reason: 'missing' });
    expect(storage.list().map((profile) => profile.name)).toEqual(['Thandi', 'Pieter']);
  });

  it('lets a profile keep its own name on rename (not a duplicate of itself)', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const created = storage.create('Thandi');
    const id = created.ok ? created.profile.id : '';
    expect(storage.rename(id, ' thandi ')).toEqual({ ok: true });
    expect(storage.list()[0].name).toBe('thandi');
  });

  it('tracks the active profile and ignores unknown ids', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const created = storage.create('Thandi');
    const id = created.ok ? created.profile.id : '';
    expect(storage.activeId()).toBeNull();
    storage.setActive(id);
    expect(storage.activeId()).toBe(id);
    storage.setActive('unknown-id');
    expect(storage.activeId()).toBe(id);
    storage.setActive(null);
    expect(storage.activeId()).toBeNull();
  });

  it('removing the active profile returns the device to the showroom list', () => {
    const storage = createLocalConsultantProfileStorage(memoryStorage());
    const a = storage.create('Thandi');
    const b = storage.create('Pieter');
    const aId = a.ok ? a.profile.id : '';
    const bId = b.ok ? b.profile.id : '';
    storage.setActive(aId);
    storage.remove(aId);
    expect(storage.activeId()).toBeNull();
    expect(storage.list().map((profile) => profile.id)).toEqual([bId]);
  });

  it('recovers from a corrupted payload as empty rather than crashing', () => {
    const backend = memoryStorage();
    backend.setItem(CONSULTANT_PROFILES_STORAGE_KEY, '{broken json');
    const storage = createLocalConsultantProfileStorage(backend);
    expect(storage.list()).toEqual([]);
    expect(storage.activeId()).toBeNull();
  });

  it('drops malformed profiles and a dangling active id from a stored payload', () => {
    const backend = memoryStorage();
    backend.setItem(
      CONSULTANT_PROFILES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        profiles: [{ id: 'p1', name: 'Thandi' }, { name: 'No id' }, null],
        activeId: 'p-deleted',
      }),
    );
    const storage = createLocalConsultantProfileStorage(backend);
    expect(storage.list()).toEqual([{ id: 'p1', name: 'Thandi', createdAt: '' }]);
    expect(storage.activeId()).toBeNull();
  });

  it('surfaces storage write failures as results instead of throwing', () => {
    const backend = memoryStorage();
    const storage = createLocalConsultantProfileStorage(backend);
    storage.create('Thandi');
    backend.setItem = () => {
      throw new Error('quota exceeded');
    };
    expect(storage.create('Pieter')).toEqual({ ok: false, reason: 'storage' });
    const existing = storage.list()[0];
    expect(storage.rename(existing.id, 'Nope')).toEqual({ ok: false, reason: 'storage' });
  });

  it('survives storage read failures as an empty list', () => {
    const backend: KeyValueStorage = {
      getItem: () => {
        throw new Error('privacy mode');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const storage = createLocalConsultantProfileStorage(backend);
    expect(storage.list()).toEqual([]);
    expect(storage.activeId()).toBeNull();
  });
});
