import { describe, expect, it } from 'vitest';
import { buildQuoteDetail } from '@/server/quote/quote-builder';
import { createQuoteRecord } from '@/tests/helpers/quote-fixtures';
import { buildQuoteShareUrl } from '@/features/quotes/hooks/use-quote-link';
import {
  buildQuoteClipboardText,
  buildQuoteMailtoUrl,
  buildQuoteWhatsAppUrl,
} from '@/features/quotes/share/quote-share';

const quote = buildQuoteDetail(createQuoteRecord());

describe('buildQuoteShareUrl', () => {
  it('embeds the quote id as the ?quote= parameter', () => {
    const url = buildQuoteShareUrl(quote.id, 'https://dealer.example/preview');
    expect(url).toBe(`https://dealer.example/preview?quote=${quote.id}`);
  });

  it('preserves an existing query string', () => {
    const url = buildQuoteShareUrl(quote.id, 'https://dealer.example/preview?tenant=demo');
    expect(url).toContain('tenant=demo');
    expect(url).toContain(`quote=${quote.id}`);
  });
});

describe('email payload', () => {
  it('builds a mailto with recipient, subject and quoted summary', () => {
    const mailto = buildQuoteMailtoUrl(quote, 'https://dealer.example/preview');

    expect(mailto.startsWith('mailto:')).toBe(true);
    const decoded = decodeURIComponent(mailto);
    expect(decoded).toContain('nkosi@example.co.za');
    expect(decoded).toContain('Quotation WV-2026-000001 — Demo Tenant');
    expect(decoded).toContain('Mrs Nkosi');
    expect(decoded).toContain('View the quotation: https://dealer.example/preview?quote=');
    expect(decoded).toContain('not an invoice');
    expect(decoded).toContain('Valid until');
  });

  it('tolerates a customer without email (empty recipient)', () => {
    const guest = buildQuoteDetail(
      createQuoteRecord({ customer: { name: 'Walk-in', email: null, phone: null } }),
    );
    expect(buildQuoteMailtoUrl(guest).startsWith('mailto:?subject=')).toBe(true);
  });
});

describe('WhatsApp payload', () => {
  it('builds a wa.me link with the message pre-typed and digits-only phone', () => {
    const url = buildQuoteWhatsAppUrl(quote, 'https://dealer.example/preview');

    expect(url.startsWith('https://wa.me/27825550100?text=')).toBe(true);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Quotation WV-2026-000001 — Demo Tenant');
    expect(decoded).toContain(`quote=${quote.id}`);
  });

  it('falls back to the generic share target without a phone', () => {
    const guest = buildQuoteDetail(
      createQuoteRecord({ customer: { name: 'Walk-in', email: null, phone: null } }),
    );
    expect(buildQuoteWhatsAppUrl(guest).startsWith('https://wa.me?text=')).toBe(true);
  });
});

describe('clipboard payload', () => {
  it('is plain text with the reference, parties, total and link', () => {
    const text = buildQuoteClipboardText(quote, 'https://dealer.example/preview');
    expect(text).toContain('WV-2026-000001');
    expect(text).toContain('Demo Tenant');
    expect(text).toContain('Mrs Nkosi');
    expect(text).toContain('Total (VAT incl.):');
    expect(text).toContain(`quote=${quote.id}`);
  });
});
