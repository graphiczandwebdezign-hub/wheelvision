import { describe, expect, it } from 'vitest';
import { SOUTH_AFRICAN_VAT } from '@/server/quote/tax/tax-strategy';
import { computeTotals } from '@/server/quote/totals/compute-totals';
import { buildBaseItems, WHEELS_PER_VEHICLE } from '@/server/quote/totals/quote-lines';
import { PRICE_BOOK } from '@/tests/helpers/quote-fixtures';

const baseItems = buildBaseItems({
  wheelDescription: 'Rays TE37 18×8.0J — Matte Black',
  wheelBrand: 'Rays',
  wheelUnitAmountCents: PRICE_BOOK.wheelUnitCents,
  tyreDescription: 'Michelin Pilot Sport 4 265/65 R17',
  tyreBrand: 'Michelin',
  tyreUnitAmountCents: PRICE_BOOK.tyreUnitCents,
  labourRates: [
    { serviceType: 'FITMENT', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.fitmentCents },
    { serviceType: 'BALANCING', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.balancingCents },
    { serviceType: 'ALIGNMENT', unit: 'PER_VEHICLE', amountCents: PRICE_BOOK.alignmentCents },
  ],
}).items;

describe('buildBaseItems', () => {
  it('builds wheel ×4, tyre ×4 and labour by unit from the rate card', () => {
    const { items, missingPrices } = baseItems.length
      ? { items: baseItems, missingPrices: [] }
      : { items: [], missingPrices: ['unexpected'] };

    expect(missingPrices).toEqual([]);
    expect(items).toHaveLength(5);
    expect(items.find((i) => i.category === 'WHEEL')).toMatchObject({
      quantity: WHEELS_PER_VEHICLE,
      unitAmountCents: PRICE_BOOK.wheelUnitCents,
    });
    const labour = items.filter((i) => i.category === 'LABOUR');
    expect(labour.map((l) => [l.quantity, l.unitAmountCents])).toEqual([
      [4, PRICE_BOOK.fitmentCents],
      [4, PRICE_BOOK.balancingCents],
      [1, PRICE_BOOK.alignmentCents],
    ]);
  });

  it('flags missing wheel/tyre prices without inventing zeros', () => {
    const { items, missingPrices } = buildBaseItems({
      wheelDescription: 'w',
      wheelBrand: 'w',
      wheelUnitAmountCents: null,
      tyreDescription: 't',
      tyreBrand: 't',
      tyreUnitAmountCents: null,
      labourRates: [],
    });
    expect(missingPrices).toEqual(['wheel', 'tyre']);
    expect(items).toEqual([]);
  });

  it('orders labour FITMENT → BALANCING → ALIGNMENT regardless of input order', () => {
    const { items } = buildBaseItems({
      wheelDescription: 'w',
      wheelBrand: 'w',
      wheelUnitAmountCents: 100,
      tyreDescription: 't',
      tyreBrand: 't',
      tyreUnitAmountCents: 100,
      labourRates: [
        { serviceType: 'ALIGNMENT', unit: 'PER_VEHICLE', amountCents: 1 },
        { serviceType: 'BALANCING', unit: 'PER_WHEEL', amountCents: 1 },
        { serviceType: 'FITMENT', unit: 'PER_WHEEL', amountCents: 1 },
      ],
    });
    expect(items.filter((i) => i.category === 'LABOUR').map((i) => i.description)).toEqual([
      'Fitment (per wheel)',
      'Wheel balancing (per wheel)',
      'Wheel alignment',
    ]);
  });
});

