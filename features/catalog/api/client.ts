import type {
  ApiDetailEnvelope,
  ApiErrorEnvelope,
  ApiListEnvelope,
  CatalogListParams,
  PaginationMeta,
} from '@/types/catalog';

/**
 * Typed fetch boundary for the catalog API. Components never call `fetch`
 * directly — every request flows through this client so envelope handling,
 * error mapping and headers stay consistent everywhere.
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}

function isErrorEnvelope(body: unknown): body is ApiErrorEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as ApiErrorEnvelope).success === false &&
    'error' in body
  );
}

async function request<TBody>(path: string): Promise<TBody> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      headers: { accept: 'application/json' },
    });
  } catch (cause) {
    throw new ApiClientError('The catalog service is unreachable', 0, 'NETWORK_ERROR', null);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok || isErrorEnvelope(body)) {
    const envelope = isErrorEnvelope(body) ? body : null;
    throw new ApiClientError(
      envelope?.error.message ?? `Request failed with status ${response.status}`,
      response.status,
      envelope?.error.code ?? 'UNKNOWN_ERROR',
      envelope?.error.details ?? null,
    );
  }

  return body as TBody;
}

function withSearchParams(path: string, params?: CatalogListParams): string {
  const search = new URLSearchParams();
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function getList<T>(
  path: string,
  params?: CatalogListParams,
): Promise<PaginatedData<T>> {
  const envelope = await request<ApiListEnvelope<T>>(withSearchParams(path, params));
  return { data: envelope.data, meta: envelope.meta };
}

export async function getDetail<T>(path: string): Promise<T> {
  const envelope = await request<ApiDetailEnvelope<T>>(path);
  return envelope.data;
}
