import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  completeConfiguration,
  createQuoteRequest,
  PRICE_BOOK,
} from '@/tests/helpers/quote-fixtures';

/**
 * API slice tests for /api/quotes*: every handler runs through the REAL
 * composition (tenant resolver, catalog + pricing + quote services, quote
 * repository) against a recording Prisma fake. This is the closest the unit
 * tier gets to end-to-end: envelopes, status codes, validation mapping and
 * tenant scoping are all verified here.
 */

const harness = vi.hoisted(() => ({
  state: {
    sequence: 0,
    persisted: [] as Array<Record<string, unknown>>,
  },
}));

function quoteUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

vi.mock('@/server/utils/prisma', async () => {
  const { hiluxDetail, ps4Detail, te37Detail } = await import('@/tests/helpers/catalog-fixtures');
  const { PRICE_BOOK, QUOTE_FIXTURE_IDS } = await import('@/tests/helpers/quote-fixtures');

  const vehicleRecord = {
    id: hiluxDetail.id,
    vehicleModelId: 'vehicle-model-1',
    name: hiluxDetail.variant,
    year: hiluxDetail.year,
    wheelDiameterMm: hiluxDetail.wheelDiameterMm,
    renderMetadata: hiluxDetail.renderMetadata,
    model: { name: hiluxDetail.model, manufacturer: { name: hiluxDetail.manufacturer } },
    colours: hiluxDetail.colours.map((name) => ({ name })),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  const wheelRecord = {
    id: te37Detail.id,
    name: te37Detail.model,
    metadata: null,
    brand: { name: te37Detail.brand },
    finishes: te37Detail.finishes.map((name) => ({ name })),
    sizes: te37Detail.sizes.map((size) => ({ ...size })),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  const tyreRecord = {
    id: ps4Detail.id,
    name: ps4Detail.pattern,
    metadata: null,
    brand: { name: ps4Detail.brand },
    profiles: ps4Detail.profiles.map((profile) => ({ ...profile })),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  const issuedAt = new Date('2026-07-31T10:00:00.000Z');

  function quoteRow(data: Record<string, unknown>) {
    const quoteNumber = data.quoteNumber as string;
    // tenant.update bumps the counter BEFORE quote.create runs, so the
    // sequence at this point already belongs to this quote.
    return {
      id: quoteUuid(harness.state.sequence),
      tenantId: QUOTE_FIXTURE_IDS.tenant,
      quoteNumber,
      status: 'ISSUED',
      consultantName: data.consultantName ?? 'Thandi',
      currency: data.currency ?? 'ZAR',
      totalAmount: ((data.totalCents as number) / 100).toFixed(2),
      subtotalCents: data.subtotalCents ?? null,
      discountCents: data.discountCents ?? null,
      vatBasisPoints: data.vatBasisPoints ?? null,
      vatCents: data.vatCents ?? null,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      validUntil: data.validUntil ?? new Date('2026-08-30T10:00:00.000Z'),
      archivedAt: null,
      tenant: { id: QUOTE_FIXTURE_IDS.tenant, name: 'Demo Tenant', slug: 'demo-tenant' },
      customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
      lines: ((data.lines as { create: unknown[] } | undefined)?.create ?? []).map((line) => ({
        createdAt: issuedAt,
        ...(line as Record<string, unknown>),
      })),
      snapshot: {
        payload:
          (data.snapshot as { create: { payload: unknown } } | undefined)?.create.payload ?? null,
      },
    };
  }

  function filterByStatus(
    rows: Array<Record<string, unknown>>,
    args?: { where?: { status?: string } },
  ) {
    const status = args?.where?.status;
    return status === undefined ? rows : rows.filter((row) => row.status === status);
  }

  const prismaFake = {
    tenant: {
      findUnique: vi.fn(async (args: { where: Record<string, unknown>; select?: unknown }) => {
        if ('slug' in args.where) {
          return args.where.slug === 'demo-tenant' ? { id: QUOTE_FIXTURE_IDS.tenant } : null;
        }
        return { id: QUOTE_FIXTURE_IDS.tenant, name: 'Demo Tenant', slug: 'demo-tenant' };
      }),
      update: vi.fn(async () => {
        harness.state.sequence += 1;
        return { quoteSequence: harness.state.sequence };
      }),
    },
    vehicleVariant: {
      findFirst: vi.fn(async (args: { where: { id?: string } }) =>
        args.where.id === hiluxDetail.id ? vehicleRecord : null,
      ),
    },
    wheelModel: {
      findFirst: vi.fn(async (args: { where: { id?: string } }) =>
        args.where.id === te37Detail.id ? wheelRecord : null,
      ),
    },
    tyreModel: {
      findFirst: vi.fn(async (args: { where: { id?: string } }) =>
        args.where.id === ps4Detail.id ? tyreRecord : null,
      ),
    },
    priceList: {
      findFirst: vi.fn(async () => ({
        id: QUOTE_FIXTURE_IDS.priceList,
        name: 'Retail Price List',
        kind: 'RETAIL',
        currency: 'ZAR',
      })),
    },
    wheelPrice: {
      findMany: vi.fn(async () => [
        { wheelSizeId: 'sz-18x8', amountCents: PRICE_BOOK.wheelUnitCents },
      ]),
    },
    tyrePrice: {
      findMany: vi.fn(async () => [
        { tyreProfileId: 'pf-265-65-17', amountCents: PRICE_BOOK.tyreUnitCents },
      ]),
    },
    labourPrice: {
      findMany: vi.fn(async () => [
        { serviceType: 'FITMENT', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.fitmentCents },
        { serviceType: 'BALANCING', unit: 'PER_WHEEL', amountCents: PRICE_BOOK.balancingCents },
        { serviceType: 'ALIGNMENT', unit: 'PER_VEHICLE', amountCents: PRICE_BOOK.alignmentCents },
      ]),
    },
    priceRule: { findMany: vi.fn(async () => []) },
    discountRule: { findMany: vi.fn(async () => []) },
    customer: {
      upsert: vi.fn(async () => ({ id: QUOTE_FIXTURE_IDS.customerId })),
      create: vi.fn(async () => ({ id: QUOTE_FIXTURE_IDS.customerId })),
    },
    savedConfiguration: {
      create: vi.fn(async () => ({ id: QUOTE_FIXTURE_IDS.savedConfigurationId })),
    },
    quote: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = quoteRow(args.data);
        harness.state.persisted.push(row);
        return row;
      }),
      count: vi.fn(
        async (args?: { where?: { status?: string } }) =>
          filterByStatus(harness.state.persisted, args).length,
      ),
      findMany: vi.fn(async (args?: { where?: { status?: string } }) =>
        [...filterByStatus(harness.state.persisted, args)].reverse(),
      ),
      findFirst: vi.fn(async (args: { where: { id?: string } }) => {
        const found = harness.state.persisted.find((row) => row.id === args.where.id);
        return found ?? null;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const index = harness.state.persisted.findIndex((row) => row.id === args.where.id);
        const archived = { ...harness.state.persisted[index], ...args.data };
        harness.state.persisted[index] = archived;
        return archived;
      }),
    },
    $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) =>
      operation(prismaFake),
    ),
  };

  return { prisma: prismaFake };
});

