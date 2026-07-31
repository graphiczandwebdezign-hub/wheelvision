import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigurationSummary } from '@/features/preview/selection/configuration-summary';
import {
  createLocalConfigurationStorage,
  SAVED_CONFIGURATIONS_STORAGE_KEY,
  type KeyValueStorage,
} from '@/features/preview/state/configuration-storage';
import { createLocalConsultantProfileStorage } from '@/features/preview/state/consultant-profiles';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';
import { useValidationNoticeStore } from '@/features/preview/state/validation-notices';
import { resetToastIds, useToastStore } from '@/components/ui/toast-store';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';
import { renderWithQuery } from '../helpers/render';

vi.mock('@/features/catalog/api/vehicles', () => ({ listVehicles: vi.fn(), getVehicle: vi.fn() }));
vi.mock('@/features/catalog/api/wheels', () => ({ listWheels: vi.fn(), getWheel: vi.fn() }));
vi.mock('@/features/catalog/api/tyres', () => ({ listTyres: vi.fn(), getTyre: vi.fn() }));

import { getVehicle } from '@/features/catalog/api/vehicles';
import { getWheel } from '@/features/catalog/api/wheels';
import { getTyre } from '@/features/catalog/api/tyres';

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function selectFullConfiguration() {
  const store = usePreviewStore.getState();
  store.selectVehicle(hiluxDetail.id);
  store.selectColour('Silver');
  store.selectWheel(te37Detail.id);
  store.selectWheelFinish('Matte Black');
  store.selectWheelSize('sz-18x8');
  store.selectTyre(ps4Detail.id);
  store.selectTyreProfile('pf-265-65-17');
}

