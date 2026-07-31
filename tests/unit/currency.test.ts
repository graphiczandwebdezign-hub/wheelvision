import { describe, expect, it } from 'vitest';
import { formatCents, resolveCurrency, supportedCurrencies } from '@/lib/money/currency';

describe('currency registry', () => {
  it('resolves ZAR with 2 fraction digits and the en-ZA locale', () => {
    const zar = resolveCurrency('ZAR');
    expect(zar).toEqual({
      code: 'ZAR',
      name: 'South African rand',
      fractionDigits: 2,
      locale: 'en-ZA',
    });
    expect(resolveCurrency('zar')).toEqual(zar); // case-insensitive
    expect(supportedCurrencies()).toContainEqual(zar);
  });

  it('rejects unsupported currencies loudly (never silently formats)', () => {
    expect(() => resolveCurrency('USD')).toThrow(/Unsupported currency/);
    expect(() => resolveCurrency('')).toThrow(/Unsupported currency/);
  });
});

/** ICU builds differ on the en-ZA decimal separator/group spaces; normalise before asserting. */
function normalise(formatted: string): string {
  return formatted.replace(',', '.').replace(/[  ]/g, ' ');
}

describe('formatCents', () => {
  it('formats via CLDR data (symbol comes from the runtime, never hardcoded)', () => {
    const formatted = formatCents(719325, 'ZAR');
    expect(normalise(formatted)).toContain('7');
    expect(normalise(formatted)).toContain('193.25');
    expect(formatted.replace(/[0-9\s.,]/g, '')).toBe('R');
  });

  it('formats zero and fractional cents correctly', () => {
    expect(normalise(formatCents(0, 'ZAR'))).toContain('0.00');
    expect(normalise(formatCents(5, 'ZAR'))).toContain('0.05');
  });

  it('groups large amounts', () => {
    const formatted = normalise(formatCents(10_000_000, 'ZAR'));
    expect(formatted).toContain('100');
    expect(formatted).toContain('000.00');
  });
});
