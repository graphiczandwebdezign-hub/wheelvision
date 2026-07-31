import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedConfigurationsDialog } from '@/features/preview/selection/saved-configurations-dialog';
import {
  createLocalConfigurationStorage,
  type KeyValueStorage,
} from '@/features/preview/state/configuration-storage';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { resetToastIds, useToastStore } from '@/components/ui/toast-store';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const savedSelection = {
  vehicleId: hiluxDetail.id,
  colour: 'Silver',
  wheelId: te37Detail.id,
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyreId: ps4Detail.id,
  tyreProfileId: 'pf-265-65-17',
};

function setup() {
  const backend = memoryStorage();
  const storage = createLocalConfigurationStorage(backend);
  storage.save({ selection: savedSelection, label: 'First config' });
  const onMutated = vi.fn();
  const onClose = vi.fn();

  // Mirrors the production wiring: mutations bump a parent-level refresh key.
  function Harness() {
    const [refreshKey, setRefreshKey] = useState(1);
    return (
      <SavedConfigurationsDialog
        open
        onClose={onClose}
        storage={storage}
        refreshKey={refreshKey}
        onMutated={() => {
          onMutated();
          setRefreshKey((key) => key + 1);
        }}
      />
    );
  }
  render(<Harness />);
  return { storage, onMutated, onClose };
}

describe('SavedConfigurationsDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    useToastStore.getState().clear();
    resetToastIds();
  });

  it('loads a saved configuration into the store atomically and closes', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();

    await user.click(screen.getByRole('button', { name: 'Load First config' }));

    const state = usePreviewStore.getState();
    expect(state.vehicleId).toBe(hiluxDetail.id);
    expect(state.colour).toBe('Silver');
    expect(state.wheelId).toBe(te37Detail.id);
    expect(state.wheelFinish).toBe('Matte Black');
    expect(state.wheelSizeId).toBe('sz-18x8');
    expect(state.tyreId).toBe(ps4Detail.id);
    expect(state.tyreProfileId).toBe('pf-265-65-17');
    expect(onClose).toHaveBeenCalled();
    expect(useToastStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true);
  });

  it('renames via the inline editor (Enter commits)', async () => {
    const user = userEvent.setup();
    const { storage, onMutated } = setup();
    const saved = storage.list()[0];

    await user.click(screen.getByRole('button', { name: 'Rename First config' }));
    const input = screen.getByLabelText('Configuration name');
    expect(input).toHaveFocus();

    await user.clear(input);
    await user.type(input, 'Mrs Nkosi{Enter}');

    expect(storage.list().find((item) => item.id === saved.id)?.label).toBe('Mrs Nkosi');
    expect(onMutated).toHaveBeenCalled();
    expect(screen.queryByLabelText('Configuration name')).not.toBeInTheDocument();
  });

  it('Escape cancels a rename without touching the label or the dialog', async () => {
    const user = userEvent.setup();
    const { storage, onMutated } = setup();

    await user.click(screen.getByRole('button', { name: 'Rename First config' }));
    const input = screen.getByLabelText('Configuration name');
    await user.clear(input);
    await user.type(input, 'discarded{Escape}');

    expect(storage.list()[0].label).toBe('First config');
    expect(onMutated).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // dialog stayed open
  });

  it('removes entries and reports the mutation', async () => {
    const user = userEvent.setup();
    const { storage, onMutated } = setup();

    await user.click(screen.getByRole('button', { name: 'Remove First config' }));

    expect(storage.list()).toHaveLength(0);
    expect(onMutated).toHaveBeenCalled();
    expect(within(screen.getByRole('dialog')).getByText('Nothing saved yet')).toBeInTheDocument();
  });

  it('shows the empty state with no saved configurations', () => {
    const backend = memoryStorage();
    render(
      <SavedConfigurationsDialog
        open
        onClose={() => undefined}
        storage={createLocalConfigurationStorage(backend)}
        refreshKey={1}
        onMutated={() => undefined}
      />,
    );
    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
  });
});
