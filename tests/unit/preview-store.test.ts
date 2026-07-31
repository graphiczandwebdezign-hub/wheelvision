import { beforeEach, describe, expect, it } from 'vitest';
import {
  migratePersistedState,
  PREVIEW_STORE_STORAGE_KEY,
  PREVIEW_STORE_VERSION,
  usePreviewStore,
} from '@/features/preview/state/preview-store';

describe('PreviewStore selections', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
  });

  it('starts with an empty selection and default renderer settings', () => {
    const state = usePreviewStore.getState();
    expect(state.vehicleId).toBeNull();
    expect(state.wheelId).toBeNull();
    expect(state.tyreId).toBeNull();
    expect(state.colour).toBeNull();
    expect(state.rendererSettings.diagnostics).toEqual({
      wheelCenters: false,
      layerOutlines: false,
    });
  });

  it('stores every selection dimension independently', () => {
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-1');
    store.selectColour('Silver');
    store.selectWheel('wh-1');
    store.selectWheelFinish('Matte Black');
    store.selectWheelSize('sz-1');
    store.selectTyre('ty-1');
    store.selectTyreProfile('pf-1');

    const next = usePreviewStore.getState();
    expect(next.vehicleId).toBe('veh-1');
    expect(next.colour).toBe('Silver');
    expect(next.wheelId).toBe('wh-1');
    expect(next.wheelFinish).toBe('Matte Black');
    expect(next.wheelSizeId).toBe('sz-1');
    expect(next.tyreId).toBe('ty-1');
    expect(next.tyreProfileId).toBe('pf-1');
  });

  it('clears the colour when the vehicle changes (colours are vehicle-specific)', () => {
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-1');
    store.selectColour('Silver');
    store.selectVehicle('veh-2');
    expect(usePreviewStore.getState().colour).toBeNull();
  });

  it('clears finish and size when the wheel changes', () => {
    const store = usePreviewStore.getState();
    store.selectWheel('wh-1');
    store.selectWheelFinish('Matte Black');
    store.selectWheelSize('sz-1');
    store.selectWheel('wh-2');
    expect(usePreviewStore.getState().wheelFinish).toBeNull();
    expect(usePreviewStore.getState().wheelSizeId).toBeNull();
  });

  it('keeps the size when only the finish changes', () => {
    const store = usePreviewStore.getState();
    store.selectWheel('wh-1');
    store.selectWheelSize('sz-1');
    store.selectWheelFinish('Bronze');
    expect(usePreviewStore.getState().wheelSizeId).toBe('sz-1');
  });

  it('clears the profile when the tyre changes', () => {
    const store = usePreviewStore.getState();
    store.selectTyre('ty-1');
    store.selectTyreProfile('pf-1');
    store.selectTyre('ty-2');
    expect(usePreviewStore.getState().tyreProfileId).toBeNull();
  });

  it('merges diagnostics toggles without dropping siblings', () => {
    const store = usePreviewStore.getState();
    store.setDiagnostics({ wheelCenters: true });
    store.setDiagnostics({ layerOutlines: true });
    expect(usePreviewStore.getState().rendererSettings.diagnostics).toEqual({
      wheelCenters: true,
      layerOutlines: true,
    });
  });

  it('resets the whole configuration but keeps renderer settings', () => {
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-1');
    store.selectWheel('wh-1');
    store.setDiagnostics({ wheelCenters: true });
    store.resetConfiguration();

    const next = usePreviewStore.getState();
    expect(next.vehicleId).toBeNull();
    expect(next.wheelId).toBeNull();
    expect(next.rendererSettings.diagnostics.wheelCenters).toBe(true);
  });
});

