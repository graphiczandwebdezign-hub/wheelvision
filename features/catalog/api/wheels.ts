import type { CatalogListParams, WheelDetail, WheelSummary } from '@/types/catalog';
import { getDetail, getList, type PaginatedData } from '@/features/catalog/api/client';

export function listWheels(params?: CatalogListParams): Promise<PaginatedData<WheelSummary>> {
  return getList<WheelSummary>('/wheels', params);
}

export function getWheel(id: string): Promise<WheelDetail> {
  return getDetail<WheelDetail>(`/wheels/${id}`);
}
