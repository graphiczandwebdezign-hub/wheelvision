import type { VehicleRenderMetadata } from '@/types/render-metadata';

/**
 * Shared catalog API contracts. These types are the single source of truth
 * for what `/api/vehicles`, `/api/wheels` and `/api/tyres` return — used by
 * server services to shape DTOs and by the frontend data layer to consume
 * them. Timestamps are ISO-8601 strings on the wire.
 */

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiListEnvelope<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiDetailEnvelope<T> {
  success: true;
  data: T;
  meta: Record<string, never>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
  };
}

/** Query-string input accepted by list endpoints. */
export interface CatalogListParams {
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export interface VehicleSummary {
  id: string;
  manufacturer: string;
  model: string;
  variant: string;
  /** Model-year of the variant when known (drives the year selection step). */
  year: number | null;
  wheelDiameterMm: number;
  colours: string[];
  createdAt: string;
  updatedAt: string;
}

/** Vehicle detail carries everything the renderer needs (Chapter 6). */
export interface VehicleDetail extends VehicleSummary {
  renderMetadata: VehicleRenderMetadata | null;
}

// ---------------------------------------------------------------------------
// Wheels
// ---------------------------------------------------------------------------

export interface WheelSummary {
  id: string;
  brand: string;
  model: string;
  finishes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WheelSizeSpec {
  id: string;
  size: string;
  diameterInches: number | null;
  widthInches: number | null;
  boltPattern: string | null;
  offsetMm: number | null;
  centreBoreMm: number | null;
}

/**
 * Pricing contract reserved for the pricing/quote engine. Populated once
 * pricing lands; always `null` until then so clients can rely on the shape.
 */
export interface WheelPricing {
  amountCents: number;
  currency: string;
}

export interface WheelDetail extends WheelSummary {
  sizes: WheelSizeSpec[];
  boltPatterns: string[];
  offsetsMm: number[];
  centreBoresMm: number[];
  metadata: Record<string, unknown> | null;
  pricing: WheelPricing | null;
}

// ---------------------------------------------------------------------------
// Tyres
// ---------------------------------------------------------------------------

export interface TyreSummary {
  id: string;
  brand: string;
  /** Industry term for the tyre model name, e.g. "Pilot Sport 4". */
  pattern: string;
  profiles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TyreProfileSpec {
  id: string;
  profile: string;
  widthMm: number | null;
  aspectRatio: number | null;
  rimDiameterInches: number | null;
  construction: string | null;
  loadIndex: number | null;
  speedRating: string | null;
}

export interface TyreDetail extends Omit<TyreSummary, 'profiles'> {
  profiles: TyreProfileSpec[];
  metadata: Record<string, unknown> | null;
}
