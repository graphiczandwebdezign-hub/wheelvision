import { NextRequest } from 'next/server';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { validateVehiclePackage } from '@/features/packages/validation/package-validator';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { tenantId } = await resolveTenantContext(request);

    const record = await prisma.vehiclePackage.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!record) {
      return handleApiError(new Error('Package not found'), 'Package not found');
    }

    const validation = validateVehiclePackage({
      name: record.name,
      manufacturer: record.manufacturer,
      model: record.model,
      colours: record.colours as string[],
      wheelPositions: record.wheelPositions as Array<{ axle: string; x: number; y: number }>,
      assetReferences: record.assetReferences as Array<{ type: string; url: string }>,
    });

    if (!validation.isValid) {
      return handleApiError(new Error(`Validation failed: ${validation.errors.join(', ')}`), 'Publishing validation failed');
    }

    const updated = await prisma.vehiclePackage.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedFlag: true,
        version: { increment: 1 },
        validationState: validation as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    const dto = {
      id: updated.id,
      name: updated.name,
      manufacturer: updated.manufacturer,
      model: updated.model,
      generation: updated.generation,
      year: updated.year,
      trim: updated.trim,
      status: updated.status,
      version: updated.version,
      publishedFlag: updated.publishedFlag,
      colours: updated.colours,
      wheelPositions: updated.wheelPositions,
      wheelMetadata: updated.wheelMetadata,
      tyreMetadata: updated.tyreMetadata,
      renderMetadata: updated.renderMetadata,
      assetReferences: updated.assetReferences,
      validationState: updated.validationState,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return apiDetailResponse(dto);
  } catch (error) {
    return handleApiError(error, 'Unable to publish vehicle package');
  }
}
