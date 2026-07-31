'use client';

import React from 'react';
import type { QuoteStatus } from '@/types/quote';

interface QuoteVerificationBadgeProps {
  readonly status: QuoteStatus;
  readonly isExpired: boolean;
}

export function QuoteVerificationBadge({ status, isExpired }: QuoteVerificationBadgeProps) {
  if (isExpired || status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        <span className="w-2 h-2 mr-1.5 rounded-full bg-amber-500 animate-pulse" />
        Expired
      </span>
    );
  }

  switch (status) {
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500" />
          Accepted (Verified)
        </span>
      );
    case 'ISSUED':
    case 'VIEWED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-blue-500" />
          Verified Authentic
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );
    case 'CANCELLED':
    case 'ARCHIVED':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-neutral-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-purple-500" />
          Draft
        </span>
      );
  }
}
