import type { CatalogListParams, VehicleDetail, VehicleSummary } from '@/types/catalog';
import { getDetail, getList, type PaginatedData } from '@/features/catalog/api/client';

export function listVehicles(params?: CatalogListParams): Promise<PaginatedData<VehicleSummary>> {
  return getList<VehicleSummary>('/vehicles', params);
}

export function getVehicle(id: string): Promise<VehicleDetail> {
  return getDetail<VehicleDetail>(`/vehicles/${id}`);
}
