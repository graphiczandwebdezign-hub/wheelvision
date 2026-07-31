import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';
import type { TenantLookup } from '@/server/context/tenant-context';

export class TenantRepository extends BaseRepository implements TenantLookup {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findIdBySlug(slug: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return tenant?.id ?? null;
  }
}
