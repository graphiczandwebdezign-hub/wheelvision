import { Prisma, type PrismaClient } from '@prisma/client';
import { BaseRepository, type RepositoryTransaction } from '@/server/repositories/base-repository';
import { formatQuoteNumber } from '@/server/quote/quote-number';
import { PRISMA_UNIQUE_VIOLATION, QUOTE_NUMBER_MAX_RETRIES } from '@/server/quote/quote-terms';
import { AppError, isPrismaErrorCode } from '@/server/utils/errors';
import { toSkipTake, type PaginatedResult, type PaginationParams } from '@/server/utils/pagination';
import type { QuoteStatus } from '@/types/quote';

export interface QuoteLineInsert {
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
  readonly issuedAt: Date;
  readonly customer: {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
  };
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

export interface QuoteStatusHistoryRecord {
  readonly id: string;
  readonly fromStatus: string | null;
  readonly toStatus: string;
  readonly actorName: string | null;
  readonly createdAt: Date;
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
  readonly statusHistories: QuoteStatusHistoryRecord[];
}

export interface QuoteRepositoryPort {
  createQuote(input: CreateQuoteRecordInput): Promise<QuoteRecord>;
  listByTenant(
    tenantId: string,
    pagination: PaginationParams,
    status: QuoteStatus | undefined,
  ): Promise<PaginatedResult<QuoteRecord>>;
  findById(tenantId: string | null, id: string): Promise<QuoteRecord | null>;
  findByNumber(quoteNumber: string): Promise<QuoteRecord | null>;
  archive(tenantId: string, id: string, archivedAt: Date): Promise<QuoteRecord | null>;
  updateStatus(
    tenantId: string | null,
    idOrQuoteNumber: string,
    newStatus: string,
    actorName?: string,
  ): Promise<QuoteRecord | null>;
}

const quoteInclude = {
  tenant: { select: { id: true, name: true, slug: true } },
  customer: { select: { name: true, email: true, phone: true } },
  lines: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  snapshot: { select: { payload: true } },
  statusHistories: { orderBy: [{ createdAt: 'asc' }] },
} satisfies Prisma.QuoteInclude;

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
          continue;
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
    throw new AppError('Could not allocate a unique quote number', {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  }

  async createQuoteInTransaction(
    tx: RepositoryTransaction,
    input: CreateQuoteRecordInput,
  ): Promise<QuoteRecord> {
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
        totalAmount: (input.totalCents / 100).toFixed(2) as unknown as number,
        subtotalCents: input.subtotalCents,
        discountCents: input.discountCents,
        vatBasisPoints: input.vatBasisPoints,
        vatCents: input.vatCents,
        validUntil: input.validUntil,
        lines: {
          create: input.lines.map((line) => ({
            ...line,
            metadata:
              line.metadata === null
                ? Prisma.DbNull
                : (line.metadata as Prisma.InputJsonValue),
          })),
        },
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
        statusHistories: {
          create: {
            tenantId: input.tenantId,
            fromStatus: null,
            toStatus: 'ISSUED',
            actorName: input.consultantName,
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

  async findById(tenantId: string | null, id: string): Promise<QuoteRecord | null> {
    const where = tenantId ? { id, tenantId, deletedAt: null } : { id, deletedAt: null };
    const quote = await this.prisma.quote.findFirst({
      where,
      include: quoteInclude,
    });
    return quote as unknown as QuoteRecord | null;
  }

  async findByNumber(quoteNumber: string): Promise<QuoteRecord | null> {
    const quote = await this.prisma.quote.findFirst({
      where: { quoteNumber, deletedAt: null },
      include: quoteInclude,
    });
    return quote as unknown as QuoteRecord | null;
  }

  async archive(tenantId: string, id: string, archivedAt: Date): Promise<QuoteRecord | null> {
    const existing = await this.prisma.quote.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (existing === null) {
      return null;
    }
    const updated = await this.withTransaction(async (tx) => {
      await tx.quoteStatusHistory.create({
        data: {
          tenantId,
          quoteId: id,
          fromStatus: existing.status,
          toStatus: 'ARCHIVED',
          actorName: 'System',
        },
      });
      return tx.quote.update({
        where: { id },
        data: { status: 'ARCHIVED', archivedAt },
        include: quoteInclude,
      });
    });
    return updated as unknown as QuoteRecord;
  }

  async updateStatus(
    tenantId: string | null,
    idOrQuoteNumber: string,
    newStatus: string,
    actorName?: string,
  ): Promise<QuoteRecord | null> {
    const isUuid = idOrQuoteNumber.includes('-');
    const whereClause = isUuid
      ? tenantId
        ? { id: idOrQuoteNumber, tenantId, deletedAt: null }
        : { id: idOrQuoteNumber, deletedAt: null }
      : tenantId
        ? { quoteNumber: idOrQuoteNumber, tenantId, deletedAt: null }
        : { quoteNumber: idOrQuoteNumber, deletedAt: null };

    const existing = await this.prisma.quote.findFirst({
      where: whereClause,
      select: { id: true, tenantId: true, status: true },
    });

    if (existing === null) {
      return null;
    }

    if (existing.status === newStatus) {
      return this.findById(existing.tenantId, existing.id);
    }

    const updated = await this.withTransaction(async (tx) => {
      await tx.quoteStatusHistory.create({
        data: {
          tenantId: existing.tenantId,
          quoteId: existing.id,
          fromStatus: existing.status,
          toStatus: newStatus,
          actorName: actorName ?? null,
        },
      });

      return tx.quote.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          ...(newStatus === 'ARCHIVED' ? { archivedAt: new Date() } : {}),
        },
        include: quoteInclude,
      });
    });

    return updated as unknown as QuoteRecord;
  }
}
