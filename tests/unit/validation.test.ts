import { describe, expect, it } from 'vitest';
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
});
