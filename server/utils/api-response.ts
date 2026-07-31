import { NextResponse } from 'next/server';
import type { ApiDetailEnvelope, ApiListEnvelope, PaginationMeta } from '@/types/catalog';

/**
 * Success envelopes shared by every catalog endpoint. Controllers stay thin
 * and every response has the identical `{ success: true, data, meta }` shape.
 */
export function apiListResponse<T>(
  data: T[],
  meta: PaginationMeta,
): NextResponse<ApiListEnvelope<T>> {
  return NextResponse.json({ success: true, data, meta });
}

export function apiDetailResponse<T>(data: T): NextResponse<ApiDetailEnvelope<T>> {
  return NextResponse.json({ success: true, data, meta: {} });
}
