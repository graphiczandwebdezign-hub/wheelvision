'use client';

import React from 'react';
import type { QuoteDetail } from '@/types/quote';

interface QuoteCommercialSummaryProps {
  readonly quote: QuoteDetail;
}

export function QuoteCommercialSummary({ quote }: QuoteCommercialSummaryProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: quote.currency || 'ZAR',
    }).format(cents / 100);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
      <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">Commercial Breakdown</h3>

      <div className="space-y-3">
        {quote.lines.map((line) => (
          <div key={line.id} className="flex justify-between items-start text-sm">
            <div>
              <p className="font-medium text-neutral-900">{line.description}</p>
              <p className="text-xs text-neutral-500">Qty: {line.quantity} × {formatCurrency(line.unitAmountCents)}</p>
            </div>
            <span className="font-semibold text-neutral-900">{formatCurrency(line.totalCents)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-100 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span>{formatCurrency(quote.totals.subtotalCents)}</span>
        </div>
        {quote.totals.discountCents > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount Applied</span>
            <span>-{formatCurrency(quote.totals.discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between text-neutral-600">
          <span>VAT ({quote.totals.vatBasisPoints / 100}%)</span>
          <span>{formatCurrency(quote.totals.vatCents)}</span>
        </div>
        <div className="flex justify-between items-center text-lg font-bold text-neutral-900 border-t border-neutral-200 pt-3">
          <span>Grand Total</span>
          <span className="text-blue-600">{formatCurrency(quote.totals.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
