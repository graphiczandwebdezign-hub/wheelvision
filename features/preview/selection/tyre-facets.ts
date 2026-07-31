import type { TyreProfileSpec, TyreSummary } from '@/types/catalog';

/**
 * Tyre facet/filter domain — pure functions over tyre summaries and the
 * decomposed profile specifications of a selected tyre detail. Covers brand,
 * pattern, width, aspect ratio (profile) and rim diameter — the cascade the
 * renderer's tyre physics resolves from.
 */

export interface TyreFilters {
  readonly brand?: string | null;
  readonly pattern?: string | null;
  readonly query?: string;
}

export interface TyreProfileDimensions {
  readonly widthMm?: number | null;
  readonly aspectRatio?: number | null;
  readonly rimDiameterInches?: number | null;
}

export function tyreBrands(tyres: readonly TyreSummary[]): string[] {
  return [...new Set(tyres.map((tyre) => tyre.brand))].sort((a, b) => a.localeCompare(b));
}

export function tyrePatterns(tyres: readonly TyreSummary[], brand: string | null): string[] {
  return [
    ...new Set(
      tyres.filter((tyre) => brand === null || tyre.brand === brand).map((tyre) => tyre.pattern),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function matchesTyreQuery(tyre: TyreSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return `${tyre.brand} ${tyre.pattern} ${tyre.profiles.join(' ')}`.toLowerCase().includes(needle);
}

export function filterTyres(tyres: readonly TyreSummary[], filters: TyreFilters): TyreSummary[] {
  return tyres.filter(
    (tyre) =>
      (!filters.brand || tyre.brand === filters.brand) &&
      (!filters.pattern || tyre.pattern === filters.pattern) &&
      matchesTyreQuery(tyre, filters.query ?? ''),
  );
}

// ---------------------------------------------------------------------------
// Profile facets (TyreDetail.profiles level) — the Width → Profile → Diameter
// cascade. Each level only offers values consistent with the levels above.
// ---------------------------------------------------------------------------

function distinctNumbers(values: Array<number | null>): number[] {
  return [...new Set(values.filter((value): value is number => value !== null))].sort(
    (a, b) => a - b,
  );
}

export function profileWidthsMm(profiles: readonly TyreProfileSpec[]): number[] {
  return distinctNumbers(profiles.map((profile) => profile.widthMm));
}

export function profileAspectRatios(
  profiles: readonly TyreProfileSpec[],
  widthMm: number | null,
): number[] {
  return distinctNumbers(
    profiles
      .filter((profile) => widthMm === null || profile.widthMm === widthMm)
      .map((profile) => profile.aspectRatio),
  );
}

export function profileRimDiametersInches(
  profiles: readonly TyreProfileSpec[],
  dimensions: TyreProfileDimensions,
): number[] {
  return distinctNumbers(
    profiles
      .filter(
        (profile) =>
          (dimensions.widthMm == null || profile.widthMm === dimensions.widthMm) &&
          (dimensions.aspectRatio == null || profile.aspectRatio === dimensions.aspectRatio),
      )
      .map((profile) => profile.rimDiameterInches),
  );
}

export function filterTyreProfiles(
  profiles: readonly TyreProfileSpec[],
  dimensions: TyreProfileDimensions,
): TyreProfileSpec[] {
  return profiles.filter(
    (profile) =>
      (dimensions.widthMm == null || profile.widthMm === dimensions.widthMm) &&
      (dimensions.aspectRatio == null || profile.aspectRatio === dimensions.aspectRatio) &&
      (dimensions.rimDiameterInches == null ||
        profile.rimDiameterInches === dimensions.rimDiameterInches),
  );
}

/**
 * Resolves the completed dimension cascade to the single profile it names.
 * Returns undefined while the cascade is incomplete or ambiguous — the
 * renderer keeps the stock look until a profile is fully resolved.
 */
export function resolveTyreProfile(
  profiles: readonly TyreProfileSpec[],
  dimensions: TyreProfileDimensions,
): TyreProfileSpec | undefined {
  if (
    dimensions.widthMm == null ||
    dimensions.aspectRatio == null ||
    dimensions.rimDiameterInches == null
  ) {
    return undefined;
  }
  const matches = filterTyreProfiles(profiles, dimensions);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Short industry label, e.g. "265/65 R17". */
export function formatTyreProfile(profile: TyreProfileSpec): string {
  const parts: string[] = [];
  if (profile.widthMm !== null && profile.aspectRatio !== null) {
    parts.push(`${profile.widthMm}/${profile.aspectRatio}`);
  }
  if (profile.rimDiameterInches !== null) {
    parts.push(`R${profile.rimDiameterInches}`);
  }
  return parts.length > 0 ? parts.join(' ') : profile.profile;
}
