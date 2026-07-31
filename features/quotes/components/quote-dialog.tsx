'use client';

import { useState } from 'react';
import { Button, Dialog, ErrorState, LoadingSkeleton, toast } from '@/components/ui';
import { ApiClientError } from '@/features/catalog/api/client';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';
import { buildConfigurationRows } from '@/features/preview/selection/configuration-rows';
import { useConsultantStore } from '@/features/preview/state/consultant-store';
import { usePreviewStore, type PreviewSelection } from '@/features/preview/state/preview-store';
import { QuoteActions } from '@/features/quotes/components/quote-actions';
import {
  QuoteCustomer,
  type QuoteCustomerDraft,
  type QuoteCustomerErrors,
} from '@/features/quotes/components/quote-customer';
import { QuotePricing } from '@/features/quotes/components/quote-pricing';
import { QuotePrint } from '@/features/quotes/components/quote-print';
import { QuoteShare } from '@/features/quotes/components/quote-share';
import { QuoteSummary } from '@/features/quotes/components/quote-summary';
import { QuoteTotals } from '@/features/quotes/components/quote-totals';
import { useCreateQuote } from '@/features/quotes/hooks/use-quote-mutations';
import { useQuote } from '@/features/quotes/hooks/use-quote';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';
import { quoteCustomerSchema } from '@/server/validators/quote-schemas';
import type { CreateQuoteRequest } from '@/types/quote';

function isComplete(configuration: PreviewSelection): boolean {
  return Object.values(configuration).every((value) => value !== null);
}

