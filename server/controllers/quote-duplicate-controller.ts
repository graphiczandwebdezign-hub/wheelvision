import { NextRequest, NextResponse } from 'next/server';
import { entityIdParamSchema } from '@/server/validators/query-schemas';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';
import { quoteService } from '@/server/controllers/quote-controller';

/**
 * POST /api/quotes/:id/duplicate — re-issues the snapshot's configuration at
 * current catalogue pricing under a fresh sequential quote number.
 */

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = entityIdParamSchema.parse(await context.params);
    const { tenantId } = await resolveTenantContext(request);
    const duplicate = await quoteService.duplicateQuote(tenantId, id);

    return NextResponse.json({ success: true, data: duplicate, meta: {} }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Unable to duplicate the quote');
  }
}
