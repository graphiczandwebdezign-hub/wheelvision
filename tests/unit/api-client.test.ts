import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, getDetail, getList } from '@/features/catalog/api/client';

/**
 * The catalog API client is the only fetch boundary in the frontend; these
 * tests pin its envelope handling, error mapping and URL construction.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('catalog api client', () => {
  it('unwraps list envelopes and serialises pagination params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        data: [{ id: 'v1' }],
        meta: { page: 2, pageSize: 5, total: 11, totalPages: 3 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getList<{ id: string }>('/vehicles', { page: 2, pageSize: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vehicles?page=2&pageSize=5',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(result.data).toEqual([{ id: 'v1' }]);
    expect(result.meta.totalPages).toBe(3);
  });

  it('omits the query string when no params are given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await getList('/tyres');

    expect(fetchMock).toHaveBeenCalledWith('/api/tyres', expect.anything());
  });

  it('unwraps detail envelopes to the payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: { id: 'v1' }, meta: {} })),
    );

    await expect(getDetail<{ id: string }>('/vehicles/v1')).resolves.toEqual({ id: 'v1' });
  });

  it('maps documented error envelopes to ApiClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(404, {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found', details: { vehicleId: 'v9' } },
        }),
      ),
    );

    const failure = await getDetail('/vehicles/v9').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiClientError);
    expect(failure).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Vehicle not found',
      details: { vehicleId: 'v9' },
    });
  });

  it('raises a synthetic error for non-JSON failure responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })));

    await expect(getList('/vehicles')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 502,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('raises NETWORK_ERROR when the request cannot be made', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hangup')));

    await expect(getList('/vehicles')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
