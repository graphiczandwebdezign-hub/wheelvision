'use client';

import { useQuery } from '@tanstack/react-query';
import { getTyre } from '@/features/catalog/api/tyres';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Single tyre detail (decomposed profile specifications). Idle until an id exists. */
export function useTyre(id: string | undefined) {
  return useQuery({
    queryKey: catalogQueryKeys.tyres.detail(id ?? '__pending__'),
    queryFn: () => getTyre(id as string),
    enabled: id !== undefined,
  });
}