/** Extract an `details.missingPrices` list from a 400 pricing rejection. */
function missingPricesOf(error: ApiClientError): string[] {
  const value = error.details?.missingPrices;
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Quote workspace — the dealership's commercial surface. Two modes:
 *
 * - Compose (no quote id): reviews the completed configuration, captures the
 *   customer, and issues the quotation. All money is priced server-side on
 *   submit; the UI shows the issued result afterwards.
 * - View (quote id): the immutable issued quotation — summary, line items,
 *   totals, share transports, lifecycle actions and the print document.
 */
export function QuoteDialog() {
  const open = useQuoteUiStore((state) => state.open);
  const quoteId = useQuoteUiStore((state) => state.quoteId);
  const close = useQuoteUiStore((state) => state.close);

  return (
    <Dialog
      open={open}
      onClose={close}
      title={quoteId === null ? 'Generate Quote' : 'Quotation'}
      description={
        quoteId === null
          ? 'Confirm the customer and issue a priced quotation for this configuration.'
          : undefined
      }
      className="max-w-2xl"
    >
      {quoteId === null ? <ComposeQuote onClose={close} /> : <ViewQuote quoteId={quoteId} />}
    </Dialog>
  );
}

function ComposeQuote({ onClose }: { readonly onClose: () => void }) {
  const selection = usePreviewSelection();
  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const colour = usePreviewStore((state) => state.colour);
  const wheelId = usePreviewStore((state) => state.wheelId);
  const wheelFinish = usePreviewStore((state) => state.wheelFinish);
  const wheelSizeId = usePreviewStore((state) => state.wheelSizeId);
  const tyreId = usePreviewStore((state) => state.tyreId);
  const tyreProfileId = usePreviewStore((state) => state.tyreProfileId);
  const configuration: PreviewSelection = {
    vehicleId,
    colour,
    wheelId,
    wheelFinish,
    wheelSizeId,
    tyreId,
    tyreProfileId,
  };
  const complete = isComplete(configuration);

  const activeId = useConsultantStore((state) => state.activeId);
  const activeConsultant = useConsultantStore((state) =>
    state.profiles.find((profile) => profile.id === state.activeId),
  );

  const [draft, setDraft] = useState<QuoteCustomerDraft>({ name: '', email: '', phone: '' });
  const [consultantName, setConsultantName] = useState(activeConsultant?.name ?? '');
  const [errors, setErrors] = useState<QuoteCustomerErrors>({});
  const [submitError, setSubmitError] = useState<{
    message: string;
    missingPrices: string[];
  } | null>(null);
  const createMutation = useCreateQuote();
  const openWithQuoteId = useQuoteUiStore((state) => state.openWithQuoteId);

  const rows = buildConfigurationRows(selection);

  const onIssue = () => {
    const parsed = quoteCustomerSchema.safeParse({
      name: draft.name,
      email: draft.email.trim().length === 0 ? null : draft.email,
      phone: draft.phone.trim().length === 0 ? null : draft.phone,
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.reduce<QuoteCustomerErrors>((acc, issue) => {
        const field = issue.path[0];
        if (field === 'name') {
          return { ...acc, name: 'The customer name is required.' };
        }
        if (field === 'email') {
          return { ...acc, email: 'Enter a valid email address.' };
        }
        if (field === 'phone') {
          return { ...acc, phone: 'Enter a reachable phone number.' };
        }
        return acc;
      }, {});
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);

    const request: CreateQuoteRequest = {
      configuration: { ...configuration },
      customer: parsed.data,
      consultantName: consultantName.trim().length === 0 ? null : consultantName.trim(),
    };

    createMutation.mutate(request, {
      onSuccess: (quote) => {
        toast({ kind: 'success', message: `Quotation ${quote.quoteNumber} issued.` });
        openWithQuoteId(quote.id);
      },
      onError: (error) => {
        if (error instanceof ApiClientError) {
          setSubmitError({ message: error.message, missingPrices: missingPricesOf(error) });
        } else {
          setSubmitError({
            message: 'Could not issue the quotation. Try again.',
            missingPrices: [],
          });
        }
      },
    });
  };

  if (!complete) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Complete the vehicle, wheel and tyre selection before generating a quote — pricing is only
          meaningful on a finished package.
        </p>
        <Button variant="secondary" onClick={onClose}>
          Back to configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className={value ? 'text-slate-200' : 'text-slate-600'}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <QuoteCustomer
        draft={draft}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        errors={errors}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="quote-consultant-name"
          className="text-xs font-medium uppercase tracking-wider text-slate-400"
        >
          Consultant (optional)
        </label>
        <input
          id="quote-consultant-name"
          type="text"
          autoComplete="off"
          placeholder={activeConsultant?.name ?? 'Showroom floor'}
          value={consultantName}
          onChange={(event) => setConsultantName(event.target.value)}
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
      </div>

      {submitError ? (
        <div role="alert" className="rounded-lg bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          <p>{submitError.message}</p>
          {submitError.missingPrices.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-xs text-rose-300">
              {submitError.missingPrices.map((missing) => (
                <li key={missing}>{missing}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onIssue}
          loading={createMutation.isPending}
          disabled={selection.resolving}
        >
          Issue quotation
        </Button>
      </div>
    </div>
  );
}

function ViewQuote({ quoteId }: { readonly quoteId: string }) {
  const quoteQuery = useQuote(quoteId);

  if (quoteQuery.isPending) {
    return <LoadingSkeleton lines={6} lineHeight="h-8" aria-label="Loading quotation" />;
  }

  if (quoteQuery.isError) {
    const notFound = quoteQuery.error instanceof ApiClientError && quoteQuery.error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Quote not found' : 'Quotation unavailable'}
        description={
          notFound
            ? 'This quote reference does not exist for this dealership — check the shared link.'
            : 'The quotation could not be loaded.'
        }
        onRetry={notFound ? undefined : () => void quoteQuery.refetch()}
      />
    );
  }

  const quote = quoteQuery.data;
  return (
    <div className="flex flex-col gap-4">
      <QuoteSummary quote={quote} />
      <QuotePricing lines={quote.lines} currency={quote.totals.currency} />
      <QuoteTotals totals={quote.totals} />
      <QuoteShare quote={quote} />
      <QuoteActions quote={quote} />
      <QuotePrint quote={quote} />
    </div>
  );
}
