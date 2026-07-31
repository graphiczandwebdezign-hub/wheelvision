/**
 * Quote API contracts — the single source of truth for `/api/quotes*`,
 * shared by server services (shaping DTOs) and the frontend data layer
 * (consuming them). Money travels as integer cents plus an ISO-4217
 * currency code; formatting is a presentation concern only.
 */

import type { PreviewSelection } from '@/features/preview/state/preview-store';
import type { VehicleRenderMetadata } from '@/types/render-metadata';

// ---------------------------------------------------------------------------
// Enums (string unions; persisted as text, validated by zod at the boundary)
// ---------------------------------------------------------------------------

export type QuoteStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type QuoteLineCategory = 'WHEEL' | 'TYRE' | 'ACCESSORY' | 'PACKAGE' | 'LABOUR';

export type PriceListKind = 'RETAIL' | 'WHOLESALE' | 'DEALER';

export type PriceRuleCategory = 'WHEEL' | 'TYRE' | 'LABOUR' | 'ACCESSORY' | 'PACKAGE';

export type AdjustmentKind = 'PERCENT' | 'FIXED';

// ---------------------------------------------------------------------------
// Quote lines & totals
// ---------------------------------------------------------------------------

export interface QuoteLineDto {
  readonly id: string;
  readonly category: QuoteLineCategory;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountCents: number;
  readonly totalCents: number;
  readonly sortOrder: number;
  readonly metadata: Record<string, unknown> | null;
}

export interface QuoteTotalsDto {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly vatBasisPoints: number;
  readonly vatCents: number;
  readonly totalCents: number;
  readonly currency: string;
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

export interface QuoteCustomerDto {
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
}

export interface QuoteDealerDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

// ---------------------------------------------------------------------------
// Immutable snapshot payload (QuoteSnapshot.payload, version 1)
// ---------------------------------------------------------------------------

export interface SnapshotVehicle {
  readonly id: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly variant: string;
  readonly year: number | null;
  readonly colours: readonly string[];
  readonly renderMetadata: VehicleRenderMetadata | null;
}

export interface SnapshotWheel {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly finish: string | null;
  readonly size: {
    readonly id: string;
    readonly size: string;
    readonly diameterInches: number | null;
    readonly widthInches: number | null;
    readonly boltPattern: string | null;
    readonly offsetMm: number | null;
    readonly centreBoreMm: number | null;
  } | null;
}

export interface SnapshotTyre {
  readonly id: string;
  readonly brand: string;
  readonly pattern: string;
  readonly profile: {
    readonly id: string;
    readonly profile: string;
    readonly widthMm: number | null;
    readonly aspectRatio: number | null;
    readonly rimDiameterInches: number | null;
    readonly construction: string | null;
    readonly loadIndex: number | null;
    readonly speedRating: string | null;
  } | null;
}

export interface SnapshotPricing {
  readonly priceList: {
    readonly id: string;
    readonly name: string;
    readonly kind: PriceListKind;
    readonly currency: string;
  };
  readonly lines: readonly QuoteLineDto[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly discountsApplied: readonly { name: string; amountCents: number }[];
  readonly tax: {
    readonly strategy: string;
    readonly name: string;
    readonly rateBasisPoints: number;
    readonly vatCents: number;
  };
  readonly totalCents: number;
  readonly currency: string;
}

/**
 * Everything required to reproduce the quoted offer forever, independent of
 * later catalogue or price changes.
 */
export interface QuoteSnapshotPayload {
  readonly version: 1;
  readonly quoteNumber: string;
  readonly issuedAt: string;
  readonly validUntil: string;
  readonly dealer: QuoteDealerDto;
  readonly customer: QuoteCustomerDto;
  readonly consultant: { readonly name: string } | null;
  readonly configuration: PreviewSelection;
  readonly vehicle: SnapshotVehicle;
  readonly colour: string | null;
  readonly wheel: SnapshotWheel;
  readonly tyre: SnapshotTyre;
  readonly assetReferences: readonly string[];
  readonly pricing: SnapshotPricing;
}

// ---------------------------------------------------------------------------
// API DTOs
// ---------------------------------------------------------------------------

export interface QuoteSummary {
  readonly id: string;
  readonly quoteNumber: string;
  readonly status: QuoteStatus;
  readonly customerName: string;
  readonly totalCents: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly validUntil: string;
}

export interface QuoteDetail extends QuoteSummary {
  readonly customer: QuoteCustomerDto;
  readonly consultantName: string | null;
  readonly dealer: QuoteDealerDto;
  readonly totals: QuoteTotalsDto;
  readonly lines: readonly QuoteLineDto[];
  readonly archivedAt: string | null;
  readonly updatedAt: string;
  readonly snapshot: QuoteSnapshotPayload | null;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface QuoteStatusHistoryDto {
  readonly id: string;
  readonly fromStatus: QuoteStatus | null;
  readonly toStatus: QuoteStatus;
  readonly actorName: string | null;
  readonly createdAt: string;
}

export interface QuoteStatusDetail {
  readonly quoteNumber: string;
  readonly status: QuoteStatus;
  readonly validUntil: string;
  readonly isExpired: boolean;
  readonly canBeAccepted: boolean;
  readonly history: readonly QuoteStatusHistoryDto[];
}

export interface CreateQuoteRequest {
  readonly configuration: PreviewSelection;
  readonly customer: {
    readonly name: string;
    readonly email?: string | null;
    readonly phone?: string | null;
  };
  readonly consultantName?: string | null;
}

export interface UpdateQuoteStatusRequest {
  readonly status: QuoteStatus;
  readonly actorName?: string | null;
}
