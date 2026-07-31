import type { PreviewSelection } from '@/features/preview/state/preview-store';
import type {
  CreateQuoteRecordInput,
  QuoteLineRecord,
  QuoteRecord,
} from '@/server/repositories/quote-repository';
import type { PricingRepositoryPort } from '@/server/repositories/pricing-repository';
import { hiluxDetail, ps4Detail, te37Detail } from '@/tests/helpers/catalog-fixtures';
import type { CreateQuoteRequest, QuoteSnapshotPayload } from '@/types/quote';

/**
 * Quote-domain fixtures — one deterministic price book (integer arithmetic
 * verified by hand), reused by the totals, pricing-service, quote-service
 * and API tests so expectations stay consistent everywhere.
 *
 * Worked example, no rules/discounts:
 *   wheels    4 × 100000 = 400000
 *   tyres     4 ×  50000 = 200000
 *   fitment   4 ×   2500 =  10000
 *   balancing 4 ×   1500 =   6000
 *   alignment 1 ×   9500 =   9500
 *   subtotal               = 625500 → VAT 15% = 93825 → total 719325
 */

export const QUOTE_FIXTURE_IDS = {
  tenant: 'tenant-uuid-1',
  priceList: 'pricelist-1',
  quoteId: '7d8f36c2-52ff-4c3d-9b35-2b266f0e5d21',
  customerId: 'customer-1',
  savedConfigurationId: 'saved-config-1',
} as const;

export const completeConfiguration: PreviewSelection = {
  vehicleId: hiluxDetail.id,
  colour: 'Silver',
  wheelId: te37Detail.id,
  wheelFinish: 'Matte Black',
  wheelSizeId: 'sz-18x8',
  tyreId: ps4Detail.id,
  tyreProfileId: 'pf-265-65-17',
};

export const createQuoteRequest: CreateQuoteRequest = {
  configuration: { ...completeConfiguration },
  customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
  consultantName: 'Thandi',
};

export const PRICE_BOOK = {
  wheelUnitCents: 100000,
  tyreUnitCents: 50000,
  fitmentCents: 2500,
  balancingCents: 1500,
  alignmentCents: 9500,
  subtotalCents: 625500,
  vatCents: 93825,
  totalCents: 719325,
} as const;

/** A PricingRepositoryPort fake with the fixture book; override per test. */
export function createPricingRepositoryFake(
  overrides: Partial<{
    priceList: Awaited<ReturnType<PricingRepositoryPort['findDefaultPriceList']>>;
    wheelAmount: number | null;
    tyreAmount: number | null;
    labour: Awaited<ReturnType<PricingRepositoryPort['listLabourPrices']>>;
    priceRules: Awaited<ReturnType<PricingRepositoryPort['listActivePriceRules']>>;
    discountRules: Awaited<ReturnType<PricingRepositoryPort['listActiveDiscountRules']>>;
  }> = {},
): PricingRepositoryPort {
  return {
    findDefaultPriceList: async () =>
      overrides.priceList === undefined
        ? {
            id: QUOTE_FIXTURE_IDS.priceList,
            name: 'Retail Price List',
            kind: 'RETAIL',
            currency: 'ZAR',
          }
        : overrides.priceList,
    findWheelPrice: async () =>
      overrides.wheelAmount === undefined ? PRICE_BOOK.wheelUnitCents : overrides.wheelAmount,
    findTyrePrice: async () =>
      overrides.tyreAmount === undefined ? PRICE_BOOK.tyreUnitCents : overrides.tyreAmount,
    listLabourPrices: async () =>
      overrides.labour ?? [
        { serviceType: 'FITMENT', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.fitmentCents },
        { serviceType: 'BALANCING', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.balancingCents },
        { serviceType: 'ALIGNMENT', unit: 'PER_VEHICLE', amountCents: PRICE_BOOK.alignmentCents },
      ],
    listActivePriceRules: async () => overrides.priceRules ?? [],
    listActiveDiscountRules: async () => overrides.discountRules ?? [],
  };
}

