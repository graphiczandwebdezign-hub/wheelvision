'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listQuotes, type QuoteListParams } from '@/features/quotes/api/quotes';
import { quoteQueryKeys } from '@/features/quotes/queries/query-keys';

/** Paginated quote history for the tenant (pages keep previous data while fetching). */
export function useQuotes(params: QuoteListParams = {}) {
  return useQuery({
    queryKey: quoteQueryKeys.list(params),
    queryFn: () => listQuotes(params),
    placeholderData: keepPreviousData,
  });
}
