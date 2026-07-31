/**
 * Money kernel — the single implementation of every monetary calculation in
 * the quote domain. All arithmetic is integer cents; percentages are basis
 * points (1% = 100 bp) so no floating point ever enters a calculation and
 * results are bit-for-bit deterministic. Every rounding decision passes
 * through `roundDiv` — duplicated rounding logic is impossible by design.
 */

export type RoundingMode = 'halfUp' | 'down';

/**
 * Integer division with explicit rounding.
 * halfUp: 0.5 rounds away from zero (commercial default for SA VAT/pricing).
 */
export function roundDiv(numerator: number, denominator: number, mode: RoundingMode): number {
  if (mode === 'down') {
    return Math.floor(numerator / denominator);
  }
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

/** Multiply by basis points, rounded half-up (e.g. 15% VAT = 1500 bp). */
export function applyBasisPoints(amountCents: number, basisPoints: number): number {
  return roundDiv(amountCents * basisPoints, 10_000, 'halfUp');
}

/** Line total: quantity × unit price, exact integer multiplication. */
export function lineTotal(quantity: number, unitAmountCents: number): number {
  return quantity * unitAmountCents;
}

/** Clamp a discount so it can never drive money below zero. */
export function capDiscount(amountCents: number, discountCents: number): number {
  return Math.min(amountCents, Math.max(0, discountCents));
}

/** Prisma `Decimal` columns accept strings; cents → exact "123.45" form. */
export function centsToDecimalString(amountCents: number): string {
  const sign = amountCents < 0 ? '-' : '';
  const absolute = Math.abs(amountCents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

/** Decimal-shaped Prisma values ("123.45", Decimal.js) → integer cents. */
export function decimalToCents(value: unknown): number {
  const text = String(value ?? '0').trim();
  const negative = text.startsWith('-');
  const [whole = '0', fraction = ''] = text.replace(/^-/, '').split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}
