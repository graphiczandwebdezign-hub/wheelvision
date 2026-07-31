import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/utils/prisma';
import { listVehiclesQuerySchema } from '@/server/validators/query-schemas';
import { VehicleRepository } from '@/server/repositories/vehicle-repository';
import { VehicleService } from '@/server/services/vehicle-service';
import { logger } from '@/server/utils/logger';
import { handleApiError } from '@/server/middleware/error-handler';

const service = new VehicleService(new VehicleRepository(prisma));

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listVehiclesQuerySchema.parse(params);
    const tenantId = '00000000-0000-0000-0000-000000000000';
    const vehicles = await service.listVehicles(tenantId);

    logger.info('listed vehicles', { page: query.page, pageSize: query.pageSize, total: vehicles.length });

    return NextResponse.json({ data: vehicles, meta: { page: query.page, pageSize: query.pageSize } });
  } catch (error) {
    return handleApiError(error, 'Unable to load vehicles');
  }
}
