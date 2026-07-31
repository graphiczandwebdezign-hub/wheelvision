import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { entityIdParamSchema } from '@/server/validators/query-schemas';
import { createTenantResolver } from '@/server/context/tenant-context';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { WheelRepository } from '@/server/repositories/wheel-repository';
import { WheelService } from '@/server/services/wheel-service';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});
const service = new WheelService(new WheelRepository(prisma));

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = entityIdParamSchema.parse(await context.params);
    const { tenantId } = await resolveTenantContext(request);
    const wheel = await service.getWheel(tenantId, id);

    return apiDetailResponse(wheel);
  } catch (error) {
    return handleApiError(error, 'Unable to load the wheel');
  }
}
