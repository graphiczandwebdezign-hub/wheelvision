'use client';

import { useQuery } from '@tanstack/react-query';
import { getQuote } from '@/features/quotes/api/quotes';
import { quoteQueryKeys } from '@/features/quotes/queries/query-keys';

/** Single quote detail. Idle until an id exists (compose mode, closed dialog). */
export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: quoteQueryKeys.detail(id ?? '__pending__'),
    queryFn: () => getQuote(id as string),
    enabled: id !== undefined,
  });
}
