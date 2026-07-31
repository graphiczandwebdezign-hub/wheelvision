import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';
import { toSkipTake, type PaginatedResult, type PaginationParams } from '@/server/utils/pagination';

/** Shape of the vehicle variant records this repository returns (with relations). */
export interface VehicleVariantRecord {
  id: string;
  /** FK anchor for SavedConfiguration writes (quote domain). */
  vehicleModelId: string;
  name: string;
  year: number | null;
  wheelDiameterMm: number;
  /** Raw Chapter-6 render package as stored; services validate it. */
  renderMetadata: unknown;
  model: {
    name: string;
    manufacturer: { name: string };
  };
  colours: Array<{ name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

/** Port the service layer depends on; implemented by VehicleRepository. */
export interface VehicleRepositoryPort {
  listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<VehicleVariantRecord>>;
  findById(tenantId: string, id: string): Promise<VehicleVariantRecord | null>;
  exists(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
}

const vehicleInclude = {
  model: { include: { manufacturer: true } },
  colours: true,
} as const;

export class VehicleRepository extends BaseRepository implements VehicleRepositoryPort {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async listByTenant(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<VehicleVariantRecord>> {
    const where = this.buildListWhere(tenantId);

    // Count and page fetched together so concurrent writes cannot skew them.
    const [total, data] = await this.withTransaction((tx) =>
      Promise.all([
        tx.vehicleVariant.count({ where }),
        tx.vehicleVariant.findMany({
          where,
          include: vehicleInclude,
          orderBy: [{ createdAt: 'asc' }],
          ...toSkipTake(pagination),
        }),
      ]),
    );

    return { data, total };
  }

  async findById(tenantId: string, id: string): Promise<VehicleVariantRecord | null> {
    return this.prisma.vehicleVariant.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      include: vehicleInclude,
    });
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    const record = await this.prisma.vehicleVariant.findFirst({
      where: { id, ...this.buildListWhere(tenantId) },
      select: { id: true },
    });
    return record !== null;
  }

  async count(tenantId: string): Promise<number> {
    return this.prisma.vehicleVariant.count({ where: this.buildListWhere(tenantId) });
  }

  /** Single place where vehicle filtering is composed; future filters extend here. */
  private buildListWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }
}
