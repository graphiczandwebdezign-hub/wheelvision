import type { VehicleSummary } from '@/types/catalog';

/**
 * Vehicle facet/filter domain — pure functions over the vehicle summaries the
 * catalog API serves. No fetching, no state: given the loaded catalog page,
 * derive the cascading Manufacturer → Model → Year options and apply the
 * search/filter dimensions (manufacturer, model, year, colour, free text).
 */

export interface VehicleFilters {
  readonly manufacturer?: string | null;
  readonly model?: string | null;
  readonly year?: number | null;
  readonly colour?: string | null;
  readonly query?: string;
}

function distinctSorted(values: Array<string | number | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string | number => value != null).map(String)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function vehicleManufacturers(vehicles: readonly VehicleSummary[]): string[] {
  return distinctSorted(vehicles.map((vehicle) => vehicle.manufacturer));
}

export function vehicleModels(
  vehicles: readonly VehicleSummary[],
  manufacturer: string | null,
): string[] {
  return distinctSorted(
    vehicles
      .filter((vehicle) => manufacturer === null || vehicle.manufacturer === manufacturer)
      .map((vehicle) => vehicle.model),
  );
}

export function vehicleYears(
  vehicles: readonly VehicleSummary[],
  manufacturer: string | null,
  model: string | null,
): number[] {
  return [
    ...new Set(
      vehicles
        .filter(
          (vehicle) =>
            (manufacturer === null || vehicle.manufacturer === manufacturer) &&
            (model === null || vehicle.model === model) &&
            vehicle.year !== null,
        )
        .map((vehicle) => vehicle.year as number),
    ),
  ].sort((a, b) => b - a);
}

export function vehicleColours(vehicles: readonly VehicleSummary[]): string[] {
  return distinctSorted(vehicles.flatMap((vehicle) => vehicle.colours));
}

/** Free-text search across everything a dealer would type. */
export function matchesVehicleQuery(vehicle: VehicleSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  const haystack = [vehicle.manufacturer, vehicle.model, vehicle.variant, vehicle.year]
    .filter((part) => part !== null)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterVehicles(
  vehicles: readonly VehicleSummary[],
  filters: VehicleFilters,
): VehicleSummary[] {
  return vehicles.filter(
    (vehicle) =>
      (!filters.manufacturer || vehicle.manufacturer === filters.manufacturer) &&
      (!filters.model || vehicle.model === filters.model) &&
      (filters.year == null || vehicle.year === filters.year) &&
      (!filters.colour || vehicle.colours.includes(filters.colour)) &&
      matchesVehicleQuery(vehicle, filters.query ?? ''),
  );
}

/**
 * Resolves the cascade to the single vehicle the dealer means: the first
 * match for manufacturer(+model+year). Returns undefined when the cascade is
 * incomplete or matches nothing.
 */
export function resolveVehicle(
  vehicles: readonly VehicleSummary[],
  manufacturer: string | null,
  model: string | null,
  year: number | null,
): VehicleSummary | undefined {
  if (!manufacturer) {
    return undefined;
  }
  const matches = filterVehicles(vehicles, { manufacturer, model, year });
  return matches.length === 1 ? matches[0] : undefined;
}

/** Display name shared by the toolbar, canvas card and configuration summary. */
export function vehicleDisplayName(vehicle: VehicleSummary): string {
  return [vehicle.year, vehicle.manufacturer, vehicle.model, vehicle.variant]
    .filter((part) => part !== null)
    .join(' ');
}
