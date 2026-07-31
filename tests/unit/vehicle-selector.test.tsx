import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleSelector } from '@/features/preview/selection/vehicle-selector';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { listEnvelope, vehicleSummaries } from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/vehicles', () => ({
  listVehicles: vi.fn(),
  getVehicle: vi.fn(),
}));

import { listVehicles } from '@/features/catalog/api/vehicles';

async function chooseComboOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  const input = await screen.findByRole('combobox', { name: label });
  await user.click(input);
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('VehicleSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    vi.mocked(listVehicles).mockReset();
    vi.mocked(listVehicles).mockResolvedValue(listEnvelope(vehicleSummaries));
  });

  it('resolves a unique vehicle through the manufacturer → model → year cascade', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    await chooseComboOption(user, 'Manufacturer', 'Toyota');
    expect(usePreviewStore.getState().vehicleId).toBeNull(); // still ambiguous

    await chooseComboOption(user, 'Model', 'Hilux');
    expect(usePreviewStore.getState().vehicleId).toBeNull();

    await chooseComboOption(user, 'Year', '2019');
    expect(usePreviewStore.getState().vehicleId).toBe('veh-hilux-srx');
    expect(usePreviewStore.getState().colour).toBeNull();
  });

  it('resolves immediately when one vehicle matches (Ford Ranger)', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    await chooseComboOption(user, 'Manufacturer', 'Ford');
    expect(usePreviewStore.getState().vehicleId).toBe('veh-ranger-xlt');
  });

  it('offers a variant combobox while the cascade stays ambiguous', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    await chooseComboOption(user, 'Manufacturer', 'Toyota');
    const variant = await screen.findByRole('combobox', { name: 'Variant' });
    await user.click(variant);
    await user.click(await screen.findByRole('option', { name: /Legend/ }));

    expect(usePreviewStore.getState().vehicleId).toBe('veh-hilux-legend');
  });

  it('filters the cascade via the debounced search box', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    const search = await screen.findByRole('searchbox', { name: 'Search vehicles' });
    await user.type(search, 'ranger');
    await waitFor(
      async () => {
        await chooseComboOption(user, 'Manufacturer', 'Ford');
      },
      { timeout: 2000 },
    );
    // Only one match after filtering — resolves without further input.
    expect(usePreviewStore.getState().vehicleId).toBe('veh-ranger-xlt');
  });

  it('selects and toggles colours of the resolved vehicle', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    await chooseComboOption(user, 'Manufacturer', 'Ford');
    const chip = await screen.findByRole('button', { name: 'Arctic White' });

    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(usePreviewStore.getState().colour).toBe('Arctic White');
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip); // toggle off
    expect(usePreviewStore.getState().colour).toBeNull();
  });

  it('reflects the stored (restored) vehicle in the cascade', async () => {
    usePreviewStore.getState().selectVehicle('veh-hilux-srx');
    usePreviewStore.getState().selectColour('Silver');
    renderWithQuery(<VehicleSelector />);

    await waitFor(() => {
      const manufacturer = screen.getByRole('combobox', {
        name: 'Manufacturer',
      }) as HTMLInputElement;
      expect(manufacturer.value).toBe('Toyota');
    });
    const model = screen.getByRole('combobox', { name: 'Model' }) as HTMLInputElement;
    const year = screen.getByRole('combobox', { name: 'Year' }) as HTMLInputElement;
    expect(model.value).toBe('Hilux');
    expect(year.value).toBe('2019');
    expect(screen.getByRole('button', { name: 'Silver' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a retryable error state when the catalog fails', async () => {
    vi.mocked(listVehicles).mockReset();
    vi.mocked(listVehicles)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(listEnvelope(vehicleSummaries));

    const user = userEvent.setup();
    renderWithQuery(<VehicleSelector />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle catalog unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('combobox', { name: 'Manufacturer' })).toBeInTheDocument();
  });

  it('shows an empty state when nothing is published', async () => {
    vi.mocked(listVehicles).mockResolvedValue(listEnvelope([], 0));
    renderWithQuery(<VehicleSelector />);
    expect(await screen.findByText('No vehicles published yet')).toBeInTheDocument();
  });
});
