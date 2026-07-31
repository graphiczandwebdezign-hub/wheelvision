import { NextRequest } from 'next/server';
import { apiListResponse, apiDetailResponse } from '@/server/utils/api-response';
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

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantContext(request);
    const records = await prisma.vehiclePackage.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    const packages = records.map((r) => ({
      id: r.id,
      name: r.name,
      manufacturer: r.manufacturer,
      model: r.model,
      generation: r.generation,
      year: r.year,
      trim: r.trim,
      status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      version: r.version,
      publishedFlag: r.publishedFlag,
      colours: (r.colours as string[]) ?? [],
      wheelPositions: (r.wheelPositions as Array<{ axle: string; x: number; y: number }>) ?? [],
      wheelMetadata: (r.wheelMetadata as Record<string, unknown>) ?? null,
      tyreMetadata: (r.tyreMetadata as Record<string, unknown>) ?? null,
      renderMetadata: (r.renderMetadata as Record<string, unknown>) ?? null,
      assetReferences: (r.assetReferences as Array<{ type: string; url: string }>) ?? [],
      validationState: (r.validationState as { isValid: boolean; errors: string[] }) ?? { isValid: true, errors: [] },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return apiListResponse(packages, { page: 1, pageSize: packages.length, total: packages.length, totalPages: 1 });
  } catch (error) {
    return handleApiError(error, 'Unable to load vehicle packages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantContext(request);
    const body = await request.json();

    const validation = validateVehiclePackage(body);

    const record = await prisma.vehiclePackage.create({
      data: {
        tenantId,
        name: body.name ?? 'New Vehicle Package',
        manufacturer: body.manufacturer ?? 'Manufacturer',
        model: body.model ?? 'Model',
        generation: body.generation ?? null,
        year: body.year ? Number(body.year) : null,
        trim: body.trim ?? null,
        status: 'DRAFT',
        version: 1,
        publishedFlag: false,
        colours: body.colours ?? ['Silver', 'Black', 'White'],
        wheelPositions: body.wheelPositions ?? [{ axle: 'front', x: 120, y: 220 }, { axle: 'rear', x: 380, y: 220 }],
        wheelMetadata: body.wheelMetadata ?? null,
        tyreMetadata: body.tyreMetadata ?? null,
        renderMetadata: body.renderMetadata ?? null,
        assetReferences: body.assetReferences ?? [{ type: 'body', url: '/vehicles/default/body.webp' }],
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
      colours: record.colours as string[],
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
    return handleApiError(error, 'Unable to create vehicle package');
  }
}
