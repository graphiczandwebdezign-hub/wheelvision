import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { handleApiError } from '@/server/middleware/error-handler';
import { AppError } from '@/server/utils/errors';
import { listVehiclesQuerySchema } from '@/server/validators/query-schemas';

function captureZodError(): ZodError {
  const result = listVehiclesQuerySchema.safeParse({ page: '0', pageSize: '500' });
  if (result.success) {
    throw new Error('expected parsing to fail');
  }
  return result.error;
}

describe('handleApiError', () => {
  it('maps ZodError to HTTP 400 with the documented envelope', async () => {
    const response = handleApiError(captureZodError(), 'fallback');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Request validation failed');
    expect(body.error.details.fieldErrors.page).toBeDefined();
    expect(body.error.details.fieldErrors.pageSize).toBeDefined();
  });

  it('maps AppError to its own status code, code and details', async () => {
    const error = new AppError('Tenant not found', {
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
      details: { tenantSlug: 'ghost' },
    });

    const response = handleApiError(error, 'fallback');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
        details: { tenantSlug: 'ghost' },
      },
    });
  });

  it('always includes a details key, null when absent', async () => {
    const response = handleApiError(
      new AppError('Missing', { code: 'NOT_FOUND', statusCode: 404 }),
      'fallback',
    );
    const body = await response.json();

    expect(body.error.details).toBeNull();
  });

  it('maps unknown errors to HTTP 500 without leaking internals', async () => {
    const response = handleApiError(new Error('database exploded at line 42'), 'fallback message');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('fallback message');
    expect(body.error.details).toBeNull();
    expect(JSON.stringify(body)).not.toContain('database exploded');
  });
});
