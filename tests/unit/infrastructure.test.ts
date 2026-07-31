import { describe, expect, it } from 'vitest';
import { LocalStorageProvider } from '@/server/infrastructure/storage/storage-provider';
import { MockEmailProvider } from '@/server/infrastructure/email/email-provider';
import { InMemoryJobQueue } from '@/server/infrastructure/queue/queue-service';
import { generatePdfBuffer } from '@/server/infrastructure/pdf/pdf-generator';
import { createQuoteRecord } from '@/tests/helpers/quote-fixtures';
import { buildQuoteDetail } from '@/server/quote/quote-builder';

describe('Sprint 13 Infrastructure & Production Readiness', () => {
  it('instantiates local storage provider', () => {
    const storage = new LocalStorageProvider();
    expect(storage).toBeDefined();
  });

  it('sends mock emails successfully', async () => {
    const email = new MockEmailProvider();
    const result = await email.send({
      to: 'client@example.com',
      subject: 'Test Quote',
      html: '<p>Hello</p>',
    });
    expect(result).toBe(true);
  });

  it('queues jobs via in-memory queue', async () => {
    const q = new InMemoryJobQueue();
    const jobId = await q.add('generate-pdf', { quoteId: '123' });
    expect(jobId).toContain('job-');
  });

  it('generates a PDF buffer from a quote detail', () => {
    const record = createQuoteRecord();
    const quote = buildQuoteDetail(record);
    const pdf = generatePdfBuffer(quote);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
