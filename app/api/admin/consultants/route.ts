import { NextRequest } from 'next/server';
import { apiSuccessResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantContext(request);
    const users = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    const consultants = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      active: u.active,
      isDefault: u.isDefault,
      createdAt: u.createdAt.toISOString(),
    }));

    return apiSuccessResponse(consultants);
  } catch (error) {
    return handleApiError(error, 'Unable to load consultants');
  }
}
