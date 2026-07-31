import { describe, expect, it } from 'vitest';
import { AppError } from '@/server/utils/errors';
import { PricingService } from '@/server/services/pricing-service';
import { PRICE_BOOK, createPricingRepositoryFake } from '@/tests/helpers/quote-fixtures';
import { ps4Detail, te37Detail } from '@/tests/helpers/catalog-fixtures';

const pricingInput = {
  tenantId: 'tenant-1',
  wheel: te37Detail,
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyre: ps4Detail,
  tyreProfileId: 'pf-265-65-17',
  at: new Date('2026-07-31T10:00:00.000Z'),
};

describe('PricingService', () => {
  it('prices a full configuration deterministically against the price book', async () => {
    const service = new PricingService(createPricingRepositoryFake());

    const first = await service.priceConfiguration(pricingInput);
    const second = await service.priceConfiguration(pricingInput);

    expect(first).toEqual(second); // deterministic across identical calls
    expect(first.priceList).toMatchObject({
      id: 'pricelist-1',
      name: 'Retail Price List',
      kind: 'RETAIL',
      currency: 'ZAR',
    });
    expect(first.subtotalCents).toBe(PRICE_BOOK.subtotalCents);
    expect(first.discountCents).toBe(0);
    expect(first.vatBasisPoints).toBe(1500);
    expect(first.vatCents).toBe(PRICE_BOOK.vatCents);
    expect(first.totalCents).toBe(PRICE_BOOK.totalCents);
    expect(first.currency).toBe('ZAR');
    expect(first.tax.code).toBe('ZA_VAT');
    expect(first.lines).toHaveLength(5);
  });

  it('builds honest descriptions from the priced entities', async () => {
    const service = new PricingService(createPricingRepositoryFake());
    const { lines } = await service.priceConfiguration(pricingInput);

    expect(lines.find((line) => line.category === 'WHEEL')?.description).toBe(
      'Rays TE37 18×8.0J — Matte Black',
    );
    expect(lines.find((line) => line.category === 'TYRE')?.description).toBe(
      'Michelin Pilot Sport 4 265/65 R17',
    );
  });

  it('aborts loudly when the wheel has no price (no placeholder pricing)', async () => {
    const service = new PricingService(createPricingRepositoryFake({ wheelAmount: null }));

    await expect(service.priceConfiguration(pricingInput)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { missingPrices: ['wheel'] },
    });
  });

  it('aborts when the tyre price is missing, listing every gap', async () => {
    const service = new PricingService(
      createPricingRepositoryFake({ wheelAmount: null, tyreAmount: null }),
    );

    await expect(service.priceConfiguration(pricingInput)).rejects.toMatchObject({
      statusCode: 400,
      details: { missingPrices: ['wheel', 'tyre'] },
    });
  });

  it('requires the full labour rate card (fitment, balancing, alignment)', async () => {
    const service = new PricingService(
      createPricingRepositoryFake({
        labour: [{ serviceType: 'FITMENT', unit: 'PER_WHEEL', amountCents: 2500 }],
      }),
    );

    await expect(service.priceConfiguration(pricingInput)).rejects.toMatchObject({
      statusCode: 400,
      details: { missingPrices: ['labour:balancing', 'labour:alignment'] },
    });
  });

  it('translates an unpriced labour-only gap into a human instruction', async () => {
    const service = new PricingService(createPricingRepositoryFake({ tyreAmount: null }));

    const error = (await service
      .priceConfiguration(pricingInput)
      .catch((e: unknown) => e)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toContain('Pricing is not available');
    expect(error.message).toContain('administrator');
  });

  it('fails hard when the tenant has no active default price list', async () => {
    const service = new PricingService(createPricingRepositoryFake({ priceList: null }));

    await expect(service.priceConfiguration(pricingInput)).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  });

  it('fails hard when the price list currency is not in the registry', async () => {
    const service = new PricingService(
      createPricingRepositoryFake({
        priceList: { id: 'pl', name: 'USD list', kind: 'RETAIL', currency: 'USD' },
      }),
    );

    await expect(service.priceConfiguration(pricingInput)).rejects.toThrow(/Unsupported currency/);
  });

  it('threads price-list adjustments and discount windows into the totals', async () => {
    const service = new PricingService(
      createPricingRepositoryFake({
        discountRules: [
          {
            id: 'd1',
            name: 'Winter special',
            kind: 'PERCENT',
            percentBasisPoints: 1000,
            amountCents: null,
            category: null,
            priority: 1,
          },
        ],
      }),
    );

    const result = await service.priceConfiguration(pricingInput);
    expect(result.discountsApplied).toEqual([
      { ruleId: 'd1', name: 'Winter special', amountCents: 62550 },
    ]);
    expect(result.discountCents).toBe(62550);
    expect(result.vatCents).toBe(84443); // 562950 × 15%, half-up
    expect(result.totalCents).toBe(562950 + 84443);
  });

  it('passes the selection qualifiers to the price lookups (size/profile specificity)', async () => {
    const lookups: Array<unknown[]> = [];
    const port = createPricingRepositoryFake();
    const recording = {
      ...port,
      findWheelPrice: async (...args: unknown[]) => {
        lookups.push(args);
        return 100000;
      },
    };
    const service = new PricingService(recording);

    await service.priceConfiguration(pricingInput);
    expect(lookups[0]).toEqual(['tenant-1', 'pricelist-1', te37Detail.id, 'sz-18x8']);
  });
});
