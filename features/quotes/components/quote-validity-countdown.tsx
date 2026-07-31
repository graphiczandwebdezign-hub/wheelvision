'use client';

import React from 'react';

interface QuoteValidityCountdownProps {
  readonly validUntil: string;
  readonly isExpired: boolean;
}

export function QuoteValidityCountdown({ validUntil, isExpired }: QuoteValidityCountdownProps) {
  const expiryDate = new Date(validUntil);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center justify-between text-sm py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <span className="text-neutral-600 font-medium">Validity Period</span>
      <div className="text-right">
        {isExpired || diffDays <= 0 ? (
          <span className="text-amber-600 font-semibold">Expired on {expiryDate.toLocaleDateString()}</span>
        ) : (
          <span className="text-neutral-900 font-medium">
            Valid for {diffDays} {diffDays === 1 ? 'day' : 'days'} (until {expiryDate.toLocaleDateString()})
          </span>
        )}
      </div>
    </div>
  );
}
