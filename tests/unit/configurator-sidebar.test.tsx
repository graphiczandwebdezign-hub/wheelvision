import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { ConfiguratorSidebar } from '@/features/preview/components/configurator-sidebar';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import {
  hiluxDetail,
  listEnvelope,
  ps4Detail,
  te37Detail,
  tyreSummaries,
  vehicleSummaries,
  wheelSummaries,
} from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/vehicles', () => ({ listVehicles: vi.fn(), getVehicle: vi.fn() }));
vi.mock('@/features/catalog/api/wheels', () => ({ listWheels: vi.fn(), getWheel: vi.fn() }));
vi.mock('@/features/catalog/api/tyres', () => ({ listTyres: vi.fn(), getTyre: vi.fn() }));

import { getVehicle, listVehicles } from '@/features/catalog/api/vehicles';
import { getWheel, listWheels } from '@/features/catalog/api/wheels';
import { getTyre, listTyres } from '@/features/catalog/api/tyres';

describe('ConfiguratorSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    vi.clearAllMocks();
    vi.mocked(listVehicles).mockResolvedValue(listEnvelope(vehicleSummaries));
    vi.mocked(listWheels).mockResolvedValue(listEnvelope(wheelSummaries));
    vi.mocked(listTyres).mockResolvedValue(listEnvelope(tyreSummaries));
    vi.mocked(getVehicle).mockResolvedValue(hiluxDetail);
    vi.mocked(getWheel).mockResolvedValue(te37Detail);
    vi.mocked(getTyre).mockResolvedValue(ps4Detail);
  });

  it('renders the three configuration steps with pending badges and the summary footer', async () => {
    renderWithQuery(<ConfiguratorSidebar />);

    expect(screen.getByRole('button', { name: /Vehicle/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Wheels/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Tyres/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();

    // Footer summary + actions are always reachable.
    expect(screen.getByLabelText('Current configuration summary')).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Manufacturer' })).toBeInTheDocument();
  });

  it('flips step badges to complete as selections land in the store', async () => {
    renderWithQuery(<ConfiguratorSidebar />);
    await screen.findByRole('combobox', { name: 'Manufacturer' });

    const store = usePreviewStore.getState();
    act(() => store.selectVehicle(hiluxDetail.id));
    await waitFor(() => expect(screen.queryByText('Step 1')).not.toBeInTheDocument());

    act(() => store.selectWheel(te37Detail.id));
    await waitFor(() => expect(screen.queryByText('Step 2')).not.toBeInTheDocument());

    act(() => store.selectTyre(ps4Detail.id));
    await waitFor(() => expect(screen.queryByText('Step 3')).not.toBeInTheDocument());
  });
});
