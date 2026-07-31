import { describe, expect, it } from 'vitest';
import {
  applyBasisPoints,
  capDiscount,
  centsToDecimalString,
  decimalToCents,
  lineTotal,
  roundDiv,
} from '@/server/quote/money';

describe('money kernel — roundDiv', () => {
  it('rounds half-up at exactly .5 (away from zero)', () => {
    expect(roundDiv(5, 10, 'halfUp')).toBe(1); // 0.5 → 1
    expect(roundDiv(15, 10, 'halfUp')).toBe(2); // 1.5 → 2
    expect(roundDiv(25, 10, 'halfUp')).toBe(3); // 2.5 → 3
  });

  it('rounds half-down below .5 and truncates in down mode', () => {
    expect(roundDiv(14, 10, 'halfUp')).toBe(1);
    expect(roundDiv(16, 10, 'halfUp')).toBe(2);
    expect(roundDiv(15, 10, 'down')).toBe(1);
    expect(roundDiv(19, 10, 'down')).toBe(1);
    expect(roundDiv(20, 10, 'down')).toBe(2);
  });

  it('is exact when the division is whole', () => {
    expect(roundDiv(93825 * 2, 2, 'halfUp')).toBe(93825);
    expect(roundDiv(0, 100, 'halfUp')).toBe(0);
  });
});

describe('money kernel — applyBasisPoints', () => {
  it('applies 15% VAT exactly on whole-cent boundaries', () => {
    expect(applyBasisPoints(625500, 1500)).toBe(93825);
    expect(applyBasisPoints(100, 1500)).toBe(15);
  });

  it('rounds the fractional cent half-up', () => {
    // 33125 × 0.15 = 4968.75 → 4969
    expect(applyBasisPoints(33125, 1500)).toBe(4969);
    // 562950 × 0.15 = 84442.5 → 84443
    expect(applyBasisPoints(562950, 1500)).toBe(84443);
  });

  it('handles zero rate and zero amount', () => {
    expect(applyBasisPoints(0, 1500)).toBe(0);
    expect(applyBasisPoints(999999, 0)).toBe(0);
  });
});

describe('money kernel — lineTotal / capDiscount', () => {
  it('multiplies quantity × unit exactly', () => {
    expect(lineTotal(4, 100000)).toBe(400000);
    expect(lineTotal(1, 9500)).toBe(9500);
    expect(lineTotal(0, 9500)).toBe(0);
  });

  it('caps discounts at the amount and never goes negative', () => {
    expect(capDiscount(1000, 400)).toBe(400);
    expect(capDiscount(1000, 1000)).toBe(1000);
    expect(capDiscount(1000, 1500)).toBe(1000);
    expect(capDiscount(1000, -200)).toBe(0);
  });
});

describe('money kernel — decimal <-> cents', () => {
  it('formats cents for Prisma Decimal columns', () => {
    expect(centsToDecimalString(719325)).toBe('7193.25');
    expect(centsToDecimalString(0)).toBe('0.00');
    expect(centsToDecimalString(5)).toBe('0.05');
    expect(centsToDecimalString(-12345)).toBe('-123.45');
  });

  it('parses decimal-shaped values back to cents', () => {
    expect(decimalToCents('7193.25')).toBe(719325);
    expect(decimalToCents('0.05')).toBe(5);
    expect(decimalToCents('10')).toBe(1000);
    expect(decimalToCents('-123.45')).toBe(-12345);
    expect(decimalToCents(null)).toBe(0);
  });

  it('round-trips without drift', () => {
    for (const cents of [1, 99, 100, 12345, 719325, 10_000_001]) {
      expect(decimalToCents(centsToDecimalString(cents))).toBe(cents);
    }
  });
});
