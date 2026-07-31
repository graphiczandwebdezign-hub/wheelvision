'use client';

import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { useQuoteUiStore } from '@/features/quotes/state/quote-ui-store';

const QUOTE_LINK_PARAM = 'quote';
const quoteLinkSchema = z.string().uuid();

/**
 * Consumes a shared quote link (`?quote=<uuid>`) once on mount: the quote id
 * is handed to the quote workspace (which fetches and displays it), then the
 * parameter is stripped from the address bar so refreshes stay clean.
 * Malformed links are ignored silently — same posture as configuration links.
 */
export function useQuoteLinkSync(): void {
  const openWithQuoteId = useQuoteUiStore((state) => state.openWithQuoteId);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current || typeof window === 'undefined') {
      return;
    }
    consumed.current = true;
    const raw = new URLSearchParams(window.location.search).get(QUOTE_LINK_PARAM);
    const parsed = quoteLinkSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }
    openWithQuoteId(parsed.data);
    const url = new URL(window.location.href);
    url.searchParams.delete(QUOTE_LINK_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [openWithQuoteId]);
}

/** Build the share URL for a quote (absolute, or base-relative fallback). */
export function buildQuoteShareUrl(quoteId: string, baseUrl?: string): string {
  const base =
    baseUrl ??
    (typeof window === 'undefined'
      ? 'https://wheelvision.app/preview'
      : `${window.location.origin}${window.location.pathname}`);
  const url = new URL(base);
  url.searchParams.set(QUOTE_LINK_PARAM, quoteId);
  return url.toString();
}
