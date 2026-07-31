import type { AdjustmentKind, QuoteStatus } from '@/types/quote';

export const QUOTE_NUMBER_MAX_RETRIES = 3;
export const QUOTE_VALIDITY_DAYS = 30;
export const PRISMA_UNIQUE_VIOLATION = 'P2002';

export const DISCOUNT_KINDS: readonly AdjustmentKind[] = ['PERCENT', 'FIXED'];

export function isQuoteStatus(value: string): value is QuoteStatus {
  return value === 'ISSUED' || value === 'ARCHIVED';
}

/** Standard terms printed on quotations (South African wheel fitment trade). */
export const QUOTE_TERMS_AND_CONDITIONS: readonly string[] = [
  'This quotation is valid for 30 days from the date of issue, after which pricing must be reconfirmed.',
  'Prices are quoted in South African Rand and include VAT at the prevailing rate unless stated otherwise.',
  'Fitment, balancing and alignment are carried out by qualified technicians using calibrated equipment.',
  'Wheel and tyre availability is confirmed at the time of order; quoted items are not reserved without a deposit.',
  'Manufacturer warranties apply to all wheels and tyres; workmanship is guaranteed for 90 days from fitment.',
  'Torque settings are verified on fitment; a re-torque inspection is recommended after 50 km of driving.',
];

export const QUOTE_DISCLAIMER =
  'This document is a quotation, not an invoice. It does not constitute a sale until accepted and confirmed by both parties.';
