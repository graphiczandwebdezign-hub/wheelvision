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

    const [vehicles, wheels, tyres] = await Promise.all([
      prisma.vehicleVariant.findMany({
        where: { tenantId, deletedAt: null },
        include: { model: { include: { manufacturer: true } } },
      }),
      prisma.wheelModel.findMany({
        where: { tenantId, deletedAt: null },
        include: { brand: true },
      }),
      prisma.tyreModel.findMany({
        where: { tenantId, deletedAt: null },
        include: { brand: true },
      }),
    ]);

    const catalogItems = [
      ...vehicles.map((v) => ({
        id: v.id,
        category: 'VEHICLE' as const,
        name: `${v.model.manufacturer.name} ${v.model.name} ${v.name}`,
        brand: v.model.manufacturer.name,
        model: v.model.name,
        variant: v.name,
        active: true,
        createdAt: v.createdAt.toISOString(),
      })),
      ...wheels.map((w) => ({
        id: w.id,
        category: 'WHEEL' as const,
        name: `${w.brand.name} ${w.name}`,
        brand: w.brand.name,
        model: w.name,
        active: true,
        createdAt: w.createdAt.toISOString(),
      })),
      ...tyres.map((t) => ({
        id: t.id,
        category: 'TYRE' as const,
        name: `${t.brand.name} ${t.name}`,
        brand: t.brand.name,
        model: t.name,
        active: true,
        createdAt: t.createdAt.toISOString(),
      })),
    ];

    return apiSuccessResponse(catalogItems);
  } catch (error) {
    return handleApiError(error, 'Unable to load catalog items');
  }
}
