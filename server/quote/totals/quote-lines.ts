import type { AdjustmentKind, PriceRuleCategory, QuoteLineCategory } from '@/types/quote';

/**
 * Pricing inputs — everything the totals engine needs, expressed as plain
 * data so the engine itself stays pure and database-free (deterministic and
 * unit-testable, as mandated).
 */

export const WHEELS_PER_VEHICLE = 4;

export type LabourServiceType = 'FITMENT' | 'BALANCING' | 'ALIGNMENT';
export type LabourUnit = 'PER_WHEEL' | 'PER_VEHICLE';

export interface PricedItem {
  readonly category: QuoteLineCategory;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountCents: number;
  /** Brand used for price-rule scoping (wheel/tyre brand, vehicle manufacturer). */
  readonly brand: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface LabourRate {
  readonly serviceType: LabourServiceType;
  readonly unit: LabourUnit;
  readonly amountCents: number;
}

export interface PriceRuleInput {
  readonly id: string;
  readonly category: PriceRuleCategory;
  readonly adjustmentType: AdjustmentKind;
  readonly percentBasisPoints: number | null;
  readonly amountCents: number | null;
  readonly brand: string | null;
  readonly priority: number;
}

export interface DiscountRuleInput {
  readonly id: string;
  readonly name: string;
  readonly kind: AdjustmentKind;
  readonly percentBasisPoints: number | null;
  readonly amountCents: number | null;
  /** Category the discount is scoped to; null = whole order. */
  readonly category: QuoteLineCategory | null;
  readonly priority: number;
}

/** Stable presentation order for quote lines. */
export function categorySortOrder(category: QuoteLineCategory): number {
  switch (category) {
    case 'PACKAGE':
      return 0;
    case 'WHEEL':
      return 10;
    case 'TYRE':
      return 20;
    case 'ACCESSORY':
      return 30;
    case 'LABOUR':
      return 40;
  }
}

/**
 * Builds the base priced items for a configuration: a set of wheels (×4),
 * a set of tyres (×4), and every labour line implied by the tenant's rate
 * card (`PER_WHEEL` services bill per wheel, `PER_VEHICLE` once).
 * Returns the items plus which labour services were priced — the caller
 * decides whether a missing rate is an error (it is: no placeholder pricing).
 */
export function buildBaseItems(input: {
  readonly wheelDescription: string;
  readonly wheelBrand: string;
  readonly wheelUnitAmountCents: number | null;
  readonly tyreDescription: string;
  readonly tyreBrand: string;
  readonly tyreUnitAmountCents: number | null;
  readonly labourRates: readonly LabourRate[];
  readonly wheelMetadata?: Record<string, unknown>;
  readonly tyreMetadata?: Record<string, unknown>;
}): { readonly items: PricedItem[]; readonly missingPrices: readonly string[] } {
  const items: PricedItem[] = [];
  const missingPrices: string[] = [];

  if (input.wheelUnitAmountCents === null) {
    missingPrices.push('wheel');
  } else {
    items.push({
      category: 'WHEEL',
      description: input.wheelDescription,
      quantity: WHEELS_PER_VEHICLE,
      unitAmountCents: input.wheelUnitAmountCents,
      brand: input.wheelBrand,
      metadata: input.wheelMetadata,
    });
  }

  if (input.tyreUnitAmountCents === null) {
    missingPrices.push('tyre');
  } else {
    items.push({
      category: 'TYRE',
      description: input.tyreDescription,
      quantity: WHEELS_PER_VEHICLE,
      unitAmountCents: input.tyreUnitAmountCents,
      brand: input.tyreBrand,
      metadata: input.tyreMetadata,
    });
  }

  const labourOrder = (serviceType: LabourServiceType): number =>
    serviceType === 'FITMENT' ? 0 : serviceType === 'BALANCING' ? 1 : 2;

  [...input.labourRates]
    .sort((a, b) => labourOrder(a.serviceType) - labourOrder(b.serviceType))
    .forEach((rate) => {
      const perWheel = rate.unit === 'PER_WHEEL';
      items.push({
        category: 'LABOUR',
        description:
          rate.serviceType === 'FITMENT'
            ? `Fitment${perWheel ? ' (per wheel)' : ''}`
            : rate.serviceType === 'BALANCING'
              ? `Wheel balancing${perWheel ? ' (per wheel)' : ''}`
              : `Wheel alignment${perWheel ? ' (per wheel)' : ''}`,
        quantity: perWheel ? WHEELS_PER_VEHICLE : 1,
        unitAmountCents: rate.amountCents,
        brand: null,
        metadata: { serviceType: rate.serviceType, unit: rate.unit },
      });
    });

  return { items, missingPrices };
}
