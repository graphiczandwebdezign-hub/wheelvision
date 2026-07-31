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

  /** Dealer identity for quotes/snapshots (id ↔ name ↔ slug). */
  async findById(id: string): Promise<{ id: string; name: string; slug: string } | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
  }
}
