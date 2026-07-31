import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { listWheelsQuerySchema } from '@/server/validators/query-schemas';
import { createTenantResolver } from '@/server/context/tenant-context';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { WheelRepository } from '@/server/repositories/wheel-repository';
import { WheelService } from '@/server/services/wheel-service';
import { apiListResponse } from '@/server/utils/api-response';
import { buildPaginationMeta } from '@/server/utils/pagination';
import { handleApiError } from '@/server/middleware/error-handler';

// Stateless collaborators are created once per module; everything
// request-specific (tenant context, pagination) is derived per request.
const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});
const service = new WheelService(new WheelRepository(prisma));

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listWheelsQuerySchema.parse(params);
    const { tenantId } = await resolveTenantContext(request);
    const { data, total } = await service.listWheels(tenantId, query);

    return apiListResponse(data, buildPaginationMeta(query.page, query.pageSize, total));
  } catch (error) {
    return handleApiError(error, 'Unable to load wheels');
  }
}