describe('ConfigurationSummary', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    useConsultantStore.setState({
      storage: createLocalConsultantProfileStorage(memoryStorage()),
      profiles: [],
      activeId: null,
      hydrated: true,
    });
    useValidationNoticeStore.getState().dismiss();
    useQuoteUiStore.setState({ open: false, quoteId: null, historyOpen: false });
    useToastStore.getState().clear();
    resetToastIds();
    vi.mocked(getVehicle).mockReset().mockResolvedValue(hiluxDetail);
    vi.mocked(getWheel).mockReset().mockResolvedValue(te37Detail);
    vi.mocked(getTyre).mockReset().mockResolvedValue(ps4Detail);
  });

  it('shows the resolved selection rows once the details arrive', async () => {
    selectFullConfiguration();
    renderWithQuery(<ConfigurationSummary />);

    expect(await screen.findByText('2025 Toyota Hilux SR5 Double Cab')).toBeInTheDocument();
    expect(screen.getByText('Rays TE37')).toBeInTheDocument();
    expect(screen.getByText('Matte Black')).toBeInTheDocument();
    expect(screen.getByText('18×8.0J')).toBeInTheDocument();
    expect(screen.getByText('Michelin Pilot Sport 4')).toBeInTheDocument();
    expect(screen.getByText('265/65 R17')).toBeInTheDocument();
  });

  it('saves the configuration to injected storage and notifies', async () => {
    selectFullConfiguration();
    const backend = memoryStorage();
    const storage = createLocalConfigurationStorage(backend);
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary storage={storage} />);

    const save = await screen.findByRole('button', { name: 'Save configuration on this device' });
    await user.click(save);

    const saved = storage.list();
    expect(saved).toHaveLength(1);
    expect(saved[0].label).toBe('2025 Toyota Hilux SR5 Double Cab');
    expect(saved[0].selection).toEqual({
      vehicleId: hiluxDetail.id,
      colour: 'Silver',
      wheelId: te37Detail.id,
      wheelFinish: 'Matte Black',
      wheelSizeId: 'sz-18x8',
      tyreId: ps4Detail.id,
      tyreProfileId: 'pf-265-65-17',
    });
    expect(backend.getItem(SAVED_CONFIGURATIONS_STORAGE_KEY)).toBeTruthy();
    expect(useToastStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true);
  });

  it('disables save before a vehicle is chosen and while offline', async () => {
    renderWithQuery(<ConfigurationSummary online={false} />);
    const save = await screen.findByRole('button', { name: 'Save configuration on this device' });
    expect(save).toBeDisabled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('resets the configuration and says so', async () => {
    selectFullConfiguration();
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary />);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(usePreviewStore.getState().vehicleId).toBeNull();
    expect(usePreviewStore.getState().wheelId).toBeNull();
    expect(useToastStore.getState().toasts.some((t) => t.kind === 'info')).toBe(true);
  });

  it('lists saved configurations in a dialog and removes them', async () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    selectFullConfiguration();
    const saved = storage.save({
      selection: {
        vehicleId: hiluxDetail.id,
        colour: null,
        wheelId: null,
        wheelFinish: null,
        wheelSizeId: null,
        tyreId: null,
        tyreProfileId: null,
      },
      label: '2025 Toyota Hilux SR5 Double Cab',
    });

    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary storage={storage} />);

    await user.click(screen.getByRole('button', { name: 'Saved' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('2025 Toyota Hilux SR5 Double Cab')).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Remove 2025 Toyota Hilux SR5 Double Cab' }),
    );
    expect(storage.list().find((item) => item.id === saved.id)).toBeUndefined();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('copies a share link for the current selection', async () => {
    selectFullConfiguration();
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary />);

    const share = await screen.findByRole('button', { name: 'Copy share link' });
    await screen.findByText('2025 Toyota Hilux SR5 Double Cab'); // wait for "started"
    await user.click(share);

    // userEvent maintains a virtual clipboard — read back what the app wrote.
    await waitFor(async () => {
      const written = await window.navigator.clipboard.readText();
      expect(written).toContain('config=');
    });
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true),
    );
  });

  it('disables Share before a vehicle is chosen', async () => {
    renderWithQuery(<ConfigurationSummary />);
    expect(await screen.findByRole('button', { name: 'Copy share link' })).toBeDisabled();
  });

  it('notifies gracefully when the clipboard is unavailable', async () => {
    selectFullConfiguration();
    // fireEvent (unlike userEvent) does not stub the clipboard, so the denial
    // stub reaches the code under test.
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    });

    renderWithQuery(<ConfigurationSummary />);
    const share = await screen.findByRole('button', { name: 'Copy share link' });
    await screen.findByText('2025 Toyota Hilux SR5 Double Cab');
    fireEvent.click(share);

    await waitFor(() =>
      expect(useToastStore.getState().toasts.some((t) => t.kind === 'error')).toBe(true),
    );
  });

  it('opens the quote workspace once the seven-field selection is complete', async () => {
    selectFullConfiguration();
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary />);

    const quote = await screen.findByRole('button', { name: 'Generate Quote' });
    expect(quote).toBeEnabled();
    await user.click(quote);

    expect(useQuoteUiStore.getState().open).toBe(true);
    expect(useQuoteUiStore.getState().quoteId).toBeNull();
  });

  it('keeps Generate Quote disabled with its requirement hint while the selection is incomplete', async () => {
    renderWithQuery(<ConfigurationSummary />);

    const quote = await screen.findByRole('button', { name: 'Generate Quote' });
    expect(quote).toBeDisabled();
    const hintId = quote.getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId as string)).toHaveTextContent(
      'Complete the vehicle, colour, wheel and tyre selection to generate a quote.',
    );
  });

  it('opens the quote history from the secondary action', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary />);

    await user.click(await screen.findByRole('button', { name: 'View quote history' }));
    expect(useQuoteUiStore.getState().historyOpen).toBe(true);
  });

  it('prints the handout through the browser print pipeline', async () => {
    const printSpy = vi.fn();
    const originalPrint = window.print;
    Object.defineProperty(window, 'print', {
      value: printSpy,
      configurable: true,
      writable: true,
    });
    try {
      selectFullConfiguration();
      const user = userEvent.setup();
      renderWithQuery(<ConfigurationSummary />);
      await screen.findByText('2025 Toyota Hilux SR5 Double Cab');

      await user.click(screen.getByRole('button', { name: 'Print configuration handout' }));
      expect(printSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'print', {
        value: originalPrint,
        configurable: true,
        writable: true,
      });
    }
  });

  it('keeps Print disabled before a vehicle is chosen', async () => {
    renderWithQuery(<ConfigurationSummary />);
    expect(
      await screen.findByRole('button', { name: 'Print configuration handout' }),
    ).toBeDisabled();
  });

  it('explains when the browser cannot print instead of crashing', async () => {
    const originalPrint = window.print;
    Object.defineProperty(window, 'print', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      selectFullConfiguration();
      const user = userEvent.setup();
      renderWithQuery(<ConfigurationSummary />);
      await screen.findByText('2025 Toyota Hilux SR5 Double Cab');

      await user.click(screen.getByRole('button', { name: 'Print configuration handout' }));
      expect(
        useToastStore
          .getState()
          .toasts.some((t) => t.kind === 'error' && t.message.includes('not available')),
      ).toBe(true);
    } finally {
      Object.defineProperty(window, 'print', {
        value: originalPrint,
        configurable: true,
        writable: true,
      });
    }
  });

  it('stamps the active consultant on saves and says whose list it went to', async () => {
    const profileStorage = createLocalConsultantProfileStorage(memoryStorage());
    profileStorage.create('Thandi');
    const profileId = profileStorage.list()[0].id;
    profileStorage.setActive(profileId);
    useConsultantStore.setState({
      storage: profileStorage,
      profiles: profileStorage.list(),
      activeId: profileId,
      hydrated: true,
    });

    const storage = createLocalConfigurationStorage(memoryStorage());
    selectFullConfiguration();
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary storage={storage} />);
    await screen.findByText('2025 Toyota Hilux SR5 Double Cab');
    await user.click(screen.getByRole('button', { name: 'Save configuration on this device' }));

    expect(storage.list(profileId)).toHaveLength(1);
    expect(storage.list(profileId)[0].ownerId).toBe(profileId);
    expect(storage.list(null)).toHaveLength(0);
    expect(
      useToastStore
        .getState()
        .toasts.some((t) => t.kind === 'success' && t.message.includes("Thandi's list")),
    ).toBe(true);
  });

  it('scopes the Saved dialog to the active consultant and back to the shared pool', async () => {
    const storage = createLocalConfigurationStorage(memoryStorage());
    const simpleSelection = {
      vehicleId: 'veh-x',
      colour: null,
      wheelId: null,
      wheelFinish: null,
      wheelSizeId: null,
      tyreId: null,
      tyreProfileId: null,
    };
    storage.save({ selection: simpleSelection, label: 'Pool build' });
    storage.save({ selection: simpleSelection, label: 'Thandi build', ownerId: 'p1' });
    useConsultantStore.setState({
      storage: createLocalConsultantProfileStorage(memoryStorage()),
      profiles: [{ id: 'p1', name: 'Thandi', createdAt: '2026-07-31T08:00:00.000Z' }],
      activeId: 'p1',
      hydrated: true,
    });

    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary storage={storage} />);
    await user.click(screen.getByRole('button', { name: 'Saved' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Thandi build')).toBeInTheDocument();
    expect(within(dialog).queryByText('Pool build')).toBeNull();

    act(() => {
      useConsultantStore.setState({ activeId: null });
    });
    await waitFor(() => expect(within(dialog).getByText('Pool build')).toBeInTheDocument());
    expect(within(dialog).queryByText('Thandi build')).toBeNull();
  });

  it('surfaces reconciliation adjustments inline until dismissed', async () => {
    useValidationNoticeStore.getState().publish({
      notices: [
        {
          field: 'wheel',
          message:
            'The selected wheel is no longer in the catalog — removed it (finish and size cleared too).',
        },
      ],
      originalSignature: 'orig',
      correctedSignature: 'corr',
    });
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationSummary />);

    expect(await screen.findByText('Adjusted to the current catalog')).toBeInTheDocument();
    expect(screen.getByText(/no longer in the catalog/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Adjusted to the current catalog')).toBeNull();
    expect(useValidationNoticeStore.getState().batch).toBeNull();
  });
});
