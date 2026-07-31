'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  toast,
} from '@/components/ui';
import { formatCents } from '@/lib/money/currency';
import { ApiClientError } from '@/features/catalog/api/client';
import { useArchiveQuote, useDuplicateQuote } from '@/features/quotes/hooks/use-quote-mutations';
import { useQuotes } from '@/features/quotes/hooks/use-quotes';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';
import type { QuoteStatus } from '@/types/quote';

const PAGE_SIZE = 10;

const STATUS_FILTERS: ReadonlyArray<{ value: QuoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/**
 * The tenant's quote history: paginated list with recall (open), duplicate
 * and archive per row. Recall hands the id to the quote workspace; lifecycle
 * mutations go through the server and settle via query invalidation.
 */
export function QuoteHistory() {
  const historyOpen = useQuoteUiStore((state) => state.historyOpen);
  const closeHistory = useQuoteUiStore((state) => state.closeHistory);
  const openWithQuoteId = useQuoteUiStore((state) => state.openWithQuoteId);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuoteStatus | 'ALL'>('ALL');
  const params = { page, pageSize: PAGE_SIZE, ...(status === 'ALL' ? {} : { status }) };
  const quotesQuery = useQuotes(params);
  const duplicateMutation = useDuplicateQuote();
  const archiveMutation = useArchiveQuote();

  const envelope = quotesQuery.data;
  const quotes = envelope?.data ?? [];
  const meta = envelope?.meta;

  return (
    <Dialog
      open={historyOpen}
      onClose={closeHistory}
      title="Quote history"
      description="Issued quotations for this dealership — content is immutable; duplicate to re-price."
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={status === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {quotesQuery.isPending ? (
          <LoadingSkeleton lines={4} lineHeight="h-12" aria-label="Loading quotes" />
        ) : quotesQuery.isError ? (
          <ErrorState
            title="Quote history unavailable"
            description="The quote list could not be loaded."
            onRetry={() => void quotesQuery.refetch()}
          />
        ) : quotes.length === 0 ? (
          <EmptyState
            title="No quotes issued yet"
            description="Complete a configuration in the preview and generate the first quotation."
          />
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto" aria-label="Issued quotes">
            {quotes.map((quote) => (
              <li
                key={quote.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-slate-100">
                      {quote.quoteNumber}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {quote.customerName} · {formatCents(quote.totalCents, quote.currency)} · valid
                      until {new Date(quote.validUntil).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                  <Badge tone={quote.status === 'ISSUED' ? 'success' : 'neutral'}>
                    {quote.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Open ${quote.quoteNumber}`}
                    onClick={() => {
                      closeHistory();
                      openWithQuoteId(quote.id);
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Duplicate ${quote.quoteNumber}`}
                    disabled={duplicateMutation.isPending}
                    onClick={() => {
                      duplicateMutation.mutate(quote.id, {
                        onSuccess: (duplicate) => {
                          toast({
                            kind: 'success',
                            message: `Duplicated as ${duplicate.quoteNumber}.`,
                          });
                          closeHistory();
                          openWithQuoteId(duplicate.id);
                        },
                        onError: (error) => {
                          toast({
                            kind: 'error',
                            message:
                              error instanceof ApiClientError
                                ? error.message
                                : 'Could not duplicate this quote.',
                          });
                        },
                      });
                    }}
                  >
                    Duplicate
                  </Button>
                  {quote.status === 'ISSUED' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Archive ${quote.quoteNumber}`}
                      disabled={archiveMutation.isPending}
                      onClick={() => {
                        archiveMutation.mutate(quote.id, {
                          onSuccess: () =>
                            toast({ kind: 'info', message: `${quote.quoteNumber} archived.` }),
                          onError: (error) =>
                            toast({
                              kind: 'error',
                              message:
                                error instanceof ApiClientError
                                  ? error.message
                                  : 'Could not archive this quote.',
                            }),
                        });
                      }}
                    >
                      Archive
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {meta !== undefined && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <p>
              Page {meta.page} of {meta.totalPages}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
