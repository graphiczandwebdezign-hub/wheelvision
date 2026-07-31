import { describe, expect, it, vi } from 'vitest';
import {
  createTenantResolver,
  TENANT_HEADER_NAME,
  type TenantLookup,
} from '@/server/context/tenant-context';

function requestWithHeaders(headers: Record<string, string> = {}) {
  return { headers: new Headers(headers) };
}

function createLookup(map: Record<string, string>): TenantLookup {
  return { findIdBySlug: vi.fn(async (slug: string) => map[slug] ?? null) };
}

describe('tenant context resolver', () => {
  it('resolves the tenant from the request header', async () => {
    const lookup = createLookup({ acme: 'tenant-id-acme' });
    const resolve = createTenantResolver({ lookup, config: { defaultTenantSlug: 'demo' } });

    const context = await resolve(requestWithHeaders({ [TENANT_HEADER_NAME]: 'acme' }));

    expect(lookup.findIdBySlug).toHaveBeenCalledWith('acme');
    expect(context).toEqual({
      tenantId: 'tenant-id-acme',
      tenantSlug: 'acme',
      resolutionSource: 'header',
    });
  });

  it('falls back to the configured default tenant when no header is present', async () => {
    const lookup = createLookup({ demo: 'tenant-id-demo' });
    const resolve = createTenantResolver({ lookup, config: { defaultTenantSlug: 'demo' } });

    const context = await resolve(requestWithHeaders());

    expect(context).toEqual({
      tenantId: 'tenant-id-demo',
      tenantSlug: 'demo',
      resolutionSource: 'default',
    });
  });

  it('prefers the header over the default and trims whitespace', async () => {
    const lookup = createLookup({ acme: 'id-acme', demo: 'id-demo' });
    const resolve = createTenantResolver({ lookup, config: { defaultTenantSlug: 'demo' } });

    const context = await resolve(requestWithHeaders({ [TENANT_HEADER_NAME]: '  acme  ' }));

    expect(context.tenantSlug).toBe('acme');
    expect(context.resolutionSource).toBe('header');
  });

  it('treats a blank header as absent', async () => {
    const lookup = createLookup({ demo: 'tenant-id-demo' });
    const resolve = createTenantResolver({ lookup, config: { defaultTenantSlug: 'demo' } });

    const context = await resolve(requestWithHeaders({ [TENANT_HEADER_NAME]: '   ' }));

    expect(context.tenantSlug).toBe('demo');
    expect(context.resolutionSource).toBe('default');
  });

  it('honours a custom header name', async () => {
    const lookup = createLookup({ acme: 'tenant-id-acme' });
    const resolve = createTenantResolver({
      lookup,
      config: { headerName: 'x-custom-tenant' },
    });

    const context = await resolve(requestWithHeaders({ 'x-custom-tenant': 'acme' }));

    expect(context.tenantId).toBe('tenant-id-acme');
  });

  it('rejects with TENANT_REQUIRED when neither header nor default is available', async () => {
    const resolve = createTenantResolver({ lookup: createLookup({}) });

    await expect(resolve(requestWithHeaders())).rejects.toMatchObject({
      code: 'TENANT_REQUIRED',
      statusCode: 400,
    });
  });

  it('rejects with TENANT_NOT_FOUND for an unknown slug', async () => {
    const resolve = createTenantResolver({
      lookup: createLookup({}),
      config: { defaultTenantSlug: 'ghost' },
    });

    await expect(resolve(requestWithHeaders())).rejects.toMatchObject({
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
      details: { tenantSlug: 'ghost' },
    });
  });
});