import { GET as listQuotes, POST as createQuote } from '@/server/controllers/quote-controller';
import { GET as getQuote } from '@/server/controllers/quote-detail-controller';
import { POST as duplicateQuoteHandler } from '@/server/controllers/quote-duplicate-controller';
import { POST as archiveQuoteHandler } from '@/server/controllers/quote-archive-controller';

function requestFor(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(`http://localhost${url}`, init);
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  harness.state.sequence = 0;
  harness.state.persisted.length = 0;
  vi.clearAllMocks();
});

describe('POST /api/quotes', () => {
  it('issues a 201 quotation envelope from a completed configuration', async () => {
    const response = await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createQuoteRequest),
      }),
    );

    expect(response.status).toBe(201);
    const body = await readJson(response);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.quoteNumber).toBe('WV-2026-000001');
    expect(data.status).toBe('ISSUED');
    const totals = data.totals as Record<string, unknown>;
    expect(totals).toMatchObject({
      subtotalCents: PRICE_BOOK.subtotalCents,
      vatCents: PRICE_BOOK.vatCents,
      totalCents: PRICE_BOOK.totalCents,
      currency: 'ZAR',
    });
    const snapshot = data.snapshot as Record<string, unknown>;
    expect(snapshot.quoteNumber).toBe('WV-2026-000001');
    expect((snapshot.configuration as Record<string, unknown>).wheelSizeId).toBe('sz-18x8');
  });

  it('maps schema failures to a 400 validation envelope', async () => {
    const response = await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ configuration: { vehicleId: 42 }, customer: { name: '' } }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await readJson(response);
    expect(body.success).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR');
    expect(harness.state.persisted).toHaveLength(0);
  });

  it('maps an incomplete configuration to a 400 business error naming the gaps', async () => {
    const response = await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...createQuoteRequest,
          configuration: { ...completeConfiguration, tyreId: null, tyreProfileId: null },
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await readJson(response);
    const error = body.error as { code: string; details: { missingFields: string[] } };
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.missingFields).toEqual(['tyre', 'tyre profile']);
  });

  it('404s when a selected entity is not in the tenant catalog', async () => {
    const response = await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...createQuoteRequest,
          configuration: { ...completeConfiguration, wheelId: 'wh-foreign' },
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(harness.state.persisted).toHaveLength(0);
  });
});

