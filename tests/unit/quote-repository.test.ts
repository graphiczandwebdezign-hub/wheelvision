import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { QuoteRepository } from '@/server/repositories/quote-repository';
import { PRISMA_UNIQUE_VIOLATION } from '@/server/quote/quote-terms';
import { QUOTE_FIXTURE_IDS, createRecordInput } from '@/tests/helpers/quote-fixtures';

/**
 * Quote repository composition tests — no database: a recording Prisma fake
 * verifies the write shape (atomic counter bump in the same transaction,
 * tenant-scoped unique anchors, nested lines + snapshot with the allocated
 * number injected) and the concurrency story (P2002 → fresh transaction,
 * success; exhaustion → honest error).
 */

const ISSUED = new Date('2026-07-31T10:00:00.000Z');

function makeQuoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: QUOTE_FIXTURE_IDS.quoteId,
    tenantId: QUOTE_FIXTURE_IDS.tenant,
    quoteNumber: 'WV-2026-000001',
    status: 'ISSUED',
    consultantName: 'Thandi',
    currency: 'ZAR',
    totalAmount: '7193.25',
    subtotalCents: 625500,
    discountCents: 0,
    vatBasisPoints: 1500,
    vatCents: 93825,
    createdAt: ISSUED,
    updatedAt: ISSUED,
    validUntil: new Date('2026-08-30T10:00:00.000Z'),
    archivedAt: null,
    tenant: { id: QUOTE_FIXTURE_IDS.tenant, name: 'Demo Tenant', slug: 'demo-tenant' },
    customer: { name: 'Mrs Nkosi', email: 'nkosi@example.co.za', phone: '+27 82 555 0100' },
    lines: [],
    snapshot: { payload: { version: 1, quoteNumber: 'WV-2026-000001' } },
    ...overrides,
  };
}

function createPrismaFake(options: { quoteCreateFailures?: Error[] } = {}) {
  const calls: Array<{ delegate: string; method: string; args: Record<string, unknown> }> = [];
  let quoteSequence = 0;
  const failures = [...(options.quoteCreateFailures ?? [])];

  const record = (delegate: string, method: string) => (args: Record<string, unknown>) =>
    calls.push({ delegate, method, args });

  const tx = {
    tenant: {
      update: vi.fn(async (args: { select?: Record<string, unknown> }) => {
        record('tenant', 'update')(args as Record<string, unknown>);
        quoteSequence += 1;
        return args.select?.quoteSequence ? { quoteSequence } : { id: 'tenant' };
      }),
    },
    customer: {
      upsert: vi.fn(async (args: Record<string, unknown>) => {
        record('customer', 'upsert')(args);
        return { id: QUOTE_FIXTURE_IDS.customerId };
      }),
      create: vi.fn(async (args: Record<string, unknown>) => {
        record('customer', 'create')(args);
        return { id: QUOTE_FIXTURE_IDS.customerId };
      }),
    },
    savedConfiguration: {
      create: vi.fn(async (args: Record<string, unknown>) => {
        record('savedConfiguration', 'create')(args);
        return { id: QUOTE_FIXTURE_IDS.savedConfigurationId };
      }),
    },
    quoteStatusHistory: {
      create: vi.fn(async (args: Record<string, unknown>) => {
        record('quoteStatusHistory', 'create')(args);
        return { id: 'hist-1' };
      }),
    },
    quote: {
      create: vi.fn(async (args: Record<string, unknown>) => {
        record('quote', 'create')(args);
        const failure = failures.shift();
        if (failure) {
          throw failure;
        }
        return makeQuoteRow({ quoteNumber: (args.data as Record<string, unknown>).quoteNumber });
      }),
      count: vi.fn(async (args: Record<string, unknown>) => {
        record('quote', 'count')(args);
        return 7;
      }),
      findMany: vi.fn(async (args: Record<string, unknown>) => {
        record('quote', 'findMany')(args);
        return [makeQuoteRow()];
      }),
      findFirst: vi.fn(
        async (args: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
          record('quote', 'findFirst')(args);
          return makeQuoteRow();
        },
      ),
      update: vi.fn(async (args: Record<string, unknown>) => {
        record('quote', 'update')(args);
        return makeQuoteRow({ status: 'ARCHIVED' });
      }),
    },
  };

  const prisma = {
    ...tx,
    $transaction: vi.fn(async (operation: (txArg: typeof tx) => Promise<unknown>) => operation(tx)),
  } as unknown as PrismaClient;

  return { prisma, calls, tx, getSequence: () => quoteSequence };
}

