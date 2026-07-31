'use client';

import { formatCents } from '@/lib/money/currency';
import type { QuoteTotalsDto } from '@/types/quote';

/**
 * Money block — subtotal, discounts (when any), VAT and the grand total.
 * Display only: numbers arrive as integer cents from the server and are
 * formatted through the currency registry; nothing is computed here.
 */
export function QuoteTotals({ totals }: { readonly totals: QuoteTotalsDto }) {
  const format = (amountCents: number) => formatCents(amountCents, totals.currency);
  const vatPercent = totals.vatBasisPoints / 100;

  return (
    <dl className="flex flex-col gap-1.5 text-sm" aria-label="Quote totals">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-xs uppercase tracking-wider text-slate-500">Subtotal</dt>
        <dd className="text-slate-200">{format(totals.subtotalCents)}</dd>
      </div>
      {totals.discountCents > 0 ? (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs uppercase tracking-wider text-slate-500">Discount</dt>
          <dd className="text-emerald-400">−{format(totals.discountCents)}</dd>
        </div>
      ) : null}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-xs uppercase tracking-wider text-slate-500">VAT ({vatPercent}%)</dt>
        <dd className="text-slate-200">{format(totals.vatCents)}</dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-700 pt-2">
        <dt className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Total (VAT incl.)
        </dt>
        <dd className="text-lg font-bold text-slate-50">{format(totals.totalCents)}</dd>
      </div>
    </dl>
  );
}
