import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WheelSelector } from '@/features/preview/selection/wheel-selector';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { listEnvelope, te37Detail, wheelSummaries } from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/wheels', () => ({
  listWheels: vi.fn(),
  getWheel: vi.fn(),
}));

import { getWheel, listWheels } from '@/features/catalog/api/wheels';

async function chooseComboOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(await screen.findByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('WheelSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    vi.mocked(listWheels).mockReset();
    vi.mocked(getWheel).mockReset();
    vi.mocked(listWheels).mockResolvedValue(listEnvelope(wheelSummaries));
    vi.mocked(getWheel).mockResolvedValue(te37Detail);
  });

  it('resolves a wheel through the brand → model cascade and loads sizes', async () => {
    const user = userEvent.setup();
    renderWithQuery(<WheelSelector />);

    await chooseComboOption(user, 'Rim brand', 'Rays');
    expect(usePreviewStore.getState().wheelId).toBeNull();

    await chooseComboOption(user, 'Rim model', 'TE37');
    expect(usePreviewStore.getState().wheelId).toBe('wh-te37');
    expect(getWheel).toHaveBeenCalledWith('wh-te37');

    expect(await screen.findByLabelText('Rim size')).toBeInTheDocument();
  });

  it('selects a finish and a size into the store', async () => {
    usePreviewStore.getState().selectWheel('wh-te37');
    const user = userEvent.setup();
    renderWithQuery(<WheelSelector />);

    const finish = await screen.findByLabelText('Rim finish');
    await user.selectOptions(finish, 'Matte Black');
    expect(usePreviewStore.getState().wheelFinish).toBe('Matte Black');

    const size = await screen.findByLabelText('Rim size');
    await waitFor(() => expect(within(size).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(size, 'sz-18x8');
    expect(usePreviewStore.getState().wheelSizeId).toBe('sz-18x8');
  });

  it('narrows the size list with the fitment filters', async () => {
    usePreviewStore.getState().selectWheel('wh-te37');
    const user = userEvent.setup();
    renderWithQuery(<WheelSelector />);

    await waitFor(() => expect(getWheel).toHaveBeenCalled());
    const size = await screen.findByLabelText('Rim size');
    await waitFor(() => {
      expect(within(size).getAllByRole('option')).toHaveLength(4); // placeholder + 3 sizes
    });

    await user.selectOptions(screen.getByLabelText('Filter sizes by diameter'), '18');
    await waitFor(() => {
      expect(within(size).getAllByRole('option')).toHaveLength(3); // placeholder + two 18″ sizes
    });

    await user.selectOptions(screen.getByLabelText('Filter sizes by offset'), '35');
    await waitFor(() => {
      expect(within(size).getAllByRole('option')).toHaveLength(2); // placeholder + 18×8.0J ET35
    });
  });

  it('clears a size that no longer matches tightened filters', async () => {
    usePreviewStore.getState().selectWheel('wh-te37');
    usePreviewStore.getState().selectWheelSize('sz-17x85');
    const user = userEvent.setup();
    renderWithQuery(<WheelSelector />);

    await waitFor(() => {
      const size = screen.getByLabelText('Rim size') as HTMLSelectElement;
      expect(size.value).toBe('sz-17x85');
    });

    await user.selectOptions(screen.getByLabelText('Filter sizes by diameter'), '18');
    await waitFor(() => expect(usePreviewStore.getState().wheelSizeId).toBeNull());
  });

  it('shows a retryable error state when the wheel catalog fails', async () => {
    vi.mocked(listWheels).mockReset();
    vi.mocked(listWheels)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(listEnvelope(wheelSummaries));

    const user = userEvent.setup();
    renderWithQuery(<WheelSelector />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Wheel catalog unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('combobox', { name: 'Rim brand' })).toBeInTheDocument();
  });
});
