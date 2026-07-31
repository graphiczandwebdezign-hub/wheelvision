import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { listVehiclesQuerySchema } from '@/server/validators/query-schemas';
import { createTenantResolver } from '@/server/context/tenant-context';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { VehicleRepository } from '@/server/repositories/vehicle-repository';
import { VehicleService } from '@/server/services/vehicle-service';
import { apiListResponse } from '@/server/utils/api-response';
import { buildPaginationMeta } from '@/server/utils/pagination';
import { handleApiError } from '@/server/middleware/error-handler';

// Stateless collaborators are created once per module; everything
// request-specific (tenant context, pagination) is derived per request.
const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});
const service = new VehicleService(new VehicleRepository(prisma));

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listVehiclesQuerySchema.parse(params);
    const { tenantId } = await resolveTenantContext(request);
    const { data, total } = await service.listVehicles(tenantId, query);

    return apiListResponse(data, buildPaginationMeta(query.page, query.pageSize, total));
  } catch (error) {
    return handleApiError(error, 'Unable to load vehicles');
  }
}
