import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TyreSelector } from '@/features/preview/selection/tyre-selector';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { listEnvelope, ps4Detail, tyreSummaries } from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/tyres', () => ({
  listTyres: vi.fn(),
  getTyre: vi.fn(),
}));

import { getTyre, listTyres } from '@/features/catalog/api/tyres';

async function chooseComboOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(await screen.findByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('TyreSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    vi.mocked(listTyres).mockReset();
    vi.mocked(getTyre).mockReset();
    vi.mocked(listTyres).mockResolvedValue(listEnvelope(tyreSummaries));
    vi.mocked(getTyre).mockResolvedValue(ps4Detail);
  });

  it('resolves a tyre through brand → pattern and unlocks the dimension cascade', async () => {
    const user = userEvent.setup();
    renderWithQuery(<TyreSelector />);

    await chooseComboOption(user, 'Tyre brand', 'Michelin');
    expect(usePreviewStore.getState().tyreId).toBeNull();

    await chooseComboOption(user, 'Tyre pattern', 'Pilot Sport 4');
    expect(usePreviewStore.getState().tyreId).toBe('ty-ps4');
    expect(getTyre).toHaveBeenCalledWith('ty-ps4');

    expect(await screen.findByLabelText('Width')).toBeEnabled();
  });

  it('resolves the exact profile through width → profile → diameter', async () => {
    usePreviewStore.getState().selectTyre('ty-ps4');
    const user = userEvent.setup();
    renderWithQuery(<TyreSelector />);

    await screen.findByLabelText('Width');
    await user.selectOptions(screen.getByLabelText('Width'), '265');
    expect(usePreviewStore.getState().tyreProfileId).toBeNull(); // cascade incomplete

    await user.selectOptions(screen.getByLabelText('Profile'), '65');
    expect(usePreviewStore.getState().tyreProfileId).toBeNull();

    await user.selectOptions(screen.getByLabelText('Diameter'), '17');
    expect(usePreviewStore.getState().tyreProfileId).toBe('pf-265-65-17');
    expect(screen.getByText(/Selected profile:/)).toHaveTextContent('265/65 R17');
  });

  it('keeps downstream cascade steps consistent (changing width resets the rest)', async () => {
    usePreviewStore.getState().selectTyre('ty-ps4');
    const user = userEvent.setup();
    renderWithQuery(<TyreSelector />);
    await screen.findByLabelText('Width');

    await user.selectOptions(screen.getByLabelText('Width'), '265');
    await user.selectOptions(screen.getByLabelText('Profile'), '65');
    await user.selectOptions(screen.getByLabelText('Diameter'), '17');
    expect(usePreviewStore.getState().tyreProfileId).toBe('pf-265-65-17');

    await user.selectOptions(screen.getByLabelText('Width'), '245');
    expect(usePreviewStore.getState().tyreProfileId).toBeNull();
    const diameter = screen.getByLabelText('Diameter') as HTMLSelectElement;
    expect(diameter.value).toBe('');
  });

  it('restores the stored profile into the dimension cascade', async () => {
    usePreviewStore.getState().selectTyre('ty-ps4');
    usePreviewStore.getState().selectTyreProfile('pf-245-70-16');
    renderWithQuery(<TyreSelector />);

    await waitFor(() => {
      expect((screen.getByLabelText('Width') as HTMLSelectElement).value).toBe('245');
    });
    expect((screen.getByLabelText('Profile') as HTMLSelectElement).value).toBe('70');
    expect((screen.getByLabelText('Diameter') as HTMLSelectElement).value).toBe('16');
  });

  it('shows an empty state when the tenant has no tyres', async () => {
    vi.mocked(listTyres).mockResolvedValue(listEnvelope([], 0));
    renderWithQuery(<TyreSelector />);
    expect(await screen.findByText('No tyres published yet')).toBeInTheDocument();
  });
});
