import { describe, expect, it } from 'vitest';
import {
  buildQuoteDetail,
  buildSnapshotPayload,
  collectAssetReferences,
  toSnapshotConfiguration,
  toSnapshotTyre,
  toSnapshotVehicle,
  toSnapshotWheel,
} from '@/server/quote/quote-builder';
import { hiluxDetail, ps4Detail, te37Detail } from '@/tests/helpers/catalog-fixtures';
import {
  completeConfiguration,
  createQuoteRecord,
  PRICE_BOOK,
} from '@/tests/helpers/quote-fixtures';
import type { CreateQuoteInput } from '@/server/validators/quote-schemas';
import type { QuoteSnapshotPayload } from '@/types/quote';

const input: CreateQuoteInput = {
  configuration: { ...completeConfiguration },
  customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
  consultantName: 'Thandi',
};

const pricing: QuoteSnapshotPayload['pricing'] = {
  priceList: { id: 'pricelist-1', name: 'Retail Price List', kind: 'RETAIL', currency: 'ZAR' },
  lines: [
    {
      id: 'line-wheel',
      category: 'WHEEL',
      description: 'Rays TE37 18×8.0J — Matte Black',
      quantity: 4,
      unitAmountCents: 100000,
      totalCents: 400000,
      sortOrder: 10,
      metadata: null,
    },
  ],
  subtotalCents: PRICE_BOOK.subtotalCents,
  discountCents: 0,
  discountsApplied: [],
  tax: { strategy: 'ZA_VAT', name: 'VAT (South Africa)', rateBasisPoints: 1500, vatCents: 93825 },
  totalCents: PRICE_BOOK.totalCents,
  currency: 'ZAR',
};