describe('computeTotals — the deterministic pipeline', () => {
  it('computes the fixture book exactly (625500 / 93825 / 719325)', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });

    expect(totals.subtotalCents).toBe(PRICE_BOOK.subtotalCents);
    expect(totals.discountCents).toBe(0);
    expect(totals.vatBasisPoints).toBe(1500);
    expect(totals.vatCents).toBe(PRICE_BOOK.vatCents);
    expect(totals.totalCents).toBe(PRICE_BOOK.totalCents);
    expect(totals.discountsApplied).toEqual([]);
    // Presentation order: wheel, tyre, then labour.
    expect(totals.lines.map((line) => line.category)).toEqual([
      'WHEEL',
      'TYRE',
      'LABOUR',
      'LABOUR',
      'LABOUR',
    ]);
  });

  it('is byte-for-byte deterministic across runs', () => {
    const input = {
      items: baseItems,
      priceRules: [],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    } as const;
    expect(computeTotals(input)).toEqual(computeTotals(input));
  });

  it('applies a percent price rule per line, floored at zero', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [
        {
          id: 'rule-1',
          category: 'WHEEL',
          adjustmentType: 'PERCENT',
          percentBasisPoints: 1000, // +10% on wheels
          amountCents: null,
          brand: null,
          priority: 1,
        },
      ],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    const wheelLine = totals.lines.find((line) => line.category === 'WHEEL');
    expect(wheelLine?.totalCents).toBe(440000); // 400000 + 10%
    expect(totals.subtotalCents).toBe(665500);
  });

  it('scopes percent price rules by brand', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [
        {
          id: 'rule-brand',
          category: 'TYRE',
          adjustmentType: 'PERCENT',
          percentBasisPoints: -500, // −5% on Michelin
          amountCents: null,
          brand: 'Michelin',
          priority: 1,
        },
        {
          id: 'rule-brand-other',
          category: 'WHEEL',
          adjustmentType: 'PERCENT',
          percentBasisPoints: 900,
          amountCents: null,
          brand: 'NotThisBrand',
          priority: 1,
        },
      ],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.lines.find((l) => l.category === 'TYRE')?.totalCents).toBe(190000);
    expect(totals.lines.find((l) => l.category === 'WHEEL')?.totalCents).toBe(400000);
  });

  it('applies fixed price rules once per line in priority order', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [
        {
          id: 'rule-b',
          category: 'LABOUR',
          adjustmentType: 'FIXED',
          percentBasisPoints: null,
          amountCents: 500,
          brand: null,
          priority: 2,
        },
        {
          id: 'rule-a',
          category: 'LABOUR',
          adjustmentType: 'FIXED',
          percentBasisPoints: null,
          amountCents: -1000,
          brand: null,
          priority: 1,
        },
      ],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    // Every labour line: total − 1000, then + 500. Lines present in
    // category-then-description order (Fitment, alignment, balancing).
    const labour = totals.lines.filter((l) => l.category === 'LABOUR');
    expect(labour.map((l) => l.totalCents)).toEqual([9500, 9000, 5500]);
    const subtotal = 625500 - 3 * 1000 + 3 * 500;
    expect(totals.subtotalCents).toBe(subtotal);
  });

  it('never lets price rules drive a line below zero', () => {
    const totals = computeTotals({
      items: [
        {
          category: 'ACCESSORY',
          description: 'Valve caps',
          quantity: 1,
          unitAmountCents: 1000,
          brand: null,
        },
      ],
      priceRules: [
        {
          id: 'rule-neg',
          category: 'ACCESSORY',
          adjustmentType: 'FIXED',
          percentBasisPoints: null,
          amountCents: -5000,
          brand: null,
          priority: 1,
        },
      ],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.lines[0].totalCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });

  it('compounds order-wide percent discounts sequentially against the remainder', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [
        {
          id: 'd1',
          name: 'Loyalty 10%',
          kind: 'PERCENT',
          percentBasisPoints: 1000,
          amountCents: null,
          category: null,
          priority: 1,
        },
        {
          id: 'd2',
          name: 'Manager 5%',
          kind: 'PERCENT',
          percentBasisPoints: 500,
          amountCents: null,
          category: null,
          priority: 2,
        },
      ],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    // 625500 − 62550 = 562950; then −5% of 562950 = 28147.5 → 28148 (kernel rounding).
    expect(totals.discountsApplied).toEqual([
      { ruleId: 'd1', name: 'Loyalty 10%', amountCents: 62550 },
      { ruleId: 'd2', name: 'Manager 5%', amountCents: 28148 },
    ]);
    expect(totals.discountCents).toBe(62550 + 28148);
    const discounted = 625500 - 62550 - 28148;
    expect(totals.vatCents).toBe(SOUTH_AFRICAN_VAT.calculate(discounted));
    expect(totals.totalCents).toBe(discounted + totals.vatCents);
  });

  it('scopes category discounts to that category only', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [
        {
          id: 'd-wheels',
          name: 'Wheel special',
          kind: 'PERCENT',
          percentBasisPoints: 2500, // 25% off wheels
          amountCents: null,
          category: 'WHEEL',
          priority: 1,
        },
      ],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.discountCents).toBe(100000); // 25% of 400000
    expect(totals.subtotalCents).toBe(625500);
    expect(totals.totalCents).toBe(525500 + SOUTH_AFRICAN_VAT.calculate(525500));
  });

  it('caps fixed discounts at the remaining base (never negative money)', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [
        {
          id: 'd-huge',
          name: 'Everything free',
          kind: 'FIXED',
          percentBasisPoints: null,
          amountCents: 999_999_999,
          category: null,
          priority: 1,
        },
      ],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.discountCents).toBe(625500);
    expect(totals.vatCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });

  it('skips zero-value discount applications instead of recording noise', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [
        {
          id: 'd-empty',
          name: 'Empty category',
          kind: 'PERCENT',
          percentBasisPoints: 1000,
          amountCents: null,
          category: 'ACCESSORY', // no accessory lines in the book
          priority: 1,
        },
      ],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.discountsApplied).toEqual([]);
    expect(totals.discountCents).toBe(0);
  });

  it('records line totals after rules, sorted for presentation', () => {
    const totals = computeTotals({
      items: baseItems,
      priceRules: [],
      discountRules: [],
      taxStrategy: SOUTH_AFRICAN_VAT,
    });
    expect(totals.lines[0]).toMatchObject({
      category: 'WHEEL',
      quantity: 4,
      unitAmountCents: 100000,
      totalCents: 400000,
      sortOrder: 10,
    });
    expect(totals.lines[4]).toMatchObject({
      category: 'LABOUR',
      description: 'Wheel balancing (per wheel)',
    });
  });
});
