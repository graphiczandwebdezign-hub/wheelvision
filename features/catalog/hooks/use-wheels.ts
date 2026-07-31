'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogListParams } from '@/types/catalog';
import { listWheels } from '@/features/catalog/api/wheels';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Paginated wheel summaries. Pages retain previous data while fetching. */
export function useWheels(params: CatalogListParams = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.wheels.list(params),
    queryFn: () => listWheels(params),
    placeholderData: keepPreviousData,
  });
}
