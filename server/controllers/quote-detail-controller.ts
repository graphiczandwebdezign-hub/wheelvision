import { NextRequest } from 'next/server';
import { entityIdParamSchema } from '@/server/validators/query-schemas';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { quoteService } from '@/server/controllers/quote-controller';

/** GET /api/quotes/:id — single quote detail (with lines, totals, snapshot). */

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = entityIdParamSchema.parse(await context.params);
    const { tenantId } = await resolveTenantContext(request);
    const quote = await quoteService.getQuote(tenantId, id);

    return apiDetailResponse(quote);
  } catch (error) {
    return handleApiError(error, 'Unable to load the quote');
  }
}
