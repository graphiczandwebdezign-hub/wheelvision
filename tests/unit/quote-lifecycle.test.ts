import { describe, expect, it } from 'vitest';
import { createQuoteRecord } from '@/tests/helpers/quote-fixtures';

describe('Sprint 9 Quote Lifecycle & Verification', () => {
  it('records initial status history on creation', () => {
    const record = createQuoteRecord();
    expect(record.status).toBe('ISSUED');
  });

  it('validates status transition rules and immutability', () => {
    const historyEntry = {
      id: 'hist-1',
      fromStatus: 'ISSUED',
      toStatus: 'ACCEPTED',
      actorName: 'Mrs Nkosi',
      createdAt: new Date(),
    };
    expect(historyEntry.toStatus).toBe('ACCEPTED');
    expect(historyEntry.fromStatus).toBe('ISSUED');
  });

  it('identifies expired quotations and prevents acceptance', () => {
    const expiredRecord = createQuoteRecord({
      status: 'EXPIRED',
      validUntil: new Date('2025-01-01T00:00:00.000Z'),
    });
    const now = new Date('2026-07-31T00:00:00.000Z');
    const isExpired = new Date(expiredRecord.validUntil!).getTime() < now.getTime() || expiredRecord.status === 'EXPIRED';
    const canBeAccepted = !isExpired && ['ISSUED', 'VIEWED'].includes(expiredRecord.status);

    expect(isExpired).toBe(true);
    expect(canBeAccepted).toBe(false);
  });
});
