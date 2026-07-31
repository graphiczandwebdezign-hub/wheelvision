'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveQuote, createQuote, duplicateQuote } from '@/features/quotes/api/quotes';
import { quoteQueryKeys } from '@/features/quotes/queries/query-keys';
import type { CreateQuoteRequest } from '@/types/quote';

/**
 * Quote lifecycle mutations. Every successful write invalidates the quote
 * root so open lists/details settle on server truth — the UI never patches
 * quote data locally (immutability is server-enforced anyway).
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteRequest) => createQuote(input),
    onSuccess: (quote) => {
      queryClient.setQueryData(quoteQueryKeys.detail(quote.id), quote);
      void queryClient.invalidateQueries({ queryKey: quoteQueryKeys.root });
    },
  });
}

export function useDuplicateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateQuote(id),
    onSuccess: (quote) => {
      queryClient.setQueryData(quoteQueryKeys.detail(quote.id), quote);
      void queryClient.invalidateQueries({ queryKey: quoteQueryKeys.root });
    },
  });
}

export function useArchiveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveQuote(id),
    onSuccess: (quote) => {
      queryClient.setQueryData(quoteQueryKeys.detail(quote.id), quote);
      void queryClient.invalidateQueries({ queryKey: quoteQueryKeys.root });
    },
  });
}
