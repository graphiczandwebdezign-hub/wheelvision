import type { WheelSizeSpec, WheelSummary } from '@/types/catalog';

/**
 * Wheel facet/filter domain — pure functions over wheel summaries and the
 * size specifications of a selected wheel detail. Covers the filter
 * dimensions brand, finish, diameter, width, offset and bolt pattern.
 */

export interface WheelFilters {
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly finish?: string | null;
  readonly query?: string;
}

export interface WheelSizeFilters {
  readonly diameterInches?: number | null;
  readonly widthInches?: number | null;
  readonly offsetMm?: number | null;
  readonly boltPattern?: string | null;
}

function distinctSorted(values: Array<string | number | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string | number => value != null).map(String)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function wheelBrands(wheels: readonly WheelSummary[]): string[] {
  return distinctSorted(wheels.map((wheel) => wheel.brand));
}

export function wheelModels(wheels: readonly WheelSummary[], brand: string | null): string[] {
  return distinctSorted(
    wheels.filter((wheel) => brand === null || wheel.brand === brand).map((wheel) => wheel.model),
  );
}

export function wheelFinishes(wheels: readonly WheelSummary[]): string[] {
  return distinctSorted(wheels.flatMap((wheel) => wheel.finishes));
}

export function matchesWheelQuery(wheel: WheelSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return `${wheel.brand} ${wheel.model} ${wheel.finishes.join(' ')}`.toLowerCase().includes(needle);
}

export function filterWheels(
  wheels: readonly WheelSummary[],
  filters: WheelFilters,
): WheelSummary[] {
  return wheels.filter(
    (wheel) =>
      (!filters.brand || wheel.brand === filters.brand) &&
      (!filters.model || wheel.model === filters.model) &&
      (!filters.finish || wheel.finishes.includes(filters.finish)) &&
      matchesWheelQuery(wheel, filters.query ?? ''),
  );
}

// ---------------------------------------------------------------------------
// Size specification facets (WheelDetail.sizes level)
// ---------------------------------------------------------------------------

export function sizeDiametersInches(sizes: readonly WheelSizeSpec[]): number[] {
  return [
    ...new Set(sizes.map((size) => size.diameterInches).filter((v): v is number => v !== null)),
  ].sort((a, b) => a - b);
}

export function sizeWidthsInches(sizes: readonly WheelSizeSpec[]): number[] {
  return [
    ...new Set(sizes.map((size) => size.widthInches).filter((v): v is number => v !== null)),
  ].sort((a, b) => a - b);
}

export function sizeOffsetsMm(sizes: readonly WheelSizeSpec[]): number[] {
  return [
    ...new Set(sizes.map((size) => size.offsetMm).filter((v): v is number => v !== null)),
  ].sort((a, b) => a - b);
}

export function sizeBoltPatterns(sizes: readonly WheelSizeSpec[]): string[] {
  return distinctSorted(sizes.map((size) => size.boltPattern));
}

export function filterWheelSizes(
  sizes: readonly WheelSizeSpec[],
  filters: WheelSizeFilters,
): WheelSizeSpec[] {
  return sizes.filter(
    (size) =>
      (filters.diameterInches == null || size.diameterInches === filters.diameterInches) &&
      (filters.widthInches == null || size.widthInches === filters.widthInches) &&
      (filters.offsetMm == null || size.offsetMm === filters.offsetMm) &&
      (!filters.boltPattern || size.boltPattern === filters.boltPattern),
  );
}

/**
 * Composed, human-readable size label: the catalog's own size string plus
 * whichever fitment facts exist. Never invents data — missing specs simply
 * leave their slot out.
 */
export function formatWheelSize(size: WheelSizeSpec): string {
  const parts: string[] = [];
  if (size.diameterInches !== null && size.widthInches !== null) {
    parts.push(`${size.diameterInches}×${size.widthInches}`);
  }
  if (size.boltPattern) {
    parts.push(size.boltPattern);
  }
  if (size.offsetMm !== null) {
    parts.push(`ET${size.offsetMm}`);
  }
  return parts.length > 0 ? `${size.size} — ${parts.join(' · ')}` : size.size;
}
