/**
 * Quote numbering. Format: `WV-<issue year>-<six-digit sequence>` (e.g.
 * WV-2026-000001). Sequences are tenant-scoped, continuous across years
 * (no rollover ambiguity), and allocated atomically at the database —
 * see QuoteRepository / QuoteService for the allocation and collision path.
 */

export interface QuoteNumberAllocator {
  nextSequence(tx: unknown): Promise<number>;
}

export function formatQuoteNumber(sequence: number, issuedAt: Date): string {
  const padded = String(sequence).padStart(6, '0');
  return `WV-${issuedAt.getUTCFullYear()}-${padded}`;
}
