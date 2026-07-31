import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { entityIdParamSchema } from '@/server/validators/query-schemas';
import { createTenantResolver } from '@/server/context/tenant-context';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { VehicleRepository } from '@/server/repositories/vehicle-repository';
import { VehicleService } from '@/server/services/vehicle-service';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});
const service = new VehicleService(new VehicleRepository(prisma));

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = entityIdParamSchema.parse(await context.params);
    const { tenantId } = await resolveTenantContext(request);
    const vehicle = await service.getVehicle(tenantId, id);

    return apiDetailResponse(vehicle);
  } catch (error) {
    return handleApiError(error, 'Unable to load the vehicle');
  }
}
