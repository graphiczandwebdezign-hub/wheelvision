import { describe, expect, it } from 'vitest';
import { AppError } from '@/server/utils/errors';
import { resolveTaxStrategy, SOUTH_AFRICAN_VAT } from '@/server/quote/tax/tax-strategy';

describe('South African VAT strategy', () => {
  it('identifies itself for snapshots and documents', () => {
    expect(SOUTH_AFRICAN_VAT.code).toBe('ZA_VAT');
    expect(SOUTH_AFRICAN_VAT.name).toBe('VAT (South Africa)');
    expect(SOUTH_AFRICAN_VAT.rateBasisPoints).toBe(1500);
  });

  it('calculates 15% with money-kernel rounding', () => {
    expect(SOUTH_AFRICAN_VAT.calculate(625500)).toBe(93825);
    expect(SOUTH_AFRICAN_VAT.calculate(33125)).toBe(4969); // 4968.75 → half-up
    expect(SOUTH_AFRICAN_VAT.calculate(0)).toBe(0);
  });
});

describe('resolveTaxStrategy registry', () => {
  it('resolves South Africa case-insensitively', () => {
    expect(resolveTaxStrategy('ZA')).toBe(SOUTH_AFRICAN_VAT);
    expect(resolveTaxStrategy('za')).toBe(SOUTH_AFRICAN_VAT);
  });

  it('fails loudly for unregistered countries (no silent default)', () => {
    expect(() => resolveTaxStrategy('BW')).toThrowError(AppError);
    expect(() => resolveTaxStrategy('BW')).toThrowError(/No tax strategy registered/);
  });
});
