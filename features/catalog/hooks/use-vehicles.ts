'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogListParams } from '@/types/catalog';
import { listVehicles } from '@/features/catalog/api/vehicles';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Paginated vehicle summaries. Pages retain previous data while fetching. */
export function useVehicles(params: CatalogListParams = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.vehicles.list(params),
    queryFn: () => listVehicles(params),
    placeholderData: keepPreviousData,
  });
}
