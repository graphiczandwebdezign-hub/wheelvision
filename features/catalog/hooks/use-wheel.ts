'use client';

import { useQuery } from '@tanstack/react-query';
import { getWheel } from '@/features/catalog/api/wheels';
import { catalogQueryKeys } from '@/features/catalog/queries/query-keys';

/** Single wheel detail (finishes, sizes, bolt patterns, offsets, centre bores). Idle until an id exists. */
export function useWheel(id: string | undefined) {
  return useQuery({
    queryKey: catalogQueryKeys.wheels.detail(id ?? '__pending__'),
    queryFn: () => getWheel(id as string),
    enabled: id !== undefined,
  });
}