function assemble() {
  return buildSnapshotPayload({
    quoteNumber: 'WV-2026-000001',
    issuedAt: new Date('2026-07-31T10:00:00.000Z'),
    validUntil: new Date('2026-08-30T10:00:00.000Z'),
    dealer: { id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' },
    input,
    customer: { name: input.customer.name, email: 'nkosi@example.co.za', phone: null },
    vehicle: hiluxDetail,
    wheel: te37Detail,
    tyre: ps4Detail,
    pricing,
  });
}

describe('snapshot projection mappers', () => {
  it('projects the vehicle with its render package', () => {
    expect(toSnapshotVehicle(hiluxDetail)).toEqual({
      id: hiluxDetail.id,
      manufacturer: 'Toyota',
      model: 'Hilux',
      variant: 'SR5 Double Cab',
      year: 2025,
      colours: hiluxDetail.colours,
      renderMetadata: hiluxDetail.renderMetadata,
    });
  });

  it('projects the wheel with the exact finish and size chosen', () => {
    const snapshot = toSnapshotWheel(te37Detail, 'Matte Black', 'sz-18x8');
    expect(snapshot.finish).toBe('Matte Black');
    expect(snapshot.size?.id).toBe('sz-18x8');
    expect(snapshot.size?.offsetMm).toBe(35);
    expect(toSnapshotWheel(te37Detail, null, null).size).toBeNull();
  });

  it('projects the tyre with the exact profile chosen', () => {
    const snapshot = toSnapshotTyre(ps4Detail, 'pf-265-65-17');
    expect(snapshot.profile?.profile).toBe('265/65 R17');
    expect(toSnapshotTyre(ps4Detail, 'missing').profile).toBeNull();
  });

  it('collects only existing asset references', () => {
    const vehicle = toSnapshotVehicle(hiluxDetail);
    expect(collectAssetReferences(vehicle)).toEqual([
      '/vehicles/toyota/hilux/2025/vehicle.webp',
      '/vehicles/toyota/hilux/2025/mask.webp',
      '/vehicles/toyota/hilux/2025/shadow.webp',
    ]);
    expect(collectAssetReferences({ ...vehicle, renderMetadata: null })).toEqual([]);
  });

  it('normalises boundary configuration to the full seven-field shape', () => {
    expect(toSnapshotConfiguration({ vehicleId: 'v-1', wheelId: 'w-1', tyreId: 't-1' })).toEqual({
      vehicleId: 'v-1',
      colour: null,
      wheelId: 'w-1',
      wheelFinish: null,
      wheelSizeId: null,
      tyreId: 't-1',
      tyreProfileId: null,
    });
  });
});

describe('buildSnapshotPayload — the immutable quote', () => {
  it('assembles everything required to reproduce the quote forever', () => {
    const snapshot = assemble();

    expect(snapshot.version).toBe(1);
    expect(snapshot.quoteNumber).toBe('WV-2026-000001');
    expect(snapshot.issuedAt).toBe('2026-07-31T10:00:00.000Z');
    expect(snapshot.validUntil).toBe('2026-08-30T10:00:00.000Z');
    expect(snapshot.dealer).toEqual({ id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' });
    expect(snapshot.customer.name).toBe('Mrs Nkosi');
    expect(snapshot.consultant).toEqual({ name: 'Thandi' });
    expect(snapshot.configuration).toEqual(completeConfiguration);
    expect(snapshot.colour).toBe('Silver');
    expect(snapshot.vehicle.id).toBe(hiluxDetail.id);
    expect(snapshot.wheel.size?.id).toBe('sz-18x8');
    expect(snapshot.tyre.profile?.id).toBe('pf-265-65-17');
    expect(snapshot.assetReferences).toHaveLength(3);
    expect(snapshot.pricing.totalCents).toBe(PRICE_BOOK.totalCents);
    expect(snapshot.pricing.tax).toMatchObject({ strategy: 'ZA_VAT', rateBasisPoints: 1500 });
  });

  it('records a null consultant when none was captured', () => {
    const snapshot = buildSnapshotPayload({
      quoteNumber: 'WV-2026-000002',
      issuedAt: new Date('2026-07-31T10:00:00.000Z'),
      validUntil: new Date('2026-08-30T10:00:00.000Z'),
      dealer: { id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' },
      input: { ...input, consultantName: null },
      customer: { name: 'Mrs Nkosi', email: null, phone: null },
      vehicle: hiluxDetail,
      wheel: te37Detail,
      tyre: ps4Detail,
      pricing,
    });
    expect(snapshot.consultant).toBeNull();
  });

  it('deep-freezes the whole payload — a quote can never mutate after issue', () => {
    const snapshot = assemble();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.pricing)).toBe(true);
    expect(Object.isFrozen(snapshot.configuration)).toBe(true);
    expect(Object.isFrozen(snapshot.pricing.lines)).toBe(true);
    expect(Object.isFrozen(snapshot.pricing.lines[0])).toBe(true);
  });

  it('detaches payload pricing from the input (no shared references)', () => {
    const snapshot = assemble();
    const lineBefore = pricing.lines[0];
    expect(snapshot.pricing.lines[0]).not.toBe(lineBefore);
    expect(snapshot.pricing.lines[0]).toEqual(lineBefore);
  });
});

describe('buildQuoteDetail — record to API DTO', () => {
  it('maps the persisted record with totals derived from cent columns', () => {
    const detail = buildQuoteDetail(createQuoteRecord());

    expect(detail.id).toBe('7d8f36c2-52ff-4c3d-9b35-2b266f0e5d21');
    expect(detail.quoteNumber).toBe('WV-2026-000001');
    expect(detail.status).toBe('ISSUED');
    expect(detail.customerName).toBe('Mrs Nkosi');
    expect(detail.totals).toEqual({
      subtotalCents: PRICE_BOOK.subtotalCents,
      discountCents: 0,
      vatBasisPoints: 1500,
      vatCents: PRICE_BOOK.vatCents,
      totalCents: PRICE_BOOK.totalCents,
      currency: 'ZAR',
    });
    expect(detail.lines).toHaveLength(2);
    expect(detail.dealer).toEqual({
      id: 'tenant-uuid-1',
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    });
    expect(detail.snapshot?.quoteNumber).toBe('WV-2026-000001');
    expect(detail.consultantName).toBe('Thandi');
  });

  it('falls back to the legacy decimal column when cent columns are absent', () => {
    const legacy = createQuoteRecord({
      subtotalCents: null,
      discountCents: null,
      vatBasisPoints: null,
      vatCents: null,
      totalAmount: '1234.56',
    });
    const detail = buildQuoteDetail(legacy);
    expect(detail.totals.totalCents).toBe(123456);
    expect(detail.totals.subtotalCents).toBe(123456);
    expect(detail.totals.discountCents).toBe(0);
    expect(detail.totals.vatCents).toBe(0);
  });

  it('keeps totals exact when cents columns exist (subtotal − discount + vat)', () => {
    const detail = buildQuoteDetail(
      createQuoteRecord({ subtotalCents: 100000, discountCents: 10000, vatCents: 13500 }),
    );
    expect(detail.totals.totalCents).toBe(103500);
  });

  it('deep-freezes the DTO it returns', () => {
    const detail = buildQuoteDetail(createQuoteRecord());
    expect(Object.isFrozen(detail)).toBe(true);
    expect(Object.isFrozen(detail.totals)).toBe(true);
    expect(Object.isFrozen(detail.lines)).toBe(true);
  });

  it('maps an archived record without touching content', () => {
    const archived = buildQuoteDetail(
      createQuoteRecord({
        status: 'ARCHIVED',
        archivedAt: new Date('2026-08-01T09:00:00.000Z'),
      }),
    );
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archivedAt).toBe('2026-08-01T09:00:00.000Z');
    expect(archived.totals.totalCents).toBe(719325);
  });
});
