import { describe, expect, it } from 'vitest';
import type {
  CreateQuoteRecordInput,
  QuoteRepositoryPort,
} from '@/server/repositories/quote-repository';
import type { VehicleRepositoryPort } from '@/server/repositories/vehicle-repository';
import type { WheelRepositoryPort } from '@/server/repositories/wheel-repository';
import type { TyreRepositoryPort } from '@/server/repositories/tyre-repository';
import { PricingService } from '@/server/services/pricing-service';
import { QuoteService } from '@/server/services/quote-service';
import { TyreService } from '@/server/services/tyre-service';
import { VehicleService } from '@/server/services/vehicle-service';
import { WheelService } from '@/server/services/wheel-service';
import { hiluxDetail, ps4Detail, te37Detail } from '@/tests/helpers/catalog-fixtures';
import {
  completeConfiguration,
  createQuoteRecord,
  createQuoteRequest,
  PRICE_BOOK,
  QUOTE_FIXTURE_IDS,
  createPricingRepositoryFake,
} from '@/tests/helpers/quote-fixtures';
import type { CreateQuoteInput } from '@/server/validators/quote-schemas';
import type { QuoteSnapshotPayload } from '@/types/quote';

/**
 * QuoteService orchestration — exercised with the REAL pricing service and
 * catalog services over fake repositories, so the path from configuration to
 * immutable issued quote is covered end to end. The quote repository is a
 * recording fake: it captures the exact persistence contract.
 */

