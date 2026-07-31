import { NextResponse } from 'next/server';
import type { ApiDetailEnvelope, ApiListEnvelope, PaginationMeta } from '@/types/catalog';

export function apiListResponse<T>(
  data: T[],
  meta: PaginationMeta,
): NextResponse<ApiListEnvelope<T>> {
  return NextResponse.json({ success: true, data, meta });
}

export function apiDetailResponse<T>(data: T): NextResponse<ApiDetailEnvelope<T>> {
  return NextResponse.json({ success: true, data, meta: {} });
}

export function apiSuccessResponse<T>(data: T): NextResponse<{ success: true; data: T }> {
  return NextResponse.json({ success: true, data });
}
