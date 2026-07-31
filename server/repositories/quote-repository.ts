import type { PrismaClient } from '@prisma/client';
import { BaseRepository, type RepositoryTransaction } from '@/server/repositories/base-repository';
import { formatQuoteNumber } from '@/server/quote/quote-number';
import { PRISMA_UNIQUE_VIOLATION, QUOTE_NUMBER_MAX_RETRIES } from '@/server/quote/quote-terms';
import { AppError, isPrismaErrorCode } from '@/server/utils/errors';
import { toSkipTake, type PaginatedResult, type PaginationParams } from '@/server/utils/pagination';
import type { QuoteStatus } from '@/types/quote';

/**
 * Quote persistence. Writes only — all business decisions live in
 * QuoteService. Two invariants are enforced close to the metal:
 *
 * - Quote numbers come from the tenant's monotonically increasing counter,
 *   incremented atomically inside the quote-creation transaction
 *   (`UPDATE Tenant ... quoteSequence = quoteSequence + 1`), and additionally
 *   protected by the `(tenantId, quoteNumber)` unique index.
 * - Quote content is immutable after creation; the only lifecycle write is
 *   `status` (ISSUED → ARCHIVED).
 *
 * Because the counter increment and the insert share one transaction, a
 * unique-violation (P2002 — e.g. legacy rows colliding) rolls the counter
 * back too; creation retries with a fresh sequence up to
 * QUOTE_NUMBER_MAX_RETRIES before surfacing an error. Concurrent creations
 * are serialised by PostgreSQL's row lock on the tenant counter, so numbers
 * are sequential, gap-light and collision-safe by construction.
 */

export interface QuoteLineInsert {
  /** Service pre-generates ids so the snapshot and the rows stay identical. */
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountCents: number;
  readonly totalCents: number;
  readonly sortOrder: number;
  readonly metadata: Record<string, unknown> | null;
}

export interface CreateQuoteRecordInput {
  readonly tenantId: string;
  /** Issue timestamp — the quote number derives from it (and the counter). */
  readonly issuedAt: Date;
  readonly customer: {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
  };
  /**
   * FK anchors for the legacy required relations. The SavedConfiguration is
   * system-managed: it is named `Quote {quoteNumber}` inside the creation
   * transaction so the (tenantId, name) unique constraint is satisfied by
   * construction.
   */
  readonly configuration: {
    readonly vehicleVariantId: string;
    readonly vehicleModelId: string;
    readonly wheelModelId: string;
    readonly tyreModelId: string;
  };
  readonly consultantName: string | null;
  readonly currency: string;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly vatBasisPoints: number;
  readonly vatCents: number;
  readonly totalCents: number;
  readonly validUntil: Date;
  readonly lines: readonly QuoteLineInsert[];
  /**
   * Serialised QuoteSnapshotPayload with a placeholder `quoteNumber` — the
   * repository replaces that field with the number allocated inside the
   * creation transaction so the snapshot always carries the truth.
   */
  readonly snapshotPayload: unknown;
}

export interface QuoteLineRecord {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountCents: number;
  readonly totalCents: number;
  readonly sortOrder: number;
  readonly metadata: unknown;
}

export interface QuoteRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly quoteNumber: string | null;
  readonly status: string;
  readonly consultantName: string | null;
  readonly currency: string;
  readonly totalAmount: unknown;
  readonly subtotalCents: number | null;
  readonly discountCents: number | null;
  readonly vatBasisPoints: number | null;
  readonly vatCents: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly validUntil: Date | null;
  readonly archivedAt: Date | null;
  readonly tenant: { id: string; name: string; slug: string };
  readonly customer: { name: string; email: string | null; phone: string | null };
  readonly lines: QuoteLineRecord[];
  readonly snapshot: { readonly payload: unknown } | null;
}

export interface QuoteRepositoryPort {
  /** Atomically increments the tenant counter inside a creation transaction. */
  createQuote(input: CreateQuoteRecordInput): Promise<QuoteRecord>;
  listByTenant(
    tenantId: string,
    pagination: PaginationParams,
    status: QuoteStatus | undefined,
  ): Promise<PaginatedResult<QuoteRecord>>;
  findById(tenantId: string, id: string): Promise<QuoteRecord | null>;
  archive(tenantId: string, id: string, archivedAt: Date): Promise<QuoteRecord | null>;
}

const quoteInclude = {
  tenant: { select: { id: true, name: true, slug: true } },
  customer: { select: { name: true, email: true, phone: true } },
  lines: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  snapshot: { select: { payload: true } },
} as const;

