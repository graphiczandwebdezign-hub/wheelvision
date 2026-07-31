import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiagnosticsConfig } from '@/features/preview/engine/render-context';

/**
 * PreviewStore — the single client-side source of truth for the dealer's
 * current configuration.
 *
 * Scope (and only this): selected vehicle, colour, wheel, finish, size,
 * tyre (+profile), a fitment filter preference, and renderer diagnostics
 * settings. Server data lives in React Query; UI chrome (toasts, dialogs)
 * lives in its own stores. No React Context, no prop drilling: panels read
 * and write through this store and the renderer is fed the resolved result.
 *
 * Selections persist to localStorage with an explicit version + migration
 * path so a kiosk never loses a configuration because the shape evolved.
 */

export interface PreviewSelection {
  readonly vehicleId: string | null;
  readonly colour: string | null;
  readonly wheelId: string | null;
  readonly wheelFinish: string | null;
  readonly wheelSizeId: string | null;
  readonly tyreId: string | null;
  readonly tyreProfileId: string | null;
}

export interface RendererSettings {
  readonly diagnostics: DiagnosticsConfig;
}

export const DEFAULT_RENDERER_SETTINGS: RendererSettings = {
  diagnostics: { wheelCenters: false, layerOutlines: false },
};

export interface PreviewStoreState extends PreviewSelection {
  readonly rendererSettings: RendererSettings;

  selectVehicle: (vehicleId: string | null) => void;
  selectColour: (colour: string | null) => void;
  selectWheel: (wheelId: string | null) => void;
  selectWheelFinish: (finish: string | null) => void;
  selectWheelSize: (sizeId: string | null) => void;
  selectTyre: (tyreId: string | null) => void;
  selectTyreProfile: (profileId: string | null) => void;
  /** Merge a diagnostics patch without dropping sibling toggles. */
  setDiagnostics: (diagnostics: Partial<DiagnosticsConfig>) => void;
  /** Apply a complete selection atomically (shared links, saved configs). */
  restoreConfiguration: (selection: PreviewSelection) => void;
  resetConfiguration: () => void;
}

const EMPTY_SELECTION: PreviewSelection = {
  vehicleId: null,
  colour: null,
  wheelId: null,
  wheelFinish: null,
  wheelSizeId: null,
  tyreId: null,
  tyreProfileId: null,
};

export const PREVIEW_STORE_STORAGE_KEY = 'wheelvision:preview-store';
export const PREVIEW_STORE_VERSION = 1;

type PersistedPreviewStore = PreviewSelection & {
  rendererSettings: RendererSettings;
};

/**
 * Version-safe migrations. Version 0 (engineering prototype) stored a flat
 * shape without renderer settings; unknown/partial shapes are normalised by
 * spreading over the defaults so a missing field can never crash hydration.
 * Exported for tests; the persist middleware is the only runtime caller.
 */
export function migratePersistedState(persisted: unknown, version: number): PersistedPreviewStore {
  const defaults: PersistedPreviewStore = {
    ...EMPTY_SELECTION,
    rendererSettings: DEFAULT_RENDERER_SETTINGS,
  };

  if (persisted === null || typeof persisted !== 'object') {
    return defaults;
  }

  const record = persisted as Record<string, unknown>;

  if (version === 0) {
    return {
      ...defaults,
      vehicleId: typeof record.vehicleId === 'string' ? record.vehicleId : null,
      wheelId: typeof record.wheelId === 'string' ? record.wheelId : null,
      tyreId: typeof record.tyreId === 'string' ? record.tyreId : null,
    };
  }

  const migrated: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in record) {
      migrated[key] = record[key];
    }
  }
  return migrated as unknown as PersistedPreviewStore;
}

export const usePreviewStore = create<PreviewStoreState>()(
  persist(
    (set) => ({
      ...EMPTY_SELECTION,
      rendererSettings: DEFAULT_RENDERER_SETTINGS,

      selectVehicle: (vehicleId) =>
        set(
          (state) => (state.vehicleId === vehicleId ? { vehicleId } : { vehicleId, colour: null }), // colours are vehicle-specific
        ),
      selectColour: (colour) => set({ colour }),
      selectWheel: (wheelId) =>
        set(
          (state) =>
            state.wheelId === wheelId
              ? { wheelId }
              : { wheelId, wheelFinish: null, wheelSizeId: null }, // finish/size are wheel-specific
        ),
      selectWheelFinish: (wheelFinish) => set({ wheelFinish }),
      selectWheelSize: (wheelSizeId) => set({ wheelSizeId }),
      selectTyre: (tyreId) =>
        set(
          (state) => (state.tyreId === tyreId ? { tyreId } : { tyreId, tyreProfileId: null }), // profiles are tyre-specific
        ),
      selectTyreProfile: (tyreProfileId) => set({ tyreProfileId }),
      setDiagnostics: (diagnostics) =>
        set((state) => ({
          rendererSettings: {
            ...state.rendererSettings,
            diagnostics: { ...state.rendererSettings.diagnostics, ...diagnostics },
          },
        })),
      restoreConfiguration: (selection) => set({ ...EMPTY_SELECTION, ...selection }),
      resetConfiguration: () => set({ ...EMPTY_SELECTION }),
    }),
    {
      name: PREVIEW_STORE_STORAGE_KEY,
      version: PREVIEW_STORE_VERSION,
      partialize: (state): PersistedPreviewStore => ({
        vehicleId: state.vehicleId,
        colour: state.colour,
        wheelId: state.wheelId,
        wheelFinish: state.wheelFinish,
        wheelSizeId: state.wheelSizeId,
        tyreId: state.tyreId,
        tyreProfileId: state.tyreProfileId,
        rendererSettings: state.rendererSettings,
      }),
      migrate: migratePersistedState,
    },
  ),
);
