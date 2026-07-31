import { BaseService } from '@/server/services/base-service';
import type { VehicleRepositoryPort } from '@/server/repositories/vehicle-repository';
import type { PaginatedResult, PaginationParams } from '@/server/utils/pagination';
import type { VehicleDetail, VehicleSummary } from '@/types/catalog';
import { vehicleRenderMetadataSchema } from '@/types/render-metadata';
import { AppError } from '@/server/utils/errors';
import { logger } from '@/lib/logger';

export class VehicleService extends BaseService<VehicleRepositoryPort> {
  constructor(repository: VehicleRepositoryPort) {
    super(repository);
  }

  async listVehicles(
    tenantId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<VehicleSummary>> {
    const { data, total } = await this.repository.listByTenant(tenantId, pagination);
    return { total, data: data.map((record) => this.toSummary(record)) };
  }

  async getVehicle(tenantId: string, id: string): Promise<VehicleDetail> {
    const record = await this.repository.findById(tenantId, id);

    if (!record) {
      throw AppError.notFound('Vehicle not found', { vehicleId: id });
    }

    return {
      ...this.toSummary(record),
      renderMetadata: this.parseRenderMetadata(record),
    };
  }

  /**
   * FK anchors the quote domain persists on SavedConfiguration
   * (variant + owning model). 404s identically to `getVehicle`.
   */
  async getVehicleAnchors(
    tenantId: string,
    id: string,
  ): Promise<{ vehicleVariantId: string; vehicleModelId: string }> {
    const record = await this.repository.findById(tenantId, id);
    if (!record) {
      throw AppError.notFound('Vehicle not found', { vehicleId: id });
    }
    return { vehicleVariantId: record.id, vehicleModelId: record.vehicleModelId };
  }

  private toSummary(record: {
    id: string;
    name: string;
    year: number | null;
    wheelDiameterMm: number;
    model: { name: string; manufacturer: { name: string } };
    colours: Array<{ name: string }>;
    createdAt: Date;
    updatedAt: Date;
  }): VehicleSummary {
    return {
      id: record.id,
      manufacturer: record.model.manufacturer.name,
      model: record.model.name,
      variant: record.name,
      year: record.year,
      wheelDiameterMm: record.wheelDiameterMm,
      colours: record.colours.map((colour) => colour.name),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Stored render packages are validated against the Chapter-6 contract
   * before they reach a client. An invalid package degrades to `null` — the
   * catalog stays readable and the data problem surfaces in logs where the
   * publishing workflow (Sprint 9) will hard-fail on the same validation.
   */
  private parseRenderMetadata(record: { id: string; renderMetadata: unknown }) {
    if (record.renderMetadata == null) {
      return null;
    }
    const parsed = vehicleRenderMetadataSchema.safeParse(record.renderMetadata);
    if (!parsed.success) {
      logger.warn('vehicle has invalid render metadata', {
        vehicleId: record.id,
        issues: parsed.error.issues.length,
      });
      return null;
    }
    return parsed.data;
  }
}
