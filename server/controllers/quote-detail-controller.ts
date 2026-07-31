import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { quoteService } from '@/server/controllers/quote-controller';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

const quoteRefParamSchema = z.object({
  id: z.string().trim().min(1).refine(
    (val) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const isQuoteNumber = /^WV-\d{4}-\d{6}$/.test(val);
      return isUuid || isQuoteNumber;
    },
    { message: 'Invalid quote id or number format' }
  ),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const { id } = quoteRefParamSchema.parse(rawParams);
    let tenantId: string | null = null;
    try {
      const tenantContext = await resolveTenantContext(request);
      tenantId = tenantContext.tenantId;
    } catch {
      // Allow public access without tenant header
    }

    const quote = await quoteService.getQuote(tenantId, id);
    return apiDetailResponse(quote);
  } catch (error) {
    return handleApiError(error, 'Unable to load the quote');
  }
}
