import type { QuoteListParams } from '@/features/quotes/api/quotes';

/**
 * Hierarchical query keys for the quote domain. Mutations (create /
 * duplicate / archive) invalidate `quoteQueryKeys.root` so every list and
 * detail view settles on the server truth.
 */
export const quoteQueryKeys = {
  root: ['quotes'] as const,
  lists: () => [...quoteQueryKeys.root, 'list'] as const,
  list: (params: QuoteListParams) => [...quoteQueryKeys.root, 'list', params] as const,
  details: () => [...quoteQueryKeys.root, 'detail'] as const,
  detail: (id: string) => [...quoteQueryKeys.root, 'detail', id] as const,
};
