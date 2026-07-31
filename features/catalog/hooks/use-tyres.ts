'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogListParams } from '@/types/catalog';
import { listTyres } from '@/features/catalog/api/tyres';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Paginated tyre summaries. Pages retain previous data while fetching. */
export function useTyres(params: CatalogListParams = {}) {
  return useQuery({
    queryKey: catalogQueryKeys.tyres.list(params),
    queryFn: () => listTyres(params),
    placeholderData: keepPreviousData,
  });
}
