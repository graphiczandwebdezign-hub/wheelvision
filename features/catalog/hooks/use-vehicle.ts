'use client';

import { useQuery } from '@tanstack/react-query';
import { getVehicle } from '@/features/catalog/api/vehicles';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Single vehicle detail (colours, render metadata, asset refs). Idle until an id exists. */
export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: catalogQueryKeys.vehicles.detail(id ?? '__pending__'),
    queryFn: () => getVehicle(id as string),
    enabled: id !== undefined,
  });
}
