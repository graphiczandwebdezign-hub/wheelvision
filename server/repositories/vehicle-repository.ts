import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';

export class VehicleRepository extends BaseRepository<PrismaClient, never, never> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async listByTenant(tenantId: string) {
    return this.prisma.vehicleVariant.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        model: {
          include: {
            manufacturer: true,
          },
        },
        colours: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}
