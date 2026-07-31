import { NextRequest } from 'next/server';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { createTenantResolver } from '@/server/context/tenant-context';
import { env } from '@/config/env';
import { prisma } from '@/server/utils/prisma';
import { TenantRepository } from '@/server/repositories/tenant-repository';

const resolveTenantContext = createTenantResolver({
  lookup: new TenantRepository(prisma),
  config: { defaultTenantSlug: env.DEFAULT_TENANT_SLUG },
});

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await resolveTenantContext(request);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiDetailResponse({ success: false, message: 'No file provided' });
    }

    const fileName = file.name;
    const mimeType = file.type;
    const url = `/uploads/${tenantId}/${Date.now()}-${fileName}`;

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        fileName,
        mimeType,
        url,
      },
    });

    return apiDetailResponse({
      id: asset.id,
      fileName: asset.fileName,
      url: asset.url,
      mimeType: asset.mimeType,
    });
  } catch (error) {
    return handleApiError(error, 'Unable to upload file');
  }
}
