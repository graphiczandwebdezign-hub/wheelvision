/**
 * Frontend-facing catalog contracts — re-exported from the single shared
 * source of truth in `types/catalog.ts` so every consumer uses the same DTOs
 * the server produces.
 */
export type {
  ApiDetailEnvelope,
  ApiErrorEnvelope,
  ApiListEnvelope,
  CatalogListParams,
  PaginationMeta,
  TyreDetail,
  TyreProfileSpec,
  TyreSummary,
  VehicleDetail,
  VehicleSummary,
  WheelDetail,
  WheelPricing,
  WheelSizeSpec,
  WheelSummary,
} from '@/types/catalog';

export type { VehicleRenderMetadata, WheelPosition } from '@/types/render-metadata';
