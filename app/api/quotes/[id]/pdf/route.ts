import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/utils/prisma';
import { buildQuoteDetail } from '@/server/quote/quote-builder';
import { generatePdfBuffer } from '@/server/infrastructure/pdf/pdf-generator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await prisma.quote.findFirst({
      where: {
        OR: [{ id }, { quoteNumber: id }],
        deletedAt: null,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        customer: { select: { name: true, email: true, phone: true } },
        lines: { orderBy: [{ sortOrder: 'asc' }] },
        snapshot: { select: { payload: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Quote not found' } }, { status: 404 });
    }

    const quote = buildQuoteDetail(record as unknown as Parameters<typeof buildQuoteDetail>[0]);
    const pdfBuffer = generatePdfBuffer(quote);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="Quotation-${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
