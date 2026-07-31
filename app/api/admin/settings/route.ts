import { NextRequest } from 'next/server';
import { apiSuccessResponse, apiDetailResponse } from '@/server/utils/api-response';
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
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          tenantId,
          dealerName: 'Demo Dealership',
          address: '123 Rivonia Road, Johannesburg',
          telephone: '+27 11 555 0100',
          email: 'dealership@wheelvision.co.za',
          website: 'https://wheelvision.co.za',
          vatNumber: '4000123456',
          companyRegistration: '2026/012345/07',
          logoUrl: null,
          quoteValidityDays: 30,
          currency: 'ZAR',
          timezone: 'Africa/Johannesburg',
        },
      });
    }

    const dto = {
      dealerName: settings.dealerName ?? 'Demo Dealership',
      address: settings.address,
      telephone: settings.telephone,
      email: settings.email,
      website: settings.website,
      vatNumber: settings.vatNumber,
      companyRegistration: settings.companyRegistration,
      logoUrl: settings.logoUrl,
      quoteValidityDays: settings.quoteValidityDays,
      currency: settings.currency,
      timezone: settings.timezone,
    };

    return apiSuccessResponse(dto);
  } catch (error) {
    return handleApiError(error, 'Unable to load tenant settings');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantContext(request);
    const body = await request.json();

    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        dealerName: body.dealerName,
        address: body.address,
        telephone: body.telephone,
        email: body.email,
        website: body.website,
        vatNumber: body.vatNumber,
        companyRegistration: body.companyRegistration,
        logoUrl: body.logoUrl,
        quoteValidityDays: Number(body.quoteValidityDays ?? 30),
        currency: body.currency ?? 'ZAR',
        timezone: body.timezone ?? 'Africa/Johannesburg',
      },
      update: {
        dealerName: body.dealerName,
        address: body.address,
        telephone: body.telephone,
        email: body.email,
        website: body.website,
        vatNumber: body.vatNumber,
        companyRegistration: body.companyRegistration,
        logoUrl: body.logoUrl,
        quoteValidityDays: body.quoteValidityDays !== undefined ? Number(body.quoteValidityDays) : undefined,
        currency: body.currency,
        timezone: body.timezone,
      },
    });

    return apiDetailResponse(settings);
  } catch (error) {
    return handleApiError(error, 'Unable to update tenant settings');
  }
}