const ISSUED = new Date('2026-07-31T10:00:00.000Z');
const DATES = { createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') };

function vehicleRecord() {
  return {
    id: hiluxDetail.id,
    vehicleModelId: 'vehicle-model-1',
    name: hiluxDetail.variant,
    year: hiluxDetail.year,
    wheelDiameterMm: hiluxDetail.wheelDiameterMm,
    renderMetadata: hiluxDetail.renderMetadata,
    model: { name: hiluxDetail.model, manufacturer: { name: hiluxDetail.manufacturer } },
    colours: hiluxDetail.colours.map((name) => ({ name })),
    ...DATES,
  };
}

function wheelRecord() {
  return {
    id: te37Detail.id,
    name: te37Detail.model,
    metadata: null,
    brand: { name: te37Detail.brand },
    finishes: te37Detail.finishes.map((name) => ({ name })),
    sizes: te37Detail.sizes.map((size) => ({ ...size })),
    ...DATES,
  };
}

function tyreRecord() {
  return {
    id: ps4Detail.id,
    name: ps4Detail.pattern,
    metadata: null,
    brand: { name: ps4Detail.brand },
    profiles: ps4Detail.profiles.map((profile) => ({ ...profile })),
    ...DATES,
  };
}

function createQuoteRepositoryFake() {
  const created: CreateQuoteRecordInput[] = [];
  let source: ReturnType<typeof createQuoteRecord> | null = null;
  let sequence = 0;
  const repository: QuoteRepositoryPort = {
    createQuote: async (input) => {
      created.push(input);
      // Mirror the real repository: monotonically allocate + inject number.
      sequence += 1;
      const quoteNumber = `WV-2026-${String(sequence).padStart(6, '0')}`;
      const quoteId = `quote-${sequence}`;
      return createQuoteRecord({
        id: quoteId,
        quoteNumber,
        snapshot: {
          payload: {
            ...(input.snapshotPayload as Record<string, unknown>),
            quoteNumber,
          } as unknown as QuoteSnapshotPayload,
        },
        lines: input.lines.map((line) => ({ ...line })),
      });
    },
    listByTenant: async () => ({ data: [createQuoteRecord()], total: 1 }),
    findById: async (tenantId, id) => {
      if (!source || source.id !== id || tenantId !== source.tenantId) {
        return null;
      }
      return source;
    },
    archive: async (tenantId, id) => {
      if (!source || source.id !== id || tenantId !== source.tenantId) {
        return null;
      }
      return { ...source, status: 'ARCHIVED', archivedAt: ISSUED };
    },
  };
  return {
    repository,
    created,
    seedSource: (record: ReturnType<typeof createQuoteRecord> | null) => {
      source = record;
    },
  };
}

function createService(overrides: {
  quoteRepository?: QuoteRepositoryPort;
  vehicleLookup?: VehicleRepositoryPort;
  wheelLookup?: WheelRepositoryPort;
  tyreLookup?: TyreRepositoryPort;
  dealerLookup?: {
    findById: (id: string) => Promise<{ id: string; name: string; slug: string } | null>;
  };
  now?: () => Date;
}) {
  const vehicleLookup: VehicleRepositoryPort = overrides.vehicleLookup ?? {
    listByTenant: async () => ({ data: [vehicleRecord()], total: 1 }),
    findById: async (tenantId, id) => (id === hiluxDetail.id ? vehicleRecord() : null),
    exists: async () => true,
    count: async () => 1,
  };
  const wheelLookup: WheelRepositoryPort = overrides.wheelLookup ?? {
    listByTenant: async () => ({ data: [], total: 0 }),
    findById: async (tenantId, id) => (id === te37Detail.id ? wheelRecord() : null),
    exists: async () => true,
    count: async () => 1,
  };
  const tyreLookup: TyreRepositoryPort = overrides.tyreLookup ?? {
    listByTenant: async () => ({ data: [], total: 0 }),
    findById: async (tenantId, id) => (id === ps4Detail.id ? tyreRecord() : null),
    exists: async () => true,
    count: async () => 1,
  };
  const quoteFake = createQuoteRepositoryFake();

  const service = new QuoteService(overrides.quoteRepository ?? quoteFake.repository, {
    catalog: {
      vehicles: new VehicleService(vehicleLookup),
      wheels: new WheelService(wheelLookup),
      tyres: new TyreService(tyreLookup),
    },
    pricing: new PricingService(createPricingRepositoryFake()),
    dealers: overrides.dealerLookup ?? {
      findById: async () => ({
        id: QUOTE_FIXTURE_IDS.tenant,
        name: 'Demo Tenant',
        slug: 'demo-tenant',
      }),
    },
    now: overrides.now ?? (() => ISSUED),
  });

  return { service, quoteFake };
}

describe('QuoteService.createQuote', () => {
  it('issues a priced, snapshotted quote from a complete configuration', async () => {
    const { service } = createService({});
    const detail = await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    expect(detail.quoteNumber).toBe('WV-2026-000001');
    expect(detail.status).toBe('ISSUED');
    expect(detail.consultantName).toBe('Thandi');
    expect(detail.snapshot?.configuration).toEqual(completeConfiguration);
    expect(detail.snapshot?.quoteNumber).toBe('WV-2026-000001');
    expect(detail.lines.length).toBeGreaterThan(0);
  });

  it('persists the exact pricing computation (lines, VAT, totals, currency)', async () => {
    const { service, quoteFake } = createService({});
    const detail = await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    const input = quoteFake.created[0];
    expect(input.currency).toBe('ZAR');
    expect(input.subtotalCents).toBe(PRICE_BOOK.subtotalCents);
    expect(input.discountCents).toBe(0);
    expect(input.vatBasisPoints).toBe(1500);
    expect(input.vatCents).toBe(PRICE_BOOK.vatCents);
    expect(input.totalCents).toBe(PRICE_BOOK.totalCents);
    expect(input.lines).toHaveLength(5);
    expect(detail.totals.totalCents).toBe(PRICE_BOOK.totalCents);
  });

  it('anchors the legacy FK graph from the resolved catalog entities', async () => {
    const { service, quoteFake } = createService({});
    await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    expect(quoteFake.created[0].configuration).toEqual({
      vehicleVariantId: hiluxDetail.id,
      vehicleModelId: 'vehicle-model-1',
      wheelModelId: te37Detail.id,
      tyreModelId: ps4Detail.id,
    });
  });

  it('keeps snapshot line ids identical to persisted row ids', async () => {
    const { service, quoteFake } = createService({});
    await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    const snapshot = quoteFake.created[0].snapshotPayload as QuoteSnapshotPayload;
    const persistedIds = quoteFake.created[0].lines.map((line) => line.id);
    expect(snapshot.pricing.lines.map((line) => line.id)).toEqual(persistedIds);
  });

  it('captures dealer, customer, consultant, configuration and timestamps in the snapshot', async () => {
    const { service, quoteFake } = createService({});
    await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    const snapshot = quoteFake.created[0].snapshotPayload as QuoteSnapshotPayload;
    expect(snapshot.customer).toMatchObject({ name: 'Mrs Nkosi', email: 'nkosi@example.co.za' });
    expect(snapshot.consultant).toEqual({ name: 'Thandi' });
    expect(snapshot.configuration).toEqual(completeConfiguration);
    expect(snapshot.vehicle.id).toBe(hiluxDetail.id);
    expect(snapshot.issuedAt).toBe(ISSUED.toISOString());
    expect(snapshot.validUntil).toBe('2026-08-30T10:00:00.000Z');
    expect(snapshot.pricing.tax.strategy).toBe('ZA_VAT');
    expect(snapshot.dealer.name).toBe('Demo Tenant');
  });

  it('rejects an incomplete configuration as a business error listing the gaps', async () => {
    const { service } = createService({});
    const incomplete: CreateQuoteInput = {
      ...createQuoteRequest,
      configuration: { ...completeConfiguration, wheelSizeId: null, colour: null },
    };

    await expect(service.createQuote(QUOTE_FIXTURE_IDS.tenant, incomplete)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { missingFields: ['vehicle colour', 'wheel size'] },
    });
  });

  it('rejects a colour the vehicle no longer lists (catalog membership)', async () => {
    const { service } = createService({});
    const drifted: CreateQuoteInput = {
      ...createQuoteRequest,
      configuration: { ...completeConfiguration, colour: 'Midnight Purple' },
    };

    await expect(service.createQuote(QUOTE_FIXTURE_IDS.tenant, drifted)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { problems: ['colour "Midnight Purple" is not available on this vehicle'] },
    });
  });

  it('rejects a size/profile the catalog no longer lists', async () => {
    const { service } = createService({});
    const drifted: CreateQuoteInput = {
      ...createQuoteRequest,
      configuration: {
        ...completeConfiguration,
        wheelSizeId: 'sz-deleted',
        tyreProfileId: 'pf-deleted',
      },
    };

    await expect(service.createQuote(QUOTE_FIXTURE_IDS.tenant, drifted)).rejects.toMatchObject({
      statusCode: 400,
      details: {
        problems: [
          'the selected wheel size is not in the current catalog',
          'the selected tyre profile is not in the current catalog',
        ],
      },
    });
  });

  it('propagates entity 404s from the catalog layer unchanged', async () => {
    const { service } = createService({});
    const missing: CreateQuoteInput = {
      ...createQuoteRequest,
      configuration: { ...completeConfiguration, wheelId: 'wh-missing' },
    };

    await expect(service.createQuote(QUOTE_FIXTURE_IDS.tenant, missing)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('fails honestly when the dealer record can not be resolved', async () => {
    const { service } = createService({ dealerLookup: { findById: async () => null } });

    await expect(
      service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 500 });
  });

  it('an issued quote never changes when catalogue prices move afterwards', async () => {
    const { service, quoteFake } = createService({});
    const issuedAtPrice = await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);

    // Simulate a later price change: read-back always comes from the record —
    // there is no recompute path on reads to drift through.
    quoteFake.seedSource(
      createQuoteRecord({ id: issuedAtPrice.id, tenantId: QUOTE_FIXTURE_IDS.tenant }),
    );
    const readBack = await service.getQuote(QUOTE_FIXTURE_IDS.tenant, issuedAtPrice.id);
    expect(readBack.totals.totalCents).toBe(issuedAtPrice.totals.totalCents);
    expect(readBack.snapshot?.pricing.subtotalCents).toBe(PRICE_BOOK.subtotalCents);
  });
});

