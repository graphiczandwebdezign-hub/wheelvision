import { deepFreeze } from '@/lib/deep-freeze';
import type {
  QuoteCustomerDto,
  QuoteDealerDto,
  QuoteDetail,
  QuoteSnapshotPayload,
  QuoteStatus,
  QuoteTotalsDto,
  SnapshotTyre,
  SnapshotVehicle,
  SnapshotWheel,
} from '@/types/quote';
import type { CreateQuoteInput } from '@/server/validators/quote-schemas';
import type { QuoteLineRecord, QuoteRecord } from '@/server/repositories/quote-repository';
import type { TyreDetail, VehicleDetail, WheelDetail } from '@/types/catalog';
import { decimalToCents } from '@/server/quote/money';

/**
 * QuoteBuilder — assembles the immutable snapshot payload and the API DTO.
 * The snapshot carries everything needed to reproduce the quoted offer
 * forever: the priced entities as they were, the configuration, the
 * pricing computation, the parties, render metadata and asset references.
 * Once built it is deep-frozen so no later code path can mutate it —
 * price changes afterwards can never retroactively alter a quote.
 */

export function toSnapshotVehicle(vehicle: VehicleDetail): SnapshotVehicle {
  return {
    id: vehicle.id,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    colours: vehicle.colours,
    renderMetadata: vehicle.renderMetadata,
  };
}

export function toSnapshotWheel(
  wheel: WheelDetail,
  finish: string | null,
  sizeId: string | null,
): SnapshotWheel {
  const size = wheel.sizes.find((candidate) => candidate.id === sizeId) ?? null;
  return {
    id: wheel.id,
    brand: wheel.brand,
    model: wheel.model,
    finish,
    size: size === null ? null : { ...size },
  };
}

export function toSnapshotTyre(tyre: TyreDetail, profileId: string | null): SnapshotTyre {
  const profile = tyre.profiles.find((candidate) => candidate.id === profileId) ?? null;
  return {
    id: tyre.id,
    brand: tyre.brand,
    pattern: tyre.pattern,
    profile: profile === null ? null : { ...profile },
  };
}

/** Asset references worth preserving (body/mask/shadow imagery, if present). */
export function collectAssetReferences(vehicle: SnapshotVehicle): readonly string[] {
  const metadata = vehicle.renderMetadata;
  if (metadata === null) {
    return [];
  }
  return [metadata.bodyImage, metadata.maskImage, metadata.shadowImage].filter(
    (reference): reference is string => typeof reference === 'string' && reference.length > 0,
  );
}

export interface SnapshotAssemblyInput {
  readonly quoteNumber: string;
  readonly issuedAt: Date;
  readonly validUntil: Date;
  readonly dealer: QuoteDealerDto;
  readonly input: CreateQuoteInput;
  readonly customer: QuoteCustomerDto;
  readonly vehicle: VehicleDetail;
  readonly wheel: WheelDetail;
  readonly tyre: TyreDetail;
  readonly pricing: QuoteSnapshotPayload['pricing'];
}

/** Boundary input keeps fields `nullish`; the snapshot persists the full shape. */
export function toSnapshotConfiguration(
  configuration: SnapshotAssemblyInput['input']['configuration'],
): QuoteSnapshotPayload['configuration'] {
  return {
    vehicleId: configuration.vehicleId ?? null,
    colour: configuration.colour ?? null,
    wheelId: configuration.wheelId ?? null,
    wheelFinish: configuration.wheelFinish ?? null,
    wheelSizeId: configuration.wheelSizeId ?? null,
    tyreId: configuration.tyreId ?? null,
    tyreProfileId: configuration.tyreProfileId ?? null,
  };
}

export function buildSnapshotPayload(assembly: SnapshotAssemblyInput): QuoteSnapshotPayload {
  const vehicle = toSnapshotVehicle(assembly.vehicle);
  const configuration = toSnapshotConfiguration(assembly.input.configuration);
  return deepFreeze<QuoteSnapshotPayload>({
    version: 1,
    quoteNumber: assembly.quoteNumber,
    issuedAt: assembly.issuedAt.toISOString(),
    validUntil: assembly.validUntil.toISOString(),
    dealer: { ...assembly.dealer },
    customer: { ...assembly.customer },
    consultant: assembly.input.consultantName ? { name: assembly.input.consultantName } : null,
    configuration,
    vehicle,
    colour: configuration.colour,
    wheel: toSnapshotWheel(assembly.wheel, configuration.wheelFinish, configuration.wheelSizeId),
    tyre: toSnapshotTyre(assembly.tyre, configuration.tyreProfileId),
    assetReferences: collectAssetReferences(vehicle),
    pricing: deepFreeze(structuredClone(assembly.pricing)),
  });
}

/** Record row → immutable API DTO. */
export function buildQuoteDetail(record: QuoteRecord): QuoteDetail {
  const lines = record.lines.map((line: QuoteLineRecord) => ({
    id: line.id,
    category: line.category as QuoteDetail['lines'][number]['category'],
    description: line.description,
    quantity: line.quantity,
    unitAmountCents: line.unitAmountCents,
    totalCents: line.totalCents,
    sortOrder: line.sortOrder,
    metadata: (line.metadata as Record<string, unknown> | null) ?? null,
  }));

  const totalCents =
    record.subtotalCents === null || record.vatCents === null || record.discountCents === null
      ? decimalToCents(record.totalAmount)
      : record.subtotalCents - record.discountCents + record.vatCents;

  const totals: QuoteTotalsDto = {
    subtotalCents: record.subtotalCents ?? totalCents,
    discountCents: record.discountCents ?? 0,
    vatBasisPoints: record.vatBasisPoints ?? 0,
    vatCents: record.vatCents ?? 0,
    totalCents,
    currency: record.currency,
  };

  return deepFreeze<QuoteDetail>({
    id: record.id,
    quoteNumber: record.quoteNumber ?? '',
    status: record.status as QuoteStatus,
    customerName: record.customer.name,
    totalCents,
    currency: record.currency,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    validUntil: (record.validUntil ?? record.createdAt).toISOString(),
    archivedAt: record.archivedAt === null ? null : record.archivedAt.toISOString(),
    customer: { ...record.customer },
    consultantName: record.consultantName,
    dealer: { id: record.tenant.id, name: record.tenant.name, slug: record.tenant.slug },
    totals,
    lines,
    snapshot: (record.snapshot?.payload as QuoteDetail['snapshot']) ?? null,
  });
}
