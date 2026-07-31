import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';

export class WheelRepository extends BaseRepository<PrismaClient, never, never> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async listByTenant(tenantId: string) {
    return this.prisma.wheelModel.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        brand: true,
        finishes: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}