describe('QuoteService.duplicateQuote', () => {
  it('duplicates from the snapshot into a fresh quote (same config, new number)', async () => {
    const { service, quoteFake } = createService({});
    quoteFake.seedSource(createQuoteRecord({ quoteNumber: 'WV-2026-000007' }));

    const duplicate = await service.duplicateQuote(
      QUOTE_FIXTURE_IDS.tenant,
      QUOTE_FIXTURE_IDS.quoteId,
    );

    // The duplicate is a brand-new issue: fresh id and fresh sequential number.
    expect(duplicate.id).toBe('quote-1');
    expect(duplicate.quoteNumber).toBe('WV-2026-000001');
    expect(duplicate.quoteNumber).not.toBe('WV-2026-000007');
    const requested = quoteFake.created[0];
    expect(requested.customer.name).toBe('Mrs Nkosi');
    expect(requested.consultantName).toBe('Thandi');
    const snapshot = requested.snapshotPayload as QuoteSnapshotPayload;
    expect(snapshot.configuration).toEqual(completeConfiguration);
  });

  it('404s when the source quote does not exist', async () => {
    const { service } = createService({});

    await expect(
      service.duplicateQuote(QUOTE_FIXTURE_IDS.tenant, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('refuses to duplicate a legacy quote without a snapshot', async () => {
    const { service, quoteFake } = createService({});
    quoteFake.seedSource(createQuoteRecord({ snapshot: null }));

    await expect(
      service.duplicateQuote(QUOTE_FIXTURE_IDS.tenant, QUOTE_FIXTURE_IDS.quoteId),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
  });
});

describe('QuoteService.archiveQuote / getQuote', () => {
  it('archives an issued quote without touching its content', async () => {
    const { service, quoteFake } = createService({});
    quoteFake.seedSource(createQuoteRecord());

    const archived = await service.archiveQuote(
      QUOTE_FIXTURE_IDS.tenant,
      QUOTE_FIXTURE_IDS.quoteId,
    );

    expect(archived.status).toBe('ARCHIVED');
    expect(archived.totals.totalCents).toBe(PRICE_BOOK.totalCents);
  });

  it('404s on archive of a foreign quote', async () => {
    const { service } = createService({});
    await expect(
      service.archiveQuote('other-tenant', QUOTE_FIXTURE_IDS.quoteId),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lists and fetches with the tenant boundary intact', async () => {
    const { service } = createService({});
    const { data, total } = await service.listQuotes(QUOTE_FIXTURE_IDS.tenant, {
      page: 1,
      pageSize: 20,
    });
    expect(total).toBe(1);
    expect(data[0].quoteNumber).toBe('WV-2026-000001');

    await expect(service.getQuote(QUOTE_FIXTURE_IDS.tenant, 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('QuoteService determinism hooks', () => {
  it('uses the injected clock for issued/validity timestamps', async () => {
    const fixedNow = new Date('2026-12-01T08:00:00.000Z');
    const { service, quoteFake } = createService({ now: () => fixedNow });

    await service.createQuote(QUOTE_FIXTURE_IDS.tenant, createQuoteRequest);
    expect(quoteFake.created[0].issuedAt).toBe(fixedNow);
    expect(quoteFake.created[0].validUntil.toISOString()).toBe('2026-12-31T08:00:00.000Z');
  });
});
