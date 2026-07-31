import type { QuoteDetail } from '@/types/quote';

export function generatePdfBuffer(quote: QuoteDetail): Buffer {
  const content = [
    `WHEELVISION COMMERCIAL QUOTATION`,
    `=================================`,
    `Quote Number: ${quote.quoteNumber}`,
    `Dealer: ${quote.dealer.name}`,
    `Customer: ${quote.customer.name} (${quote.customer.email || 'N/A'})`,
    `Consultant: ${quote.consultantName || 'Authorized Consultant'}`,
    `Issue Date: ${new Date(quote.createdAt).toLocaleDateString()}`,
    `Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`,
    ``,
    `COMMERCIAL BREAKDOWN`,
    ...quote.lines.map((l) => `- ${l.description} (Qty: ${l.quantity}) — R ${(l.totalCents / 100).toFixed(2)}`),
    ``,
    `Subtotal: R ${(quote.totals.subtotalCents / 100).toFixed(2)}`,
    `VAT (15%): R ${(quote.totals.vatCents / 100).toFixed(2)}`,
    `Grand Total: R ${(quote.totals.totalCents / 100).toFixed(2)} (${quote.currency})`,
    ``,
    `Verification Code: WV-VERIFIED-${quote.quoteNumber}`,
    `Thank you for choosing ${quote.dealer.name}!`,
  ].join('\n');

  return Buffer.from(content, 'utf-8');
}
