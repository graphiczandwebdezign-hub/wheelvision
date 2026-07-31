'use client';

import { create } from 'zustand';
import {
  getBrowserConsultantProfileStorage,
  type ConsultantProfile,
  type ConsultantProfileStorage,
  type CreateProfileResult,
  type RenameProfileResult,
} from '@/features/preview/state/consultant-profiles';

/**
 * In-memory mirror of the consultant profile storage so every surface
 * (toolbar menu, summary attribution, saved-configuration scoping, print
 * sheet) reacts to profile changes without prop drilling. The storage module
 * stays the source of truth: each action writes through first, then refreshes
 * the mirror. Storage failures (quota/privacy mode) surface as results — the
 * mirror is never left claiming a write that did not persist.
 */
interface ConsultantStore {
  readonly storage: ConsultantProfileStorage;
  readonly profiles: readonly ConsultantProfile[];
  readonly activeId: string | null;
  /** False until the first `hydrate` — mirrors render the showroom default until then. */
  readonly hydrated: boolean;
  /** Loads profiles from storage (idempotent); tests inject a storage double. */
  hydrate: (storageOverride?: ConsultantProfileStorage) => void;
  createProfile: (name: string) => CreateProfileResult;
  renameProfile: (id: string, name: string) => RenameProfileResult;
  /** Returns false when the device refused the write. */
  removeProfile: (id: string) => boolean;
  activateProfile: (id: string | null) => boolean;
}

export const useConsultantStore = create<ConsultantStore>()((set, get) => ({
  storage: getBrowserConsultantProfileStorage(),
  profiles: [],
  activeId: null,
  hydrated: false,

  hydrate: (storageOverride) => {
    const storage = storageOverride ?? get().storage;
    set({ storage, profiles: storage.list(), activeId: storage.activeId(), hydrated: true });
  },

  createProfile: (name) => {
    const result = get().storage.create(name);
    if (result.ok) {
      set({ profiles: get().storage.list() });
    }
    return result;
  },

  renameProfile: (id, name) => {
    const result = get().storage.rename(id, name);
    if (result.ok) {
      set({ profiles: get().storage.list() });
    }
    return result;
  },

  removeProfile: (id) => {
    const storage = get().storage;
    try {
      storage.remove(id);
    } catch {
      return false;
    }
    set({ profiles: storage.list(), activeId: storage.activeId() });
    return true;
  },

  activateProfile: (id) => {
    const storage = get().storage;
    try {
      storage.setActive(id);
    } catch {
      return false;
    }
    set({ activeId: storage.activeId() });
    return true;
  },
}));
