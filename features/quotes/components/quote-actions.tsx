'use client';

import { Button, toast } from '@/components/ui';
import { useArchiveQuote, useDuplicateQuote } from '@/features/quotes/hooks/use-quote-mutations';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';
import { ApiClientError } from '@/features/catalog/api/client';
import type { QuoteDetail } from '@/types/quote';

/**
 * Lifecycle actions for an issued quotation: print (browser pipeline),
 * duplicate (re-price at current catalogue under a fresh number) and
 * archive. Content editing does not exist — immutability by design.
 */
export function QuoteActions({ quote }: { readonly quote: QuoteDetail }) {
  const openWithQuoteId = useQuoteUiStore((state) => state.openWithQuoteId);
  const duplicateMutation = useDuplicateQuote();
  const archiveMutation = useArchiveQuote();
  const archived = quote.status === 'ARCHIVED';

  const onPrint = () => {
    if (typeof window.print !== 'function') {
      toast({
        kind: 'error',
        message: 'Printing is not available in this browser — use the browser menu instead.',
      });
      return;
    }
    window.print();
  };

  const onDuplicate = () => {
    duplicateMutation.mutate(quote.id, {
      onSuccess: (duplicate) => {
        toast({ kind: 'success', message: `Duplicated as ${duplicate.quoteNumber}.` });
        openWithQuoteId(duplicate.id);
      },
      onError: (error) => {
        toast({
          kind: 'error',
          message:
            error instanceof ApiClientError ? error.message : 'Could not duplicate this quote.',
        });
      },
    });
  };

  const onArchive = () => {
    archiveMutation.mutate(quote.id, {
      onSuccess: () => {
        toast({ kind: 'info', message: `${quote.quoteNumber} archived.` });
      },
      onError: (error) => {
        toast({
          kind: 'error',
          message:
            error instanceof ApiClientError ? error.message : 'Could not archive this quote.',
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-2" aria-label="Quote actions">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="primary" size="sm" fullWidth onClick={onPrint}>
          Print quotation
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onDuplicate}
          loading={duplicateMutation.isPending}
          disabled={archiveMutation.isPending}
        >
          Duplicate
        </Button>
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={onArchive}
          loading={archiveMutation.isPending}
          disabled={archived || duplicateMutation.isPending}
          aria-label={archived ? `${quote.quoteNumber} already archived` : undefined}
        >
          {archived ? 'Archived' : 'Archive'}
        </Button>
      </div>
      {archived ? (
        <p role="status" className="text-xs text-slate-500">
          This quotation is archived — its content is final. Duplicate it to issue an updated offer
          at current pricing.
        </p>
      ) : null}
    </div>
  );
}
