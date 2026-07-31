import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';
import { useVehicle } from '@/features/catalog/hooks/use-vehicle';
import { useVehicles } from '@/features/catalog/hooks/use-vehicles';
import { useWheel } from '@/features/catalog/hooks/use-wheel';
import { useWheels } from '@/features/catalog/hooks/use-wheels';
import { useTyre } from '@/features/catalog/hooks/use-tyre';
import { useTyres } from '@/features/catalog/hooks/use-tyres';

/**
 * React Query hook tests: the hooks are the only component-facing data API,
 * so their keying, param pass-through, and idle-until-id behaviour are
 * pinned here. API functions are mocked at the module boundary.
 */

const vehiclesApi = vi.hoisted(() => ({ listVehicles: vi.fn(), getVehicle: vi.fn() }));
vi.mock('@/features/catalog/api/vehicles', () => vehiclesApi);

const wheelsApi = vi.hoisted(() => ({ listWheels: vi.fn(), getWheel: vi.fn() }));
vi.mock('@/features/catalog/api/wheels', () => wheelsApi);

const tyresApi = vi.hoisted(() => ({ listTyres: vi.fn(), getTyre: vi.fn() }));
vi.mock('@/features/catalog/api/tyres', () => tyresApi);

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function QueryWrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

const paged = (rows: unknown[], page = 1) => ({
  data: rows,
  meta: { page, pageSize: 20, total: rows.length, totalPages: 1 },
});

describe('catalog query keys', () => {
  it('builds hierarchical keys for lists and details', () => {
    expect(catalogQueryKeys.root).toEqual(['catalog']);
    expect(catalogQueryKeys.vehicles.list({ page: 2 })).toEqual([
      'catalog',
      'vehicles',
      'list',
      { page: 2 },
    ]);
    expect(catalogQueryKeys.wheels.detail('w1')).toEqual(['catalog', 'wheels', 'detail', 'w1']);
    expect(catalogQueryKeys.tyres.lists()).toEqual(['catalog', 'tyres', 'list']);
  });
});

describe('useVehicles', () => {
  it('loads the page and exposes envelope data', async () => {
    vehiclesApi.listVehicles.mockResolvedValue(paged([{ id: 'v1' }]));

    const { result } = renderHook(() => useVehicles({ page: 2, pageSize: 5 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vehiclesApi.listVehicles).toHaveBeenCalledWith({ page: 2, pageSize: 5 });
    expect(result.current.data?.data).toEqual([{ id: 'v1' }]);
  });
});

describe('useVehicle', () => {
  it('stays idle until an id exists, then loads the detail', async () => {
    vehiclesApi.getVehicle.mockResolvedValue({ id: 'v1' });

    const { result, rerender } = renderHook(({ id }) => useVehicle(id), {
      initialProps: { id: undefined as string | undefined },
      wrapper: wrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(vehiclesApi.getVehicle).not.toHaveBeenCalled();

    rerender({ id: 'v1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vehiclesApi.getVehicle).toHaveBeenCalledWith('v1');
    expect(result.current.data).toEqual({ id: 'v1' });
  });
});

describe('useWheels / useWheel', () => {
  it('loads the wheel page', async () => {
    wheelsApi.listWheels.mockResolvedValue(paged([{ id: 'w1' }]));

    const { result } = renderHook(() => useWheels(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(wheelsApi.listWheels).toHaveBeenCalledWith({});
  });

  it('loads a wheel detail by id', async () => {
    wheelsApi.getWheel.mockResolvedValue({ id: 'w1' });

    const { result } = renderHook(() => useWheel('w1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(wheelsApi.getWheel).toHaveBeenCalledWith('w1');
  });
});

describe('useTyres / useTyre', () => {
  it('loads the tyre page', async () => {
    tyresApi.listTyres.mockResolvedValue(paged([{ id: 't1' }]));

    const { result } = renderHook(() => useTyres({ page: 1 }), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tyresApi.listTyres).toHaveBeenCalledWith({ page: 1 });
  });

  it('loads a tyre detail by id', async () => {
    tyresApi.getTyre.mockResolvedValue({ id: 't1' });

    const { result } = renderHook(() => useTyre('t1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tyresApi.getTyre).toHaveBeenCalledWith('t1');
  });
});
