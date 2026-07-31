import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { createQuoteSchema, listQuotesQuerySchema } from '@/server/validators/quote-schemas';
import { createTenantResolver } from '@/server/context/tenant-context';
import { PricingRepository } from '@/server/repositories/pricing-repository';
import { QuoteRepository } from '@/server/repositories/quote-repository';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { TyreRepository } from '@/server/repositories/tyre-repository';
import { VehicleRepository } from '@/server/repositories/vehicle-repository';
import { WheelRepository } from '@/server/repositories/wheel-repository';
import { PricingService } from '@/server/services/pricing-service';
import { QuoteService } from '@/server/services/quote-service';
import { TyreService } from '@/server/services/tyre-service';
import { VehicleService } from '@/server/services/vehicle-service';
import { WheelService } from '@/server/services/wheel-service';
import { apiListResponse } from '@/server/utils/api-response';
import { buildPaginationMeta } from '@/server/utils/pagination';
import { handleApiError } from '@/server/middleware/error-handler';

/**
 * Quote collection endpoints (thin — parsing, delegation, envelopes):
 *   POST /api/quotes  → issue a quotation from a completed configuration
 *   GET  /api/quotes  → paginated quote history for the tenant
 *
 * Stateless collaborators are created once per module; everything
 * request-specific (tenant context, body, query) is derived per request.
 */

const tenantRepository = new TenantRepository(prisma);
const resolveTenantContext = createTenantResolver({
  lookup: tenantRepository,
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

export const quoteService = new QuoteService(new QuoteRepository(prisma), {
  catalog: {
    vehicles: new VehicleService(new VehicleRepository(prisma)),
    wheels: new WheelService(new WheelRepository(prisma)),
    tyres: new TyreService(new TyreRepository(prisma)),
  },
  pricing: new PricingService(new PricingRepository(prisma)),
  dealers: tenantRepository,
});

export async function POST(request: NextRequest) {
  try {
    const body = createQuoteSchema.parse(await request.json());
    const { tenantId } = await resolveTenantContext(request);
    const quote = await quoteService.createQuote(tenantId, body);

    return NextResponse.json({ success: true, data: quote, meta: {} }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Unable to create the quote');
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listQuotesQuerySchema.parse(params);
    const { tenantId } = await resolveTenantContext(request);
    const { data, total } = await quoteService.listQuotes(tenantId, query);

    return apiListResponse(data, buildPaginationMeta(query.page, query.pageSize, total));
  } catch (error) {
    return handleApiError(error, 'Unable to load quotes');
  }
}