const p2002 = () =>
  Object.assign(new Error('Unique constraint failed'), { code: PRISMA_UNIQUE_VIOLATION });

describe('QuoteRepository.createQuote', () => {
  it('allocates the quote number from the tenant counter inside the transaction', async () => {
    const { prisma, calls, getSequence } = createPrismaFake();
    const repository = new QuoteRepository(prisma);

    const record = await repository.createQuote(createRecordInput());

    expect(getSequence()).toBe(1);
    const quoteCreate = calls.find((call) => call.delegate === 'quote' && call.method === 'create');
    expect((quoteCreate?.args.data as Record<string, unknown>).quoteNumber).toBe('WV-2026-000001');
    expect(record.quoteNumber).toBe('WV-2026-000001');
  });

  it('names the saved configuration after the allocated number (unique by construction)', async () => {
    const { prisma, calls } = createPrismaFake();
    await new QuoteRepository(prisma).createQuote(createRecordInput());

    const configCreate = calls.find(
      (call) => call.delegate === 'savedConfiguration' && call.method === 'create',
    );
    expect((configCreate?.args.data as Record<string, unknown>).name).toBe('Quote WV-2026-000001');
    expect((configCreate?.args.data as Record<string, unknown>).wheelModelId).toBe('wh-te37');
  });

  it('injects the allocated number into the snapshot payload before persisting', async () => {
    const { prisma, calls } = createPrismaFake();
    await new QuoteRepository(prisma).createQuote(createRecordInput());

    const quoteCreate = calls.find((call) => call.delegate === 'quote' && call.method === 'create');
    const data = quoteCreate?.args.data as Record<string, unknown>;
    const snapshot = (data.snapshot as Record<string, unknown>).create as Record<string, unknown>;
    expect((snapshot.payload as Record<string, unknown>).quoteNumber).toBe('WV-2026-000001');
    expect((snapshot.payload as Record<string, unknown>).version).toBe(1);
  });

  it('upserts the customer by email when one is provided', async () => {
    const { prisma, calls, tx } = createPrismaFake();
    await new QuoteRepository(prisma).createQuote(createRecordInput());

    expect(tx.customer.upsert).toHaveBeenCalledTimes(1);
    expect(tx.customer.create).not.toHaveBeenCalled();
    const upsert = calls.find((call) => call.delegate === 'customer');
    expect(upsert?.args.where).toEqual({
      tenantId_email: { tenantId: QUOTE_FIXTURE_IDS.tenant, email: 'nkosi@example.co.za' },
    });
  });

  it('creates a fresh customer when no email is captured', async () => {
    const { prisma, tx } = createPrismaFake();
    const repository = new QuoteRepository(prisma);
    await repository.createQuote(
      createRecordInput({ customer: { name: 'Walk-in customer', email: null, phone: null } }),
    );

    expect(tx.customer.create).toHaveBeenCalledTimes(1);
    expect(tx.customer.upsert).not.toHaveBeenCalled();
  });

  it('mirrors cents into the legacy decimal column in lockstep', async () => {
    const { prisma, calls } = createPrismaFake();
    await new QuoteRepository(prisma).createQuote(createRecordInput());

    const quoteCreate = calls.find((call) => call.delegate === 'quote' && call.method === 'create');
    expect((quoteCreate?.args.data as Record<string, unknown>).totalAmount).toBe('7193.25');
  });

  it('retries with a fresh sequence on a unique-violation (collision-safe)', async () => {
    const { prisma, calls, getSequence } = createPrismaFake({ quoteCreateFailures: [p2002()] });
    const repository = new QuoteRepository(prisma);

    const record = await repository.createQuote(createRecordInput());

    expect(getSequence()).toBe(2); // first attempt rolled back, second succeeded
    expect(record.quoteNumber).toBe('WV-2026-000002');
    expect(calls.filter((c) => c.delegate === 'quote' && c.method === 'create')).toHaveLength(2);
  });

  it('gives up honestly after the retry budget is exhausted', async () => {
    const { prisma } = createPrismaFake({
      quoteCreateFailures: [p2002(), p2002(), p2002()],
    });
    const repository = new QuoteRepository(prisma);

    await expect(repository.createQuote(createRecordInput())).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Could not allocate a unique quote number',
    });
  });

  it('rethrows non-collision failures immediately', async () => {
    const { prisma, getSequence } = createPrismaFake({
      quoteCreateFailures: [new Error('connection dropped')],
    });
    const repository = new QuoteRepository(prisma);

    await expect(repository.createQuote(createRecordInput())).rejects.toThrow('connection dropped');
    expect(getSequence()).toBe(1);
  });

  it('keeps numbers sequential under concurrent creations (serialised counter)', async () => {
    const { prisma } = createPrismaFake();
    const repository = new QuoteRepository(prisma);

    // Fifty concurrent creations — the row-locked counter can never repeat.
    const records = await Promise.all(
      Array.from({ length: 50 }, () => repository.createQuote(createRecordInput())),
    );
    const numbers = records.map((record) => record.quoteNumber);
    expect(new Set(numbers).size).toBe(50);
    expect(numbers[0]).toBe('WV-2026-000001');
    expect(numbers[49]).toBe('WV-2026-000050');
  });
});

