import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  copyConfigurationLink,
  useConfigurationLinkSync,
} from '@/features/preview/hooks/use-configuration-link';
import {
  CONFIG_LINK_PARAM,
  serialiseConfiguration,
} from '@/features/preview/state/configuration-link';
import { usePreviewStore, type PreviewSelection } from '@/features/preview/state/preview-store';
import { resetToastIds, useToastStore } from '@/components/ui/toast-store';

const linkSelection: PreviewSelection = {
  vehicleId: 'veh-shared',
  colour: 'Silver',
  wheelId: 'wh-shared',
  wheelFinish: null,
  wheelSizeId: null,
  tyreId: null,
  tyreProfileId: null,
};

function setLocation(search: string) {
  window.history.replaceState(null, '', `/preview${search}`);
}

describe('useConfigurationLinkSync', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    useToastStore.getState().clear();
    resetToastIds();
  });
  afterEach(() => {
    setLocation('');
  });

  it('restores a valid shared link over the persisted selection and cleans the URL', async () => {
    // Persisted state loses to the link.
    usePreviewStore.getState().selectVehicle('veh-persisted');
    setLocation(`?${CONFIG_LINK_PARAM}=${serialiseConfiguration(linkSelection)}`);

    renderHook(() => useConfigurationLinkSync());

    await waitFor(() => {
      expect(usePreviewStore.getState().vehicleId).toBe('veh-shared');
    });
    expect(usePreviewStore.getState().colour).toBe('Silver');
    expect(usePreviewStore.getState().wheelId).toBe('wh-shared');
    expect(window.location.search).toBe('');
    expect(useToastStore.getState().toasts.some((t) => t.kind === 'success')).toBe(true);
  });

  it('ignores the page when no config parameter is present', async () => {
    usePreviewStore.getState().selectVehicle('veh-persisted');
    renderHook(() => useConfigurationLinkSync());

    await waitFor(() => expect(true).toBe(true)); // effect flush
    expect(usePreviewStore.getState().vehicleId).toBe('veh-persisted');
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('ignores malformed links without toasts or state loss', async () => {
    usePreviewStore.getState().selectVehicle('veh-persisted');
    setLocation(`?${CONFIG_LINK_PARAM}=garbage-token`);

    renderHook(() => useConfigurationLinkSync());

    await waitFor(() => expect(true).toBe(true));
    expect(usePreviewStore.getState().vehicleId).toBe('veh-persisted');
    expect(window.location.search).toContain(CONFIG_LINK_PARAM); // untouched
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('copyConfigurationLink', () => {
  beforeEach(() => {
    setLocation('');
  });

  it('writes the share URL to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const ok = await copyConfigurationLink(linkSelection);

    expect(ok).toBe(true);
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain(`${CONFIG_LINK_PARAM}=`);
    expect(written.startsWith(`${window.location.origin}/preview`)).toBe(true);
  });

  it('resolves false when the clipboard is unavailable', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    });
    await expect(copyConfigurationLink(linkSelection)).resolves.toBe(false);
  });
});
