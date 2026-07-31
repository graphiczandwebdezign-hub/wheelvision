import { BaseService } from '@/server/services/base-service';

interface WheelRepositoryLike {
  listByTenant(tenantId: string): Promise<
    Array<{
      id: string;
      name: string;
      brand: { name: string };
      finishes: Array<{ name: string }>;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
}

export interface WheelResponse {
  id: string;
  brand: string;
  model: string;
  finish: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WheelService extends BaseService<WheelRepositoryLike> {
  constructor(repository: WheelRepositoryLike) {
    super(repository);
  }

  async listWheels(tenantId: string): Promise<WheelResponse[]> {
    const records = await this.repository.listByTenant(tenantId);

    return records.map((record) => ({
      id: record.id,
      brand: record.brand.name,
      model: record.name,
      finish: record.finishes[0]?.name ?? 'Unknown',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }
}