describe('GET /api/quotes', () => {
  it('returns the paginated history envelope newest-first', async () => {
    for (let index = 0; index < 2; index += 1) {
      await createQuote(
        requestFor('/api/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(createQuoteRequest),
        }),
      );
    }

    const response = await listQuotes(requestFor('/api/quotes?page=1&pageSize=10'));
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.success).toBe(true);
    const data = body.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(2);
    expect(data[0].quoteNumber).toBe('WV-2026-000002'); // newest first
    expect(data[1].quoteNumber).toBe('WV-2026-000001');
    expect(body.meta).toMatchObject({ page: 1, pageSize: 10, total: 2 });
  });

  it('applies the status filter to the listing', async () => {
    await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createQuoteRequest),
      }),
    );

    const archivedOnly = await listQuotes(requestFor('/api/quotes?status=ARCHIVED'));
    expect((await readJson(archivedOnly)).data).toHaveLength(0);

    const issuedOnly = await listQuotes(requestFor('/api/quotes?status=ISSUED'));
    expect((await readJson(issuedOnly)).data).toHaveLength(1);
  });
});

describe('GET /api/quotes/:id', () => {
  it('returns the full quote detail with lines and snapshot', async () => {
    await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createQuoteRequest),
      }),
    );

    const response = await getQuote(requestFor(`/api/quotes/${quoteUuid(1)}`), {
      params: Promise.resolve({ id: quoteUuid(1) }),
    });
    expect(response.status).toBe(200);
    const data = (await readJson(response)).data as Record<string, unknown>;
    expect(data.quoteNumber).toBe('WV-2026-000001');
    expect(data.lines).toHaveLength(5);
  });

  it('404s for unknown ids and rejects malformed ids with 400', async () => {
    const missing = await getQuote(requestFor(`/api/quotes/${quoteUuid(99)}`), {
      params: Promise.resolve({ id: quoteUuid(99) }),
    });
    expect(missing.status).toBe(404);

    const malformed = await getQuote(requestFor('/api/quotes/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    });
    expect(malformed.status).toBe(400);
  });
});

describe('POST /api/quotes/:id/duplicate', () => {
  it('re-issues the snapshot under a fresh sequential number (201)', async () => {
    await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createQuoteRequest),
      }),
    );

    const response = await duplicateQuoteHandler(
      requestFor(`/api/quotes/${quoteUuid(1)}/duplicate`, { method: 'POST' }),
      { params: Promise.resolve({ id: quoteUuid(1) }) },
    );

    expect(response.status).toBe(201);
    const data = (await readJson(response)).data as Record<string, unknown>;
    expect(data.quoteNumber).toBe('WV-2026-000002');
    expect(data.customerName).toBe('Mrs Nkosi');
  });

  it('404s when the source quote does not exist', async () => {
    const response = await duplicateQuoteHandler(
      requestFor(`/api/quotes/${quoteUuid(99)}/duplicate`, { method: 'POST' }),
      { params: Promise.resolve({ id: quoteUuid(99) }) },
    );
    expect(response.status).toBe(404);
  });
});

describe('POST /api/quotes/:id/archive', () => {
  it('transitions ISSUED → ARCHIVED without altering totals', async () => {
    await createQuote(
      requestFor('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(createQuoteRequest),
      }),
    );

    const response = await archiveQuoteHandler(
      requestFor(`/api/quotes/${quoteUuid(1)}/archive`, { method: 'POST' }),
      { params: Promise.resolve({ id: quoteUuid(1) }) },
    );

    expect(response.status).toBe(200);
    const data = (await readJson(response)).data as Record<string, unknown>;
    expect(data.status).toBe('ARCHIVED');
    expect((data.totals as Record<string, unknown>).totalCents).toBe(PRICE_BOOK.totalCents);
    expect(data.archivedAt).not.toBeNull();

    const archivedOnly = await listQuotes(requestFor('/api/quotes?status=ARCHIVED'));
    expect((await readJson(archivedOnly)).data).toHaveLength(1);
  });

  it('404s when archiving a foreign or missing quote', async () => {
    const response = await archiveQuoteHandler(
      requestFor(`/api/quotes/${quoteUuid(99)}/archive`, { method: 'POST' }),
      { params: Promise.resolve({ id: quoteUuid(99) }) },
    );
    expect(response.status).toBe(404);
  });
});
