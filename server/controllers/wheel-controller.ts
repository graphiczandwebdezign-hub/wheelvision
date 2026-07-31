import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/utils/prisma';
import { listWheelsQuerySchema } from '@/server/validators/query-schemas';
import { WheelRepository } from '@/server/repositories/wheel-repository';
import { WheelService } from '@/server/services/wheel-service';
import { logger } from '@/server/utils/logger';
import { handleApiError } from '@/server/middleware/error-handler';

const service = new WheelService(new WheelRepository(prisma));

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listWheelsQuerySchema.parse(params);
    const tenantId = '00000000-0000-0000-0000-000000000000';
    const wheels = await service.listWheels(tenantId);

    logger.info('listed wheels', { page: query.page, pageSize: query.pageSize, total: wheels.length });

    return NextResponse.json({ data: wheels, meta: { page: query.page, pageSize: query.pageSize } });
  } catch (error) {
    return handleApiError(error, 'Unable to load wheels');
  }
}
