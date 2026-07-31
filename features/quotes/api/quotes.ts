import type { CatalogListParams } from '@/types/catalog';
import type { CreateQuoteRequest, QuoteDetail, QuoteStatus, QuoteSummary } from '@/types/quote';
import { getDetail, getList, postDetail, type PaginatedData } from '@/features/catalog/api/client';

/**
 * Typed boundary for `/api/quotes*` — the only path UI code uses to reach
 * the quote API. Pricing never appears here: the client sends the raw
 * configuration; every rand is computed server-side.
 */

export interface QuoteListParams extends CatalogListParams {
  readonly status?: QuoteStatus;
}

export function createQuote(input: CreateQuoteRequest): Promise<QuoteDetail> {
  return postDetail<QuoteDetail>('/quotes', input);
}

export function listQuotes(params?: QuoteListParams): Promise<PaginatedData<QuoteSummary>> {
  return getList<QuoteSummary>('/quotes', params);
}

export function getQuote(id: string): Promise<QuoteDetail> {
  return getDetail<QuoteDetail>(`/quotes/${id}`);
}

export function duplicateQuote(id: string): Promise<QuoteDetail> {
  return postDetail<QuoteDetail>(`/quotes/${id}/duplicate`);
}

export function archiveQuote(id: string): Promise<QuoteDetail> {
  return postDetail<QuoteDetail>(`/quotes/${id}/archive`);
}
