import type { CatalogListParams, TyreDetail, TyreSummary } from '@/types/catalog';
import { getDetail, getList, type PaginatedData } from '@/features/catalog/api/client';

export function listTyres(params?: CatalogListParams): Promise<PaginatedData<TyreSummary>> {
  return getList<TyreSummary>('/tyres', params);
}

export function getTyre(id: string): Promise<TyreDetail> {
  return getDetail<TyreDetail>(`/tyres/${id}`);
}
