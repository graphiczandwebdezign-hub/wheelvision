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

async function request<TBody>(path: string, init?: RequestInit): Promise<TBody> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
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

function withSearchParams<TParams extends object>(path: string, params?: TParams): string {
  const search = new URLSearchParams();
  const entries: Record<string, unknown> = { ...params };
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
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

/** Command helper: POST (with an optional JSON body) resolving the detail envelope. */
export async function postDetail<T>(path: string, body?: unknown): Promise<T> {
  const envelope = await request<ApiDetailEnvelope<T>>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return envelope.data;
}
