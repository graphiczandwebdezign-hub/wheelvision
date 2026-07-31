import React from 'react';
import { notFound } from 'next/navigation';
import { quoteService } from '@/server/controllers/quote-controller';
import { QuoteViewer } from '@/features/quotes/components/quote-viewer';

interface PageProps {
  params: Promise<{ quoteNumber: string }>;
}

export default async function PublicQuotePage({ params }: PageProps) {
  const { quoteNumber } = await params;
  try {
    const quote = await quoteService.getQuote(null, quoteNumber);
    const status = await quoteService.getQuoteStatus(quoteNumber, null);

    return (
      <main className="min-h-screen bg-neutral-100 py-12">
        <QuoteViewer initialQuote={quote} initialStatus={status} />
      </main>
    );
  } catch {
    notFound();
  }
}
