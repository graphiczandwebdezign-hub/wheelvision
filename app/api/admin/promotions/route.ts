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
    const rules = await prisma.discountRule.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'asc' },
    });

    const promotions = rules.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind as 'PERCENT' | 'FIXED',
      percentBasisPoints: r.percentBasisPoints,
      amountCents: r.amountCents,
      category: r.category,
      priority: r.priority,
      active: r.active,
      validFrom: r.validFrom?.toISOString() ?? null,
      validTo: r.validTo?.toISOString() ?? null,
    }));

    return apiSuccessResponse(promotions);
  } catch (error) {
    return handleApiError(error, 'Unable to load promotions');
  }
}