export class QuoteRepository extends BaseRepository implements QuoteRepositoryPort {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async createQuote(input: CreateQuoteRecordInput): Promise<QuoteRecord> {
    for (let attempt = 1; attempt <= QUOTE_NUMBER_MAX_RETRIES; attempt += 1) {
      try {
        return await this.withTransaction((tx) => this.createQuoteInTransaction(tx, input));
      } catch (error) {
        if (
          isPrismaErrorCode(error, PRISMA_UNIQUE_VIOLATION) &&
          attempt < QUOTE_NUMBER_MAX_RETRIES
        ) {
          continue; // counter rolled back with the transaction — retry with a fresh one
        }
        if (isPrismaErrorCode(error, PRISMA_UNIQUE_VIOLATION)) {
          throw new AppError('Could not allocate a unique quote number', {
            code: 'INTERNAL_ERROR',
            statusCode: 500,
            details: { attempts: attempt },
          });
        }
        throw error;
      }
    }
    // Unreachable: the loop either returns or throws. Kept for the checker.
    throw new AppError('Could not allocate a unique quote number', {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  }

  /**
   * Split out so the service can drive collision retries against the same
   * transaction body with a fresh number each attempt.
   */
  async createQuoteInTransaction(
    tx: RepositoryTransaction,
    input: CreateQuoteRecordInput,
  ): Promise<QuoteRecord> {
    // Atomic sequence allocation — PostgreSQL serialises this UPDATE; the
    // bumped value is the quote's sequence inside the same transaction.
    const tenantCounter = await tx.tenant.update({
      where: { id: input.tenantId },
      data: { quoteSequence: { increment: 1 } },
      select: { quoteSequence: true },
    });
    const quoteNumber = formatQuoteNumber(tenantCounter.quoteSequence, input.issuedAt);

    const customer = input.customer.email
      ? await tx.customer.upsert({
          where: {
            tenantId_email: { tenantId: input.tenantId, email: input.customer.email },
          },
          create: { tenantId: input.tenantId, ...input.customer },
          update: { name: input.customer.name, phone: input.customer.phone },
        })
      : await tx.customer.create({ data: { tenantId: input.tenantId, ...input.customer } });

    const configuration = await tx.savedConfiguration.create({
      data: {
        tenantId: input.tenantId,
        vehicleVariantId: input.configuration.vehicleVariantId,
        vehicleModelId: input.configuration.vehicleModelId,
        wheelModelId: input.configuration.wheelModelId,
        tyreModelId: input.configuration.tyreModelId,
        name: `Quote ${quoteNumber}`,
      },
    });

    const quote = await tx.quote.create({
      data: {
        tenantId: input.tenantId,
        customerId: customer.id,
        savedConfigurationId: configuration.id,
        status: 'ISSUED',
        quoteNumber,
        consultantName: input.consultantName,
        currency: input.currency,
        // Legacy decimal column (required) stays populated in lockstep.
        totalAmount: (input.totalCents / 100).toFixed(2) as unknown as number,
        subtotalCents: input.subtotalCents,
        discountCents: input.discountCents,
        vatBasisPoints: input.vatBasisPoints,
        vatCents: input.vatCents,
        validUntil: input.validUntil,
        lines: { create: [...input.lines] },
        snapshot: {
          create: {
            tenantId: input.tenantId,
            payload: {
              ...(typeof input.snapshotPayload === 'object' && input.snapshotPayload !== null
                ? (input.snapshotPayload as Record<string, unknown>)
                : {}),
              quoteNumber,
            },
          },
        },
      },
      include: quoteInclude,
    });

    return quote as unknown as QuoteRecord;
  }

  async listByTenant(
    tenantId: string,
    pagination: PaginationParams,
    status: QuoteStatus | undefined,
  ): Promise<PaginatedResult<QuoteRecord>> {
    const where = {
      tenantId,
      deletedAt: null,
      ...(status !== undefined ? { status } : {}),
    };
    const [total, data] = await this.withTransaction((tx) =>
      Promise.all([
        tx.quote.count({ where }),
        tx.quote.findMany({
          where,
          include: quoteInclude,
          orderBy: [{ createdAt: 'desc' }],
          ...toSkipTake(pagination),
        }),
      ]),
    );
    return { data: data as unknown as QuoteRecord[], total };
  }

  async findById(tenantId: string, id: string): Promise<QuoteRecord | null> {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: quoteInclude,
    });
    return quote as unknown as QuoteRecord | null;
  }

  async archive(tenantId: string, id: string, archivedAt: Date): Promise<QuoteRecord | null> {
    const existing = await this.prisma.quote.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (existing === null) {
      return null;
    }
    const quote = await this.prisma.quote.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED', archivedAt },
      include: quoteInclude,
    });
    return quote as unknown as QuoteRecord;
  }
}
