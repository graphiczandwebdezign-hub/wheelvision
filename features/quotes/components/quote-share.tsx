'use client';

import { useState } from 'react';
import { Button, toast } from '@/components/ui';
import {
  buildQuoteMailtoUrl,
  buildQuoteWhatsAppUrl,
  copyQuoteToClipboard,
} from '@/features/quotes/share/quote-share';
import type { QuoteDetail } from '@/types/quote';

/**
 * Share transports for an issued quotation: copy the link, open a pre-filled
 * email, or hand off to WhatsApp. Payloads come from the share module; this
 * component only wires them to the OS and toasts the outcome.
 */
export function QuoteShare({ quote }: { readonly quote: QuoteDetail }) {
  const [copying, setCopying] = useState(false);

  const onCopyLink = async () => {
    setCopying(true);
    try {
      const copied = await copyQuoteToClipboard(quote);
      if (copied) {
        toast({ kind: 'success', message: 'Quote link copied to the clipboard.' });
      } else {
        toast({
          kind: 'error',
          message: 'The clipboard is unavailable — copy the address bar link instead.',
        });
      }
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" aria-label="Share this quotation">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Share</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => void onCopyLink()}
          loading={copying}
        >
          Copy Link
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => {
            window.location.href = buildQuoteMailtoUrl(quote);
          }}
        >
          Email
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => {
            window.open(buildQuoteWhatsAppUrl(quote), '_blank', 'noopener,noreferrer');
          }}
        >
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
