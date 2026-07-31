import { BaseService } from '@/server/services/base-service';
import type {
  WheelModelDetailRecord,
  WheelRepositoryPort,
} from '@/server/repositories/wheel-repository';
import type { PaginatedResult, PaginationParams } from '@/server/utils/pagination';
import type { WheelDetail, WheelSummary } from '@/types/catalog';
import { AppError } from '@/server/utils/errors';

export class WheelService extends BaseService<WheelRepositoryPort> {
  constructor(repository: WheelRepositoryPort) {
    super(repository);
  }

  async listWheels(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<WheelSummary>> {
    const { data, total } = await this.repository.listByTenant(tenantId, pagination);
    return { total, data: data.map((record) => this.toSummary(record)) };
  }

  async getWheel(tenantId: string, id: string): Promise<WheelDetail> {
    const record = await this.repository.findById(tenantId, id);

    if (!record) {
      throw AppError.notFound('Wheel not found', { wheelId: id });
    }

    return this.toDetail(record);
  }

  private toSummary(record: {
    id: string;
    name: string;
    brand: { name: string };
    finishes: Array<{ name: string }>;
    createdAt: Date;
    updatedAt: Date;
  }): WheelSummary {
    return {
      id: record.id,
      brand: record.brand.name,
      model: record.name,
      finishes: record.finishes.map((finish) => finish.name),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toDetail(record: WheelModelDetailRecord): WheelDetail {
    const sizes = record.sizes.map((size) => ({
      id: size.id,
      size: size.size,
      diameterInches: size.diameterInches,
      widthInches: size.widthInches,
      boltPattern: size.boltPattern,
      offsetMm: size.offsetMm,
      centreBoreMm: size.centreBoreMm,
    }));

    return {
      ...this.toSummary(record),
      sizes,
      boltPatterns: distinctPresent(sizes.map((size) => size.boltPattern)),
      offsetsMm: distinctPresent(sizes.map((size) => size.offsetMm)),
      centreBoresMm: distinctPresent(sizes.map((size) => size.centreBoreMm)),
      metadata: asMetadataObject(record.metadata),
      // Pricing contract reserved for the pricing/quote engine; always null
      // until that sprint populates it server-side.
      pricing: null,
    };
  }
}

function distinctPresent<T>(values: Array<T | null>): T[] {
  return [...new Set(values.filter((value): value is T => value !== null))];
}

function asMetadataObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
