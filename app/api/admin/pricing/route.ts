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

    const priceList = await prisma.priceList.findFirst({
      where: { tenantId, deletedAt: null },
      include: {
        wheelPrices: true,
        tyrePrices: true,
        labourPrices: true,
      },
    });

    const wheelModels = await prisma.wheelModel.findMany({ where: { tenantId, deletedAt: null }, include: { brand: true } });
    const tyreModels = await prisma.tyreModel.findMany({ where: { tenantId, deletedAt: null }, include: { brand: true } });

    const wheelMap = new Map(wheelModels.map((w) => [w.id, `${w.brand.name} ${w.name}`]));
    const tyreMap = new Map(tyreModels.map((t) => [t.id, `${t.brand.name} ${t.name}`]));

    const response = {
      priceListId: priceList?.id ?? 'default',
      priceListName: priceList?.name ?? 'Standard Retail Price List',
      currency: priceList?.currency ?? 'ZAR',
      vatBasisPoints: 1500,
      wheelPrices: (priceList?.wheelPrices ?? []).map((wp) => ({
        id: wp.id,
        wheelModelId: wp.wheelModelId,
        wheelName: wheelMap.get(wp.wheelModelId) ?? 'Wheel Model',
        amountCents: wp.amountCents,
      })),
      tyrePrices: (priceList?.tyrePrices ?? []).map((tp) => ({
        id: tp.id,
        tyreModelId: tp.tyreModelId,
        tyreName: tyreMap.get(tp.tyreModelId) ?? 'Tyre Model',
        amountCents: tp.amountCents,
      })),
      labourPrices: (priceList?.labourPrices ?? []).map((lp) => ({
        id: lp.id,
        serviceType: lp.serviceType,
        unit: lp.unit,
        amountCents: lp.amountCents,
      })),
    };

    return apiSuccessResponse(response);
  } catch (error) {
    return handleApiError(error, 'Unable to load pricing');
  }
}
