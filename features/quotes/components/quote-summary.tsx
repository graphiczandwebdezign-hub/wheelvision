'use client';

import { Badge } from '@/components/ui';
import { formatTyreProfile } from '@/features/preview/selection/tyre-facets';
import { formatWheelSize } from '@/features/preview/selection/wheel-facets';
import type { QuoteDetail } from '@/types/quote';

/**
 * The quotation header block: reference, parties and the configured package,
 * all read from the immutable snapshot when present (a quote always shows
 * what was agreed, never the drifted live catalog).
 */
export function QuoteSummary({ quote }: { readonly quote: QuoteDetail }) {
  const snapshot = quote.snapshot;

  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Dealer', quote.dealer.name],
    ['Customer', quote.customer.name],
    ...(quote.customer.email ? ([['Email', quote.customer.email]] as const) : []),
    ...(quote.customer.phone ? ([['Phone', quote.customer.phone]] as const) : []),
    ['Consultant', quote.consultantName ?? 'Showroom floor'],
    [
      'Vehicle',
      snapshot
        ? [
            snapshot.vehicle.year,
            snapshot.vehicle.manufacturer,
            snapshot.vehicle.model,
            snapshot.vehicle.variant,
          ]
            .filter((part) => part !== null)
            .join(' ')
        : '—',
    ],
    ['Colour', snapshot?.colour ?? '—'],
    [
      'Wheel package',
      snapshot?.wheel.size
        ? `${snapshot.wheel.brand} ${snapshot.wheel.model} ${formatWheelSize(snapshot.wheel.size)}${snapshot.wheel.finish ? ` — ${snapshot.wheel.finish}` : ''}`
        : snapshot
          ? `${snapshot.wheel.brand} ${snapshot.wheel.model}`
          : '—',
    ],
    [
      'Tyres',
      snapshot?.tyre.profile
        ? `${snapshot.tyre.brand} ${snapshot.tyre.pattern} ${formatTyreProfile(snapshot.tyre.profile)}`
        : snapshot
          ? `${snapshot.tyre.brand} ${snapshot.tyre.pattern}`
          : '—',
    ],
  ];

  return (
    <section aria-label="Quote summary" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Reference</p>
          <p className="font-mono text-lg font-semibold text-slate-50">{quote.quoteNumber}</p>
        </div>
        <Badge tone={quote.status === 'ISSUED' ? 'success' : 'neutral'}>{quote.status}</Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Prepared{' '}
        <time dateTime={quote.createdAt}>
          {new Date(quote.createdAt).toLocaleDateString('en-ZA')}
        </time>
        {' · '}valid until{' '}
        <time dateTime={quote.validUntil}>
          {new Date(quote.validUntil).toLocaleDateString('en-ZA')}
        </time>
      </p>
    </section>
  );
}