describe('PreviewStore.restoreConfiguration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
  });

  it('applies a complete selection atomically', () => {
    const before = usePreviewStore.getState();
    before.selectVehicle('veh-old');
    before.selectColour('Old Colour');

    usePreviewStore.getState().restoreConfiguration({
      vehicleId: 'veh-9',
      colour: 'Silver',
      wheelId: 'wh-9',
      wheelFinish: 'Bronze',
      wheelSizeId: 'sz-9',
      tyreId: 'ty-9',
      tyreProfileId: 'pf-9',
    });

    const next = usePreviewStore.getState();
    expect(next.vehicleId).toBe('veh-9');
    expect(next.colour).toBe('Silver');
    expect(next.wheelId).toBe('wh-9');
    expect(next.wheelFinish).toBe('Bronze');
    expect(next.wheelSizeId).toBe('sz-9');
    expect(next.tyreId).toBe('ty-9');
    expect(next.tyreProfileId).toBe('pf-9');
  });

  it('normalises over the empty selection so partial input keeps nulls', () => {
    usePreviewStore.getState().selectWheelFinish('Bronze');
    usePreviewStore.getState().restoreConfiguration({
      vehicleId: 'veh-1',
      colour: null,
      wheelId: null,
      wheelFinish: null,
      wheelSizeId: null,
      tyreId: null,
      tyreProfileId: null,
    });
    expect(usePreviewStore.getState().wheelFinish).toBeNull();
    expect(usePreviewStore.getState().vehicleId).toBe('veh-1');
  });
});

describe('PreviewStore persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
  });

  it('persists the selection slice (not actions) to localStorage', () => {
    usePreviewStore.getState().selectVehicle('veh-9');
    usePreviewStore.getState().selectColour('Graphite Black');

    const raw = window.localStorage.getItem(PREVIEW_STORE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      version: number;
      state: Record<string, unknown>;
    };
    expect(parsed.version).toBe(PREVIEW_STORE_VERSION);
    expect(parsed.state.vehicleId).toBe('veh-9');
    expect(parsed.state.colour).toBe('Graphite Black');
    expect(typeof parsed.state.selectVehicle).toBe('undefined');
  });

  it('restores the selection after a simulated browser refresh', async () => {
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-9');
    store.selectWheelSize('sz-18x8');
    const persistedFromLastSession = window.localStorage.getItem(PREVIEW_STORE_STORAGE_KEY);
    expect(persistedFromLastSession).not.toBeNull();

    // Simulate refresh: new JS context, then hydration from storage.
    store.selectVehicle(null);
    store.selectWheelSize(null);
    expect(usePreviewStore.getState().vehicleId).toBeNull();

    window.localStorage.setItem(PREVIEW_STORE_STORAGE_KEY, persistedFromLastSession as string);
    await usePreviewStore.persist.rehydrate();
    expect(usePreviewStore.getState().vehicleId).toBe('veh-9');
    expect(usePreviewStore.getState().wheelSizeId).toBe('sz-18x8');
  });

  it('survives a corrupted storage payload by keeping defaults', async () => {
    window.localStorage.setItem(PREVIEW_STORE_STORAGE_KEY, '{not json');
    await expect(usePreviewStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(usePreviewStore.getState().vehicleId).toBeNull();
  });
});

describe('migratePersistedState (version-safe migrations)', () => {
  it('maps a version-0 payload onto the current shape', () => {
    const migrated = migratePersistedState(
      { vehicleId: 'veh-old', wheelId: 'wh-old', colour: 'Silver' },
      0,
    );
    expect(migrated.vehicleId).toBe('veh-old');
    expect(migrated.wheelId).toBe('wh-old');
    expect(migrated.colour).toBeNull(); // v0 colours were unreliable — dropped deliberately
    expect(migrated.rendererSettings.diagnostics.wheelCenters).toBe(false);
  });

  it('normalises partial/unknown payloads over the defaults', () => {
    const migrated = migratePersistedState({ vehicleId: 'veh-2' }, PREVIEW_STORE_VERSION);
    expect(migrated.vehicleId).toBe('veh-2');
    expect(migrated.wheelFinish).toBeNull();
    expect(migrated.rendererSettings).toBeDefined();
    expect(migratePersistedState(null, PREVIEW_STORE_VERSION).vehicleId).toBeNull();
    expect(migratePersistedState('garbage', PREVIEW_STORE_VERSION).tyreId).toBeNull();
  });
});
