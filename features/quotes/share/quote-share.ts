import { formatCents } from '@/lib/money/currency';
import { buildQuoteShareUrl } from '@/features/quotes/hooks/use-quote-link';
import type { QuoteDetail } from '@/types/quote';

/**
 * Share payloads for a quotation. Three transports, one message body:
 * the customer-facing summary plus the absolute quote link. Nothing here
 * opens a network request — payloads are URLs/strings the UI hands to the
 * OS (mailto:, wa.me, clipboard).
 */

function quoteShareBody(quote: QuoteDetail, url: string): string {
  const total = formatCents(quote.totals.totalCents, quote.totals.currency);
  return [
    `Quotation ${quote.quoteNumber} — ${quote.dealer.name}`,
    `Prepared for ${quote.customer.name}`,
    `Total (VAT incl.): ${total}`,
    `Valid until ${new Date(quote.validUntil).toLocaleDateString('en-ZA')}`,
    '',
    `View the quotation: ${url}`,
    '',
    'This document is a quotation, not an invoice.',
  ].join('\n');
}

/** Full email payload: subject + body, both RFC-6068 encoded. */
export function buildQuoteMailtoUrl(quote: QuoteDetail, baseUrl?: string): string {
  const url = buildQuoteShareUrl(quote.id, baseUrl);
  const subject = `Quotation ${quote.quoteNumber} — ${quote.dealer.name}`;
  const body = quoteShareBody(quote, url);
  const to = quote.customer.email ?? '';
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** WhatsApp click-to-chat with the quotation message pre-typed. */
export function buildQuoteWhatsAppUrl(quote: QuoteDetail, baseUrl?: string): string {
  const url = buildQuoteShareUrl(quote.id, baseUrl);
  const phone = (quote.customer.phone ?? '').replace(/[^0-9]/g, '');
  const text = quoteShareBody(quote, url);
  const target = phone.length > 0 ? `/${phone}` : '';
  return `https://wa.me${target}?text=${encodeURIComponent(text)}`;
}

/** Plain-text payload for clipboard transports. */
export function buildQuoteClipboardText(quote: QuoteDetail, baseUrl?: string): string {
  return quoteShareBody(quote, buildQuoteShareUrl(quote.id, baseUrl));
}

/**
 * Best-effort clipboard write; resolves false instead of throwing so the UI
 * can toast a degradation notice (same posture as configuration links).
 */
export async function copyQuoteToClipboard(quote: QuoteDetail, baseUrl?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildQuoteShareUrl(quote.id, baseUrl));
    return true;
  } catch {
    return false;
  }
}
