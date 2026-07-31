import { BaseService } from '@/server/services/base-service';

interface VehicleRepositoryLike {
  listByTenant(tenantId: string): Promise<
    Array<{
      id: string;
      name: string;
      wheelDiameterMm: number;
      model: {
        name: string;
        manufacturer: { name: string };
      };
      colours?: Array<{ name: string }> | { name: string } | null;
      colour?: { name: string } | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
}

export interface VehicleResponse {
  id: string;
  manufacturer: string;
  model: string;
  variant: string;
  colour: string;
  createdAt: Date;
  updatedAt: Date;
}

export class VehicleService extends BaseService<VehicleRepositoryLike> {
  constructor(repository: VehicleRepositoryLike) {
    super(repository);
  }

  async listVehicles(tenantId: string): Promise<VehicleResponse[]> {
    const records = await this.repository.listByTenant(tenantId);

    return records.map((record) => {
      const colourName = Array.isArray(record.colours)
        ? record.colours[0]?.name
        : record.colours?.name ?? record.colour?.name;

      return {
        id: record.id,
        manufacturer: record.model.manufacturer.name,
        model: record.model.name,
        variant: record.name,
        colour: colourName ?? 'Unknown',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
  }
}
