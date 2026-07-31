import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { ApiClientError } from '@/features/catalog/api/client';
import { useConfigurationValidation } from '@/features/preview/hooks/use-configuration-validation';
import { usePreviewStore } from '@/features/preview/state/preview-store';
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

function notFound(): ApiClientError {
  return new ApiClientError('Not found', 404, 'NOT_FOUND', null);
}

function networkFailure(): ApiClientError {
  return new ApiClientError('unreachable', 0, 'NETWORK_ERROR', null);
}

function Probe() {
  useConfigurationValidation();
  return null;
}

describe('useConfigurationValidation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    useValidationNoticeStore.getState().dismiss();
    useToastStore.getState().clear();
    resetToastIds();
    vi.mocked(getVehicle).mockReset().mockResolvedValue(hiluxDetail);
    vi.mocked(getWheel).mockReset().mockResolvedValue(te37Detail);
    vi.mocked(getTyre).mockReset().mockResolvedValue(ps4Detail);
  });

  it('does nothing while nothing is selected', async () => {
    renderWithQuery(<Probe />);
    await waitFor(() => expect(useValidationNoticeStore.getState().batch).toBeNull());
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('leaves a valid restored selection alone', async () => {
    const store = usePreviewStore.getState();
    store.selectVehicle(hiluxDetail.id);
    store.selectColour('Silver');
    store.selectWheel(te37Detail.id);
    store.selectWheelFinish('Matte Black');
    store.selectWheelSize('sz-18x8');
    store.selectTyre(ps4Detail.id);
    store.selectTyreProfile('pf-265-65-17');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(usePreviewStore.getState().wheelSizeId).toBe('sz-18x8'));
    await waitFor(() => expect(useValidationNoticeStore.getState().batch).toBeNull());
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(usePreviewStore.getState().vehicleId).toBe(hiluxDetail.id);
  });

  it('clears a restored vehicle id the catalog no longer has (404), with notice + toast', async () => {
    vi.mocked(getVehicle).mockRejectedValue(notFound());
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-delisted');
    store.selectColour('Silver');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(usePreviewStore.getState().vehicleId).toBeNull());
    expect(usePreviewStore.getState().colour).toBeNull();

    const batch = useValidationNoticeStore.getState().batch;
    expect(batch).not.toBeNull();
    expect(batch?.notices.map((notice) => notice.field)).toEqual(['vehicle']);
    expect(useToastStore.getState().toasts.some((toast) => toast.kind === 'warning')).toBe(true);
  });

  it('clears only the colour when the vehicle loads but no longer lists it', async () => {
    const store = usePreviewStore.getState();
    store.selectVehicle(hiluxDetail.id);
    store.selectColour('Candy Red');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(usePreviewStore.getState().colour).toBeNull());
    expect(usePreviewStore.getState().vehicleId).toBe(hiluxDetail.id);
    const batch = useValidationNoticeStore.getState().batch;
    expect(batch?.notices.map((notice) => notice.field)).toEqual(['colour']);
  });

  it('corrects a delisted wheel while leaving vehicle and tyre intact', async () => {
    vi.mocked(getWheel).mockRejectedValue(notFound());
    const store = usePreviewStore.getState();
    store.selectVehicle(hiluxDetail.id);
    store.selectWheel('wh-delisted');
    store.selectWheelFinish('Matte Black');
    store.selectWheelSize('sz-18x8');
    store.selectTyre(ps4Detail.id);
    store.selectTyreProfile('pf-265-65-17');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(usePreviewStore.getState().wheelId).toBeNull());
    expect(usePreviewStore.getState().wheelFinish).toBeNull();
    expect(usePreviewStore.getState().wheelSizeId).toBeNull();
    expect(usePreviewStore.getState().vehicleId).toBe(hiluxDetail.id);
    expect(usePreviewStore.getState().tyreId).toBe(ps4Detail.id);
    expect(useValidationNoticeStore.getState().batch?.notices.map((n) => n.field)).toEqual([
      'wheel',
    ]);
  });

  it('preserves the selection on transient failures (offline resilience)', async () => {
    vi.mocked(getVehicle).mockRejectedValue(networkFailure());
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-hilux-sr5');
    store.selectColour('Silver');
    renderWithQuery(<Probe />);

    // Give the query time to settle into its error state.
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(usePreviewStore.getState().vehicleId).toBe('veh-hilux-sr5');
    expect(usePreviewStore.getState().colour).toBe('Silver');
    expect(useValidationNoticeStore.getState().batch).toBeNull();
  });

  it('does not loop: after one correction the state is stable', async () => {
    vi.mocked(getVehicle).mockRejectedValue(notFound());
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-delisted');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(usePreviewStore.getState().vehicleId).toBeNull());
    const signatureAfterCorrection = JSON.stringify([
      usePreviewStore.getState().vehicleId,
      usePreviewStore.getState().colour,
    ]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(
      JSON.stringify([usePreviewStore.getState().vehicleId, usePreviewStore.getState().colour]),
    ).toBe(signatureAfterCorrection);
    // The notice stays visible after its own correction (waiting on the dealer).
    expect(useValidationNoticeStore.getState().batch).not.toBeNull();
    expect(
      useToastStore.getState().toasts.filter((toast) => toast.kind === 'warning'),
    ).toHaveLength(1);
  });

  it('retires the notice once the dealer changes the configuration afterwards', async () => {
    vi.mocked(getVehicle).mockRejectedValueOnce(notFound());
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-delisted');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(useValidationNoticeStore.getState().batch).not.toBeNull());

    act(() => {
      usePreviewStore.getState().selectVehicle(hiluxDetail.id);
    });
    await waitFor(() => expect(useValidationNoticeStore.getState().batch).toBeNull());
  });

  it('keeps the published notice while a follow-up correction is still being described', async () => {
    vi.mocked(getVehicle).mockRejectedValue(notFound());
    const store = usePreviewStore.getState();
    store.selectVehicle('veh-delisted');
    renderWithQuery(<Probe />);

    await waitFor(() => expect(useValidationNoticeStore.getState().batch).not.toBeNull());
    // Corrected signature unchanged on re-render → notice survives.
    const batch = useValidationNoticeStore.getState().batch;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(useValidationNoticeStore.getState().batch).toBe(batch);
  });
});
