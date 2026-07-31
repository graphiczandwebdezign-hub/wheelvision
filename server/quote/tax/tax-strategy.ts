import { applyBasisPoints } from '@/server/quote/money';
import { AppError } from '@/server/utils/errors';

/**
 * TaxStrategy — the seam that keeps country-specific tax out of the pricing
 * engine. Engines call `calculate(taxableCents)` and carry
 * `rateBasisPoints`/identity into snapshots; adding a country means adding a
 * strategy to the registry below — no engine rewrite (spec requirement).
 */

export interface TaxStrategy {
  /** Stable machine code stored on snapshots (`ZA_VAT`). */
  readonly code: string;
  /** Human-readable name rendered on quotations (`VAT (South Africa)`). */
  readonly name: string;
  /** Ad-valorem rate in basis points (15% = 1500). */
  readonly rateBasisPoints: number;
  /** Tax on a VAT-exclusive taxable amount, rounded by the money kernel. */
  calculate: (taxableCents: number) => number;
}

/** South African VAT, currently 15%, applied on the VAT-exclusive total. */
export const SOUTH_AFRICAN_VAT: TaxStrategy = {
  code: 'ZA_VAT',
  name: 'VAT (South Africa)',
  rateBasisPoints: 1500,
  calculate: (taxableCents) => applyBasisPoints(taxableCents, SOUTH_AFRICAN_VAT.rateBasisPoints),
};

/** Country-code (ISO 3166-1 alpha-2) → strategy registry. */
const TAX_REGISTRY: Readonly<Record<string, TaxStrategy>> = {
  ZA: SOUTH_AFRICAN_VAT,
};

export function resolveTaxStrategy(countryCode: string): TaxStrategy {
  const strategy = TAX_REGISTRY[countryCode.toUpperCase()];
  if (!strategy) {
    throw new AppError(`No tax strategy registered for country ${countryCode}`, {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  }
  return strategy;
}
