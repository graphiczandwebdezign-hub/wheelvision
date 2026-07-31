import { describe, expect, it } from 'vitest';
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  quoteCustomerSchema,
} from '@/server/validators/quote-schemas';
import { formatQuoteNumber } from '@/server/quote/quote-number';
import { completeConfiguration } from '@/tests/helpers/quote-fixtures';

describe('createQuoteSchema', () => {
  it('accepts a complete request with nullish optionals', () => {
    const parsed = createQuoteSchema.parse({
      configuration: { ...completeConfiguration },
      customer: { name: 'Mrs Nkosi' },
    });
    expect(parsed.customer.name).toBe('Mrs Nkosi');
    expect(parsed.customer.email ?? null).toBeNull();
    expect(parsed.consultantName ?? null).toBeNull();
  });

  it('rejects extra/unknown fields (strict at the boundary)', () => {
    expect(() =>
      createQuoteSchema.parse({
        configuration: { ...completeConfiguration, magic: true },
        customer: { name: 'X' },
      }),
    ).toThrow();
    expect(() =>
      createQuoteSchema.parse({
        configuration: { ...completeConfiguration },
        customer: { name: 'X', role: 'admin' },
      }),
    ).toThrow();
  });

  it('normalises and validates the customer block', () => {
    expect(
      quoteCustomerSchema.parse({ name: '  Mrs Nkosi  ', email: 'NKOSI@EXAMPLE.CO.ZA' }).email,
    ).toBe('nkosi@example.co.za');
    expect(() => quoteCustomerSchema.parse({ name: '' })).toThrow();
    expect(() => quoteCustomerSchema.parse({ name: 'X', email: 'not-an-email' })).toThrow();
    expect(quoteCustomerSchema.parse({ name: 'X', email: null, phone: null })).toEqual({
      name: 'X',
      email: null,
      phone: null,
    });
  });

  it('allows every configuration field to be individually nullish', () => {
    const parsed = createQuoteSchema.parse({
      configuration: {
        vehicleId: null,
        colour: null,
        wheelId: null,
        wheelFinish: null,
        wheelSizeId: null,
        tyreId: null,
        tyreProfileId: null,
      },
      customer: { name: 'X' },
    });
    expect(parsed.configuration.vehicleId).toBeNull();
  });
});

describe('listQuotesQuerySchema', () => {
  it('coerces pagination strings and clamps defaults', () => {
    expect(listQuotesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listQuotesQuerySchema.parse({ page: '3', pageSize: '5' })).toEqual({
      page: 3,
      pageSize: 5,
    });
  });

  it('accepts only known statuses', () => {
    expect(listQuotesQuerySchema.parse({ status: 'ISSUED' }).status).toBe('ISSUED');
    expect(listQuotesQuerySchema.parse({ status: 'ARCHIVED' }).status).toBe('ARCHIVED');
    expect(() => listQuotesQuerySchema.parse({ status: 'DRAFT' })).toThrow();
  });

  it('rejects out-of-range pagination', () => {
    expect(() => listQuotesQuerySchema.parse({ page: '0' })).toThrow();
    expect(() => listQuotesQuerySchema.parse({ pageSize: '101' })).toThrow();
  });
});

describe('formatQuoteNumber', () => {
  it('formats WV-<issue year>-<six digit sequence>', () => {
    expect(formatQuoteNumber(1, new Date('2026-07-31T10:00:00.000Z'))).toBe('WV-2026-000001');
    expect(formatQuoteNumber(42, new Date('2026-01-01T00:00:00.000Z'))).toBe('WV-2026-000042');
    expect(formatQuoteNumber(123456, new Date('2027-06-30T23:59:59.000Z'))).toBe('WV-2027-123456');
  });

  it('uses the UTC year of issue (no timezone drift at year boundaries)', () => {
    // 2026-12-31 23:00 UTC is already 2027 in UTC+2 — the quote carries 2026.
    expect(formatQuoteNumber(7, new Date('2026-12-31T23:00:00.000Z'))).toBe('WV-2026-000007');
  });

  it('never truncates long sequences (format stays parseable)', () => {
    expect(formatQuoteNumber(1_000_000, new Date('2026-01-01T00:00:00.000Z'))).toBe(
      'WV-2026-1000000',
    );
  });
});
