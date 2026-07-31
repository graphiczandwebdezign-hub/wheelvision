import type { PrismaClient } from '@prisma/client';
import { BaseRepository, type RepositoryTransaction } from '@/server/repositories/base-repository';
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
 */

export interface QuoteLineInsert {
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
  readonly quoteNumber: string;
  readonly customer: {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
  };
  /** FK anchors for the legacy required relations. */
  readonly configuration: {
    readonly vehicleVariantId: string;
    readonly vehicleModelId: string;
    readonly wheelModelId: string;
    readonly tyreModelId: string;
    readonly name: string;
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
    return this.withTransaction((tx) => this.createQuoteInTransaction(tx, input));
  }

  /**
   * Split out so the service can drive collision retries against the same
   * transaction body with a fresh number each attempt.
   */
  async createQuoteInTransaction(
    tx: RepositoryTransaction,
    input: CreateQuoteRecordInput,
  ): Promise<QuoteRecord> {
    // Atomic sequence allocation — PostgreSQL serialises this UPDATE.
    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { quoteSequence: { increment: 1 } },
      select: { id: true },
    });

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
        name: input.configuration.name,
      },
    });

    const quote = await tx.quote.create({
      data: {
        tenantId: input.tenantId,
        customerId: customer.id,
        savedConfigurationId: configuration.id,
        status: 'ISSUED',
        quoteNumber: input.quoteNumber,
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
          create: { tenantId: input.tenantId, payload: input.snapshotPayload as object },
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
