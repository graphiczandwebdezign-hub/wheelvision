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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { tenantId } = await resolveTenantContext(request);

    const record = await prisma.vehiclePackage.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!record) {
      return handleApiError(new Error('Package not found'), 'Package not found');
    }

    const dto = {
      id: record.id,
      name: record.name,
      manufacturer: record.manufacturer,
      model: record.model,
      generation: record.generation,
      year: record.year,
      trim: record.trim,
      status: record.status,
      version: record.version,
      publishedFlag: record.publishedFlag,
      colours: record.colours,
      wheelPositions: record.wheelPositions,
      wheelMetadata: record.wheelMetadata,
      tyreMetadata: record.tyreMetadata,
      renderMetadata: record.renderMetadata,
      assetReferences: record.assetReferences,
      validationState: record.validationState,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    return apiDetailResponse(dto);
  } catch (error) {
    return handleApiError(error, 'Unable to load vehicle package');
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { tenantId } = await resolveTenantContext(request);
    const body = await request.json();

    const existing = await prisma.vehiclePackage.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return handleApiError(new Error('Package not found'), 'Package not found');
    }

    const updatedData = {
      name: body.name ?? existing.name,
      manufacturer: body.manufacturer ?? existing.manufacturer,
      model: body.model ?? existing.model,
      generation: body.generation !== undefined ? body.generation : existing.generation,
      year: body.year !== undefined ? (body.year ? Number(body.year) : null) : existing.year,
      trim: body.trim !== undefined ? body.trim : existing.trim,
      colours: body.colours ?? existing.colours,
      wheelPositions: body.wheelPositions ?? existing.wheelPositions,
      wheelMetadata: body.wheelMetadata !== undefined ? body.wheelMetadata : existing.wheelMetadata,
      tyreMetadata: body.tyreMetadata !== undefined ? body.tyreMetadata : existing.tyreMetadata,
      renderMetadata: body.renderMetadata !== undefined ? body.renderMetadata : existing.renderMetadata,
      assetReferences: body.assetReferences ?? existing.assetReferences,
    };

    const validation = validateVehiclePackage(updatedData);

    const record = await prisma.vehiclePackage.update({
      where: { id },
      data: {
        ...updatedData,
        validationState: validation as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    const dto = {
      id: record.id,
      name: record.name,
      manufacturer: record.manufacturer,
      model: record.model,
      generation: record.generation,
      year: record.year,
      trim: record.trim,
      status: record.status,
      version: record.version,
      publishedFlag: record.publishedFlag,
      colours: record.colours,
      wheelPositions: record.wheelPositions,
      wheelMetadata: record.wheelMetadata,
      tyreMetadata: record.tyreMetadata,
      renderMetadata: record.renderMetadata,
      assetReferences: record.assetReferences,
      validationState: record.validationState,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    return apiDetailResponse(dto);
  } catch (error) {
    return handleApiError(error, 'Unable to update vehicle package');
  }
}
