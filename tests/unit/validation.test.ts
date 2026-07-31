import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { listVehiclesQuerySchema, listWheelsQuerySchema } from '@/server/validators/query-schemas';

describe('query validation', () => {
  it('accepts valid vehicle query params', () => {
    const parsed = listVehiclesQuerySchema.parse({ page: '2', pageSize: '20' });
    expect(parsed).toEqual({ page: 2, pageSize: 20 });
  });

  it('accepts valid wheel query params', () => {
    const parsed = listWheelsQuerySchema.parse({ page: '1', pageSize: '10' });
    expect(parsed).toEqual({ page: 1, pageSize: 10 });
  });

  it('applies defaults when params are absent', () => {
    expect(listVehiclesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listWheelsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it.each([
    ['page below 1', { page: '0' }],
    ['negative page', { page: '-3' }],
    ['pageSize above the cap', { pageSize: '101' }],
    ['pageSize below 1', { pageSize: '0' }],
    ['non-numeric page', { page: 'abc' }],
  ])('rejects %s with a ZodError', (_label, params) => {
    expect(() => listVehiclesQuerySchema.parse(params)).toThrow(ZodError);
    expect(() => listWheelsQuerySchema.parse(params)).toThrow(ZodError);
  });
});
