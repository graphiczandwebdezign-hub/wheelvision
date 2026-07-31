import { createStorageId } from '@/lib/create-id';
import type { KeyValueStorage } from '@/features/preview/state/key-value-storage';

/**
 * Consultant profile persistence.
 *
 * Dealerships share kiosk devices: consultants keep a named local profile so
 * saved configurations land on their own list and customer handouts carry
 * their name. Profiles live in localStorage behind the
 * `ConsultantProfileStorage` interface — deliberately the same seam the
 * saved-configuration module uses, so dealer-account sync later replaces the
 * implementation without touching call sites.
 */

export interface ConsultantProfile {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

export type CreateProfileFailure = 'empty' | 'duplicate' | 'full' | 'storage';
export type CreateProfileResult =
  | { readonly ok: true; readonly profile: ConsultantProfile }
  | { readonly ok: false; readonly reason: CreateProfileFailure };

export type RenameProfileFailure = 'empty' | 'duplicate' | 'missing' | 'storage';
export type RenameProfileResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: RenameProfileFailure };

export interface ConsultantProfileStorage {
  list: () => readonly ConsultantProfile[];
  create: (name: string) => CreateProfileResult;
  rename: (id: string, name: string) => RenameProfileResult;
  /** Removing the active profile returns the device to the shared showroom list. */
  remove: (id: string) => void;
  activeId: () => string | null;
  /** Unknown ids are ignored (never produce a dangling active pointer). */
  setActive: (id: string | null) => void;
}

export const CONSULTANT_PROFILES_STORAGE_KEY = 'wheelvision:consultant-profiles';
export const MAX_CONSULTANT_PROFILES = 10;

/** Names are trimmed and whitespace-collapsed; empty results are rejected. */
export function normaliseConsultantName(name: string): string | null {
  const normalised = name.trim().replace(/\s+/g, ' ');
  return normalised.length > 0 ? normalised : null;
}

const STORAGE_VERSION = 1;

interface StoredShape {
  readonly version: number;
  readonly profiles: ConsultantProfile[];
  readonly activeId: string | null;
}

function parseProfiles(raw: string | null): StoredShape {
  const empty: StoredShape = { version: STORAGE_VERSION, profiles: [], activeId: null };
  if (!raw) {
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as { profiles?: unknown; activeId?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.profiles)) {
      return empty;
    }
    const profiles = (parsed.profiles as unknown[]).flatMap((item): ConsultantProfile[] => {
      if (typeof item !== 'object' || item === null) {
        return [];
      }
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.name !== 'string' || record.name === '') {
        return [];
      }
      return [
        {
          id: record.id,
          name: record.name,
          createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        },
      ];
    });
    const activeId =
      typeof parsed.activeId === 'string' &&
      profiles.some((profile) => profile.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { version: STORAGE_VERSION, profiles, activeId };
  } catch {
    // Corrupted payload: recover with an empty profile list rather than crash.
    return empty;
  }
}

function hasDuplicateName(
  profiles: readonly ConsultantProfile[],
  name: string,
  excludeId?: string,
): boolean {
  const lowered = name.toLocaleLowerCase();
  return profiles.some(
    (profile) => profile.id !== excludeId && profile.name.toLocaleLowerCase() === lowered,
  );
}

export function createLocalConsultantProfileStorage(
  storage: KeyValueStorage,
): ConsultantProfileStorage {
  const read = (): StoredShape => {
    try {
      return parseProfiles(storage.getItem(CONSULTANT_PROFILES_STORAGE_KEY));
    } catch {
      // Privacy modes can throw on read — treat as empty, never crash.
      return { version: STORAGE_VERSION, profiles: [], activeId: null };
    }
  };

  const write = (shape: StoredShape): void => {
    storage.setItem(CONSULTANT_PROFILES_STORAGE_KEY, JSON.stringify(shape));
  };

  return {
    list: () => read().profiles,

    create: (name) => {
      const normalised = normaliseConsultantName(name);
      if (normalised === null) {
        return { ok: false, reason: 'empty' };
      }
      const current = read();
      if (current.profiles.length >= MAX_CONSULTANT_PROFILES) {
        return { ok: false, reason: 'full' };
      }
      if (hasDuplicateName(current.profiles, normalised)) {
        return { ok: false, reason: 'duplicate' };
      }
      const profile: ConsultantProfile = {
        id: createStorageId('profile'),
        name: normalised,
        createdAt: new Date().toISOString(),
      };
      try {
        write({ ...current, profiles: [...current.profiles, profile] });
      } catch {
        return { ok: false, reason: 'storage' };
      }
      return { ok: true, profile };
    },

    rename: (id, name) => {
      const normalised = normaliseConsultantName(name);
      if (normalised === null) {
        return { ok: false, reason: 'empty' };
      }
      const current = read();
      if (!current.profiles.some((profile) => profile.id === id)) {
        return { ok: false, reason: 'missing' };
      }
      if (hasDuplicateName(current.profiles, normalised, id)) {
        return { ok: false, reason: 'duplicate' };
      }
      try {
        write({
          ...current,
          profiles: current.profiles.map((profile) =>
            profile.id === id ? { ...profile, name: normalised } : profile,
          ),
        });
      } catch {
        return { ok: false, reason: 'storage' };
      }
      return { ok: true };
    },

    remove: (id) => {
      const current = read();
      write({
        ...current,
        profiles: current.profiles.filter((profile) => profile.id !== id),
        activeId: current.activeId === id ? null : current.activeId,
      });
    },

    activeId: () => read().activeId,

    setActive: (id) => {
      const current = read();
      if (id !== null && !current.profiles.some((profile) => profile.id === id)) {
        return;
      }
      write({ ...current, activeId: id });
    },
  };
}

/** Browser default: localStorage-backed, resolved lazily so SSR stays safe. */
export function getBrowserConsultantProfileStorage(): ConsultantProfileStorage {
  const fallback: KeyValueStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  const storage: KeyValueStorage = typeof window === 'undefined' ? fallback : window.localStorage;
  return createLocalConsultantProfileStorage(storage);
}