describe('QuoteRepository reads', () => {
  it('lists tenant quotes newest-first with status filtering and pagination', async () => {
    const { prisma, calls } = createPrismaFake();
    const repository = new QuoteRepository(prisma);

    const result = await repository.listByTenant('tenant-9', { page: 2, pageSize: 5 }, 'ISSUED');

    const count = calls.find((c) => c.method === 'count');
    const findMany = calls.find((c) => c.method === 'findMany');
    expect(count?.args.where).toEqual({ tenantId: 'tenant-9', deletedAt: null, status: 'ISSUED' });
    expect(findMany?.args).toEqual(expect.objectContaining({ skip: 5, take: 5 }));
    expect(result.total).toBe(7);
    expect(result.data).toHaveLength(1);
  });

  it('omits the status filter when none is requested', async () => {
    const { prisma, calls } = createPrismaFake();
    await new QuoteRepository(prisma).listByTenant(
      'tenant-9',
      { page: 1, pageSize: 20 },
      undefined,
    );

    expect(calls.find((c) => c.method === 'count')?.args.where).toEqual({
      tenantId: 'tenant-9',
      deletedAt: null,
    });
  });

  it('finds by id strictly inside the tenant boundary', async () => {
    const { prisma, calls } = createPrismaFake();
    const repository = new QuoteRepository(prisma);

    const found = await repository.findById('tenant-9', QUOTE_FIXTURE_IDS.quoteId);
    expect(calls.find((c) => c.method === 'findFirst')?.args.where).toEqual({
      id: QUOTE_FIXTURE_IDS.quoteId,
      tenantId: 'tenant-9',
      deletedAt: null,
    });
    expect(found?.id).toBe(QUOTE_FIXTURE_IDS.quoteId);
  });

  it('archives only when the quote exists in the tenant (status + timestamp)', async () => {
    const { prisma, calls, tx } = createPrismaFake();
    tx.quote.findFirst.mockResolvedValueOnce({ id: QUOTE_FIXTURE_IDS.quoteId });
    const repository = new QuoteRepository(prisma);
    const at = new Date('2026-08-01T09:00:00.000Z');

    const archived = await repository.archive('tenant-9', QUOTE_FIXTURE_IDS.quoteId, at);

    expect(archived?.status).toBe('ARCHIVED');
    const update = calls.find((c) => c.method === 'update');
    expect(update?.args.data).toEqual({ status: 'ARCHIVED', archivedAt: at });
  });

  it('returns null instead of throwing when archiving a foreign/missing quote', async () => {
    const { prisma, tx } = createPrismaFake();
    tx.quote.findFirst.mockResolvedValueOnce(null);
    const repository = new QuoteRepository(prisma);

    await expect(repository.archive('tenant-9', 'missing', new Date())).resolves.toBeNull();
    expect(tx.quote.update).not.toHaveBeenCalled();
  });
});
