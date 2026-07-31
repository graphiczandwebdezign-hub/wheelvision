/**
 * Shared pagination primitives used by repositories (query shape) and
 * controllers (response contract). Keeping both sides in one module keeps
 * the pagination contract consistent across every list API.
 */

import type { PaginationMeta } from '@/types/catalog';

export type { PaginationMeta };

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** Repository result: the requested page of rows plus the un-paged total. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export function toSkipTake({ page, pageSize }: PaginationParams): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
