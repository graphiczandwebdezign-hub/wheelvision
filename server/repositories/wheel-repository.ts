import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';
import { toSkipTake, type PaginatedResult, type PaginationParams } from '@/server/utils/pagination';

/** Shape of the wheel model records this repository returns (with relations). */
export interface WheelModelRecord {
  id: string;
  name: string;
  metadata: unknown;
  brand: { name: string };
  finishes: Array<{ name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WheelSizeRecord {
  id: string;
  size: string;
  diameterInches: number | null;
  widthInches: number | null;
  boltPattern: string | null;
  offsetMm: number | null;
  centreBoreMm: number | null;
}

export interface WheelModelDetailRecord extends WheelModelRecord {
  sizes: WheelSizeRecord[];
}

/** Port the service layer depends on; implemented by WheelRepository. */
export interface WheelRepositoryPort {
  listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<WheelModelRecord>>;
  findById(tenantId: string, id: string): Promise<WheelModelDetailRecord | null>;
  exists(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
}

const wheelInclude = { brand: true, finishes: true } as const;
const wheelDetailInclude = { brand: true, finishes: true, sizes: true } as const;

export class WheelRepository extends BaseRepository implements WheelRepositoryPort {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<WheelModelRecord>> {
    const where = this.buildListWhere(tenantId);

    // Count and page fetched together so concurrent writes cannot skew them.
    const [total, data] = await this.withTransaction((tx) =>
      Promise.all([
        tx.wheelModel.count({ where }),
        tx.wheelModel.findMany({
          where,
          include: wheelInclude,
          orderBy: [{ createdAt: 'asc' }],
          ...toSkipTake(pagination),
        }),
      ]),
    );

    return { data, total };
  }

  async findById(tenantId: string, id: string): Promise<WheelModelDetailRecord | null> {
    return this.prisma.wheelModel.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      include: wheelDetailInclude,
    });
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    const record = await this.prisma.wheelModel.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      select: { id: true },
    });
    return record !== null;
  }

  async count(tenantId: string): Promise<number> {
    return this.prisma.wheelModel.count({ where: this.buildListWhere(tenantId) });
  }

  /** Single place where wheel filtering is composed; future filters extend here. */
  private buildListWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }
}
