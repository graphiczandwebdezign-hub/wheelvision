'use client';

import React from 'react';
import type { QuoteStatusHistoryDto } from '@/types/quote';

interface QuoteTimelineProps {
  readonly history: readonly QuoteStatusHistoryDto[];
}

export function QuoteTimeline({ history }: QuoteTimelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Quotation Lifecycle History</h3>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
        {history.map((entry, index) => {
          const date = new Date(entry.createdAt);
          return (
            <div key={entry.id || index} className="relative flex items-start space-x-3">
              <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
              <div className="flex-1 min-w-0 bg-white p-3 rounded-lg border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <span className="font-semibold text-neutral-900 uppercase tracking-wide">
                    {entry.toStatus}
                  </span>
                  <span>{date.toLocaleString()}</span>
                </div>
                <p className="text-xs text-neutral-600">
                  {entry.fromStatus ? `Transitioned from ${entry.fromStatus}` : 'Quotation issued'}
                  {entry.actorName ? ` by ${entry.actorName}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
