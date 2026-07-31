'use client';

import { formatCents } from '@/lib/money/currency';
import type { QuoteLineDto } from '@/types/quote';

/**
 * The priced line items exactly as issued — category, description, quantity,
 * unit price and line total. Pure presentation over server-computed cents.
 */
export function QuotePricing({
  lines,
  currency,
}: {
  readonly lines: readonly QuoteLineDto[];
  readonly currency: string;
}) {
  const format = (amountCents: number) => formatCents(amountCents, currency);

  return (
    <div className="overflow-x-auto" aria-label="Quote line items">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
            <th scope="col" className="py-2 pr-3 font-medium">
              Item
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Unit
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-800 last:border-0">
              <td className="py-2 pr-3 text-slate-200">
                <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {line.category.toLowerCase()}
                </span>
                {line.description}
              </td>
              <td className="py-2 pr-3 text-right text-slate-400">{line.quantity}</td>
              <td className="py-2 pr-3 text-right text-slate-400">
                {format(line.unitAmountCents)}
              </td>
              <td className="py-2 text-right font-medium text-slate-100">
                {format(line.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
