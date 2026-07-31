import { BaseService } from '@/server/services/base-service';
import type {
  TyreModelDetailRecord,
  TyreRepositoryPort,
} from '@/server/repositories/tyre-repository';
import type { PaginatedResult, PaginationParams } from '@/server/utils/pagination';
import type { TyreDetail, TyreSummary } from '@/types/catalog';
import { AppError } from '@/server/utils/errors';

export class TyreService extends BaseService<TyreRepositoryPort> {
  constructor(repository: TyreRepositoryPort) {
    super(repository);
  }

  async listTyres(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<TyreSummary>> {
    const { data, total } = await this.repository.listByTenant(tenantId, pagination);
    return { total, data: data.map((record) => this.toSummary(record)) };
  }

  async getTyre(tenantId: string, id: string): Promise<TyreDetail> {
    const record = await this.repository.findById(tenantId, id);

    if (!record) {
      throw AppError.notFound('Tyre not found', { tyreId: id });
    }

    return this.toDetail(record);
  }

  private toSummary(record: {
    id: string;
    name: string;
    brand: { name: string };
    profiles: Array<{ profile: string }>;
    createdAt: Date;
    updatedAt: Date;
  }): TyreSummary {
    return {
      id: record.id,
      brand: record.brand.name,
      pattern: record.name,
      profiles: record.profiles.map((profile) => profile.profile),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toDetail(record: TyreModelDetailRecord): TyreDetail {
    return {
      ...this.toSummary(record),
      profiles: record.profiles.map((profile) => ({
        id: profile.id,
        profile: profile.profile,
        widthMm: profile.widthMm,
        aspectRatio: profile.aspectRatio,
        rimDiameterInches: profile.rimDiameterInches,
        construction: profile.construction,
        loadIndex: profile.loadIndex,
        speedRating: profile.speedRating,
      })),
      metadata:
        typeof record.metadata === 'object' &&
        record.metadata !== null &&
        !Array.isArray(record.metadata)
          ? (record.metadata as Record<string, unknown>)
          : null,
    };
  }
}