/** A QuoteRecord matching the fixture book as persisted (lines + snapshot). */
export function createQuoteRecord(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  const lines: QuoteLineRecord[] = [
    {
      id: 'line-wheel',
      category: 'WHEEL',
      description: 'Rays TE37 18×8.0J — Matte Black',
      quantity: 4,
      unitAmountCents: PRICE_BOOK.wheelUnitCents,
      totalCents: 400000,
      sortOrder: 10,
      metadata: null,
    },
    {
      id: 'line-tyre',
      category: 'TYRE',
      description: 'Michelin Pilot Sport 4 265/65 R17',
      quantity: 4,
      unitAmountCents: PRICE_BOOK.tyreUnitCents,
      totalCents: 200000,
      sortOrder: 20,
      metadata: null,
    },
  ];
  const snapshot: QuoteSnapshotPayload = {
    version: 1,
    quoteNumber: 'WV-2026-000001',
    issuedAt: '2026-07-31T10:00:00.000Z',
    validUntil: '2026-08-30T10:00:00.000Z',
    dealer: { id: QUOTE_FIXTURE_IDS.tenant, name: 'Demo Tenant', slug: 'demo-tenant' },
    customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
    consultant: { name: 'Thandi' },
    configuration: { ...completeConfiguration },
    vehicle: {
      id: hiluxDetail.id,
      manufacturer: 'Toyota',
      model: 'Hilux',
      variant: 'SR5 Double Cab',
      year: 2025,
      colours: hiluxDetail.colours,
      renderMetadata: hiluxDetail.renderMetadata,
    },
    colour: 'Silver',
    wheel: {
      id: te37Detail.id,
      brand: 'Rays',
      model: 'TE37',
      finish: 'Matte Black',
      size: te37Detail.sizes[0],
    },
    tyre: {
      id: ps4Detail.id,
      brand: 'Michelin',
      pattern: 'Pilot Sport 4',
      profile: ps4Detail.profiles[0],
    },
    assetReferences: ['vehicles/toyota/hilux/2025/vehicle.webp'],
    pricing: {
      priceList: { id: 'pricelist-1', name: 'Retail Price List', kind: 'RETAIL', currency: 'ZAR' },
      lines: [],
      subtotalCents: PRICE_BOOK.subtotalCents,
      discountCents: 0,
      discountsApplied: [],
      tax: {
        strategy: 'ZA_VAT',
        name: 'VAT (South Africa)',
        rateBasisPoints: 1500,
        vatCents: 93825,
      },
      totalCents: PRICE_BOOK.totalCents,
      currency: 'ZAR',
    },
  };

  return {
    id: QUOTE_FIXTURE_IDS.quoteId,
    tenantId: QUOTE_FIXTURE_IDS.tenant,
    quoteNumber: 'WV-2026-000001',
    status: 'ISSUED',
    consultantName: 'Thandi',
    currency: 'ZAR',
    totalAmount: '7193.25',
    subtotalCents: PRICE_BOOK.subtotalCents,
    discountCents: 0,
    vatBasisPoints: 1500,
    vatCents: PRICE_BOOK.vatCents,
    createdAt: new Date('2026-07-31T10:00:00.000Z'),
    updatedAt: new Date('2026-07-31T10:00:00.000Z'),
    validUntil: new Date('2026-08-30T10:00:00.000Z'),
    archivedAt: null,
    tenant: { id: QUOTE_FIXTURE_IDS.tenant, name: 'Demo Tenant', slug: 'demo-tenant' },
    customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
    lines,
    snapshot: { payload: snapshot },
    statusHistories: [],
    ...overrides,
  };
}

/** Minimal valid CreateQuoteRecordInput for repository composition tests. */
export function createRecordInput(
  overrides: Partial<CreateQuoteRecordInput> = {},
): CreateQuoteRecordInput {
  return {
    tenantId: QUOTE_FIXTURE_IDS.tenant,
    issuedAt: new Date('2026-07-31T10:00:00.000Z'),
    customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
    configuration: {
      vehicleVariantId: hiluxDetail.id,
      vehicleModelId: 'vehicle-model-1',
      wheelModelId: te37Detail.id,
      tyreModelId: ps4Detail.id,
    },
    consultantName: 'Thandi',
    currency: 'ZAR',
    subtotalCents: PRICE_BOOK.subtotalCents,
    discountCents: 0,
    vatBasisPoints: 1500,
    vatCents: PRICE_BOOK.vatCents,
    totalCents: PRICE_BOOK.totalCents,
    validUntil: new Date('2026-08-30T10:00:00.000Z'),
    lines: [
      {
        id: 'line-wheel',
        category: 'WHEEL',
        description: 'Rays TE37 18×8.0J — Matte Black',
        quantity: 4,
        unitAmountCents: PRICE_BOOK.wheelUnitCents,
        totalCents: 400000,
        sortOrder: 10,
        metadata: null,
      },
      {
        id: 'line-tyre',
        category: 'TYRE',
        description: 'Michelin Pilot Sport 4 265/65 R17',
        quantity: 4,
        unitAmountCents: PRICE_BOOK.tyreUnitCents,
        totalCents: 200000,
        sortOrder: 20,
        metadata: null,
      },
    ],
    snapshotPayload: { version: 1, quoteNumber: 'WV-PENDING' },
    ...overrides,
  };
}
