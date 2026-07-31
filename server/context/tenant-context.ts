import { AppError } from '@/server/utils/errors';

/**
 * Request-scoped tenant context.
 *
 * The resolver is deliberately request-driven and stateless: every API
 * request resolves its own context, nothing tenant-specific is cached on a
 * shared module instance, and the resolver is injected into controllers so
 * tests can substitute it without touching the database.
 *
 * Authentication compatibility: today the tenant slug arrives via an
 * explicit request header or a configured default (development/seed parity).
 * When authentication lands, the slug will instead come from the
 * authenticated principal's claims — only the slug extraction step below
 * changes; controllers and services keep depending on `TenantResolver`.
 */

export const TENANT_HEADER_NAME = 'x-tenant-slug';

export type TenantResolutionSource = 'header' | 'default';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  resolutionSource: TenantResolutionSource;
}

/** Data-access seam for resolving a slug to a persisted tenant id. */
export interface TenantLookup {
  findIdBySlug(slug: string): Promise<string | null>;
}

export interface TenantResolverConfig {
  /** Fallback slug when the request does not carry one (e.g. seed demo tenant). */
  defaultTenantSlug?: string;
  /** Header consulted for an explicit slug. Defaults to `x-tenant-slug`. */
  headerName?: string;
}

/** Minimal request surface required for resolution (NextRequest satisfies it). */
export interface TenantResolutionRequest {
  headers: Headers;
}

export type TenantResolver = (request: TenantResolutionRequest) => Promise<TenantContext>;

export function createTenantResolver({
  lookup,
  config = {},
}: {
  lookup: TenantLookup;
  config?: TenantResolverConfig;
}): TenantResolver {
  const headerName = config.headerName ?? TENANT_HEADER_NAME;

  return async function resolveTenantContext(request) {
    const headerSlug = request.headers.get(headerName)?.trim() || undefined;
    const resolutionSource: TenantResolutionSource = headerSlug ? 'header' : 'default';
    const tenantSlug = headerSlug ?? config.defaultTenantSlug;

    if (!tenantSlug) {
      throw new AppError('A tenant identifier is required for this request', {
        code: 'TENANT_REQUIRED',
        statusCode: 400,
      });
    }

    const tenantId = await lookup.findIdBySlug(tenantSlug);
    if (!tenantId) {
      throw new AppError('Tenant not found', {
        code: 'TENANT_NOT_FOUND',
        statusCode: 404,
        details: { tenantSlug },
      });
    }

    return { tenantId, tenantSlug, resolutionSource };
  };
}
