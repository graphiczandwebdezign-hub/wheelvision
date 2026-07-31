'use client';

import { formatCents } from '@/lib/money/currency';
import { formatTyreProfile } from '@/features/preview/selection/tyre-facets';
import { formatWheelSize } from '@/features/preview/selection/wheel-facets';
import { QUOTE_DISCLAIMER, QUOTE_TERMS_AND_CONDITIONS } from '@/server/quote/quote-terms';
import type { QuoteDetail } from '@/types/quote';

/**
 * The professional quotation document — print-only (`hidden print:block`)
 * like the configuration handout it upgrades. Everything on paper comes from
 * the immutable quote: dealer, parties, package, line items, VAT, totals,
 * validity, terms, disclaimer, reference and the QR placeholder block.
 * Browser print only; no PDF engine (Sprint 8 constraint).
 */
export function QuotePrint({ quote }: { readonly quote: QuoteDetail }) {
  const snapshot = quote.snapshot;
  const format = (amountCents: number) => formatCents(amountCents, quote.totals.currency);
  const vatPercent = quote.totals.vatBasisPoints / 100;

  const packageRows: ReadonlyArray<readonly [string, string]> = snapshot
    ? [
        [
          'Vehicle',
          [
            snapshot.vehicle.year,
            snapshot.vehicle.manufacturer,
            snapshot.vehicle.model,
            snapshot.vehicle.variant,
          ]
            .filter((part) => part !== null)
            .join(' '),
        ],
        ['Colour', snapshot.colour ?? '—'],
        [
          'Wheel package',
          snapshot.wheel.size
            ? `${snapshot.wheel.brand} ${snapshot.wheel.model} ${formatWheelSize(snapshot.wheel.size)}${snapshot.wheel.finish ? ` — ${snapshot.wheel.finish}` : ''}`
            : `${snapshot.wheel.brand} ${snapshot.wheel.model}`,
        ],
        [
          'Tyres',
          snapshot.tyre.profile
            ? `${snapshot.tyre.brand} ${snapshot.tyre.pattern} ${formatTyreProfile(snapshot.tyre.profile)}`
            : `${snapshot.tyre.brand} ${snapshot.tyre.pattern}`,
        ],
      ]
    : [];

  return (
    <section
      aria-hidden="true"
      className="hidden bg-white text-slate-900 print:block"
      data-quote-print
    >
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {quote.dealer.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold">Quotation</h1>
          <p className="mt-1 text-sm text-slate-600">
            Reference <span className="font-mono font-semibold">{quote.quoteNumber}</span>
          </p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>
            Prepared{' '}
            <time dateTime={quote.createdAt}>
              {new Date(quote.createdAt).toLocaleDateString('en-ZA')}
            </time>
          </p>
          <p>
            Valid until{' '}
            <time dateTime={quote.validUntil}>
              {new Date(quote.validUntil).toLocaleDateString('en-ZA')}
            </time>
          </p>
          <p>Consultant: {quote.consultantName ?? 'Showroom floor'}</p>
        </div>
      </header>

      <section className="mt-4 flex justify-between gap-6 text-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Prepared for
          </h2>
          <p className="mt-1 font-semibold">{quote.customer.name}</p>
          {quote.customer.email ? <p>{quote.customer.email}</p> : null}
          {quote.customer.phone ? <p>{quote.customer.phone}</p> : null}
        </div>
        <div className="text-right">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dealer</h2>
          <p className="mt-1 font-semibold">{quote.dealer.name}</p>
          <p className="text-slate-600">{quote.dealer.slug}</p>
        </div>
      </section>

      {packageRows.length > 0 ? (
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            {packageRows.map(([label, value]) => (
              <tr key={label} className="border-b border-slate-300">
                <th
                  scope="row"
                  className="w-40 py-2 pr-4 text-left align-top font-semibold text-slate-700"
                >
                  {label}
                </th>
                <td className="py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left text-xs uppercase tracking-wider text-slate-600">
            <th scope="col" className="py-2 pr-3">
              Description
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Qty
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Unit
            </th>
            <th scope="col" className="py-2 text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-300">
              <td className="py-2 pr-3">{line.description}</td>
              <td className="py-2 pr-3 text-right">{line.quantity}</td>
              <td className="py-2 pr-3 text-right">{format(line.unitAmountCents)}</td>
              <td className="py-2 text-right font-medium">{format(line.totalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-b border-slate-300">
            <th scope="row" colSpan={3} className="py-2 pr-3 text-right font-semibold">
              Subtotal
            </th>
            <td className="py-2 text-right">{format(quote.totals.subtotalCents)}</td>
          </tr>
          {quote.totals.discountCents > 0 ? (
            <tr className="border-b border-slate-300">
              <th scope="row" colSpan={3} className="py-2 pr-3 text-right font-semibold">
                Discount
              </th>
              <td className="py-2 text-right">−{format(quote.totals.discountCents)}</td>
            </tr>
          ) : null}
          <tr className="border-b border-slate-300">
            <th scope="row" colSpan={3} className="py-2 pr-3 text-right font-semibold">
              VAT ({vatPercent}%)
            </th>
            <td className="py-2 text-right">{format(quote.totals.vatCents)}</td>
          </tr>
          <tr className="border-b-2 border-slate-900 text-base">
            <th scope="row" colSpan={3} className="py-2 pr-3 text-right font-bold">
              Total (VAT incl.)
            </th>
            <td className="py-2 text-right font-bold">{format(quote.totals.totalCents)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-6 text-xs leading-relaxed text-slate-600">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Terms &amp; conditions
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {QUOTE_TERMS_AND_CONDITIONS.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
        <p className="mt-3 italic">{QUOTE_DISCLAIMER}</p>
      </section>

      <footer className="mt-6 flex items-end justify-between border-t border-slate-300 pt-3">
        <p className="text-xs text-slate-500">
          {quote.dealer.name} · Reference{' '}
          <span className="font-mono font-semibold text-slate-700">{quote.quoteNumber}</span>
        </p>
        {/* QR placeholder — Sprint 9 renders a verification code here. */}
        <div
          data-qr-placeholder
          className="flex h-20 w-20 items-center justify-center border border-dashed border-slate-400 text-center text-[9px] uppercase tracking-wider text-slate-400"
        >
          QR code
        </div>
      </footer>
    </section>
  );
}
