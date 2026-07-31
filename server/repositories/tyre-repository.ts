import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';
import { toSkipTake, type PaginatedResult, type PaginationParams } from '@/server/utils/pagination';

/** Shape of the tyre model records this repository returns (with relations). */
export interface TyreModelRecord {
  id: string;
  name: string;
  metadata: unknown;
  brand: { name: string };
  profiles: Array<{ profile: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TyreProfileRecord {
  id: string;
  profile: string;
  widthMm: number | null;
  aspectRatio: number | null;
  rimDiameterInches: number | null;
  construction: string | null;
  loadIndex: number | null;
  speedRating: string | null;
}

export interface TyreModelDetailRecord extends Omit<TyreModelRecord, 'profiles'> {
  profiles: TyreProfileRecord[];
}

/** Port the service layer depends on; implemented by TyreRepository. */
export interface TyreRepositoryPort {
  listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<TyreModelRecord>>;
  findById(tenantId: string, id: string): Promise<TyreModelDetailRecord | null>;
  exists(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
}

const tyreInclude = {
  brand: true,
  profiles: { select: { profile: true }, orderBy: { profile: 'asc' } },
} as const;
const tyreDetailInclude = { brand: true, profiles: { orderBy: { profile: 'asc' } } } as const;

export class TyreRepository extends BaseRepository implements TyreRepositoryPort {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<TyreModelRecord>> {
    const where = this.buildListWhere(tenantId);

    // Count and page fetched together so concurrent writes cannot skew them.
    const [total, data] = await this.withTransaction((tx) =>
      Promise.all([
        tx.tyreModel.count({ where }),
        tx.tyreModel.findMany({
          where,
          include: tyreInclude,
          orderBy: [{ createdAt: 'asc' }],
          ...toSkipTake(pagination),
        }),
      ]),
    );

    return { data, total };
  }

  async findById(tenantId: string, id: string): Promise<TyreModelDetailRecord | null> {
    return this.prisma.tyreModel.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      include: tyreDetailInclude,
    });
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    const record = await this.prisma.tyreModel.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      select: { id: true },
    });
    return record !== null;
  }

  async count(tenantId: string): Promise<number> {
    return this.prisma.tyreModel.count({ where: this.buildListWhere(tenantId) });
  }

  /** Single place where tyre filtering is composed; future filters extend here. */
  private buildListWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }
}
