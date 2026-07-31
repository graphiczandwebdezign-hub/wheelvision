import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useDebouncedValue } from '@/features/preview/hooks/use-debounced-value';
import { useOnlineStatus } from '@/features/preview/hooks/use-online-status';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { hiluxDetail, ps4Detail, te37Detail } from '../helpers/catalog-fixtures';

vi.mock('@/features/catalog/api/vehicles', () => ({
  listVehicles: vi.fn(),
  getVehicle: vi.fn(),
}));
vi.mock('@/features/catalog/api/wheels', () => ({
  listWheels: vi.fn(),
  getWheel: vi.fn(),
}));
vi.mock('@/features/catalog/api/tyres', () => ({
  listTyres: vi.fn(),
  getTyre: vi.fn(),
}));

import { getVehicle } from '@/features/catalog/api/vehicles';
import { getWheel } from '@/features/catalog/api/wheels';
import { getTyre } from '@/features/catalog/api/tyres';

/** One QueryClient per wrapper (creating it inside the component body would
 * reset the cache on every re-render and queries would never resolve). */
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only emits after the value is stable for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 150), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('a'); // still within the window

    rerender({ value: 'abc' });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('abc');
  });
});

describe('useOnlineStatus', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  it('tracks online/offline events', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});

describe('usePreviewSelection (data-flow seam)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreviewStore.getState().resetConfiguration();
    vi.clearAllMocks();
    vi.mocked(getVehicle).mockResolvedValue(hiluxDetail);
    vi.mocked(getWheel).mockResolvedValue(te37Detail);
    vi.mocked(getTyre).mockResolvedValue(ps4Detail);
  });

  it('stays idle (no fetches) with an empty selection', () => {
    const { result } = renderHook(() => usePreviewSelection(), { wrapper: makeWrapper() });
    expect(result.current.vehicle).toBeUndefined();
    expect(result.current.resolving).toBe(false);
    expect(getVehicle).not.toHaveBeenCalled();
    expect(getWheel).not.toHaveBeenCalled();
    expect(getTyre).not.toHaveBeenCalled();
  });

  it('resolves the selected ids through React Query detail hooks', async () => {
    const store = usePreviewStore.getState();
    store.selectVehicle(hiluxDetail.id);
    store.selectWheel(te37Detail.id);
    store.selectWheelFinish('Matte Black');
    store.selectWheelSize('sz-18x8');
    store.selectTyre(ps4Detail.id);
    store.selectTyreProfile('pf-265-65-17');

    const { result } = renderHook(() => usePreviewSelection(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.vehicle?.id).toBe(hiluxDetail.id);
    });
    await waitFor(() => {
      expect(result.current.wheel?.id).toBe(te37Detail.id);
      expect(result.current.tyre?.id).toBe(ps4Detail.id);
    });

    expect(getVehicle).toHaveBeenCalledWith(hiluxDetail.id);
    expect(getWheel).toHaveBeenCalledWith(te37Detail.id);
    expect(getTyre).toHaveBeenCalledWith(ps4Detail.id);
    expect(result.current.wheelFinish).toBe('Matte Black');
    expect(result.current.wheelSizeId).toBe('sz-18x8');
    expect(result.current.tyreProfileId).toBe('pf-265-65-17');
    expect(result.current.resolving).toBe(false);
  });

  it('resolves each entity independently (partial selection)', async () => {
    usePreviewStore.getState().selectWheel(te37Detail.id);
    const { result } = renderHook(() => usePreviewSelection(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.wheel?.id).toBe(te37Detail.id));
    expect(result.current.vehicle).toBeUndefined();
    expect(getVehicle).not.toHaveBeenCalled();
  });
});
