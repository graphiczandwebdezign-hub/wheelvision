'use client';

import { useEffect, useRef, useState } from 'react';
import { Combobox, EmptyState, ErrorState, LoadingSkeleton, SearchBox } from '@/components/ui';
import { useVehicles } from '@/features/catalog/hooks/use-vehicles';
import { useDebouncedValue } from '@/features/preview/hooks/use-debounced-value';
import { ColourSelector } from '@/features/preview/selection/colour-selector';
import {
  filterVehicles,
  vehicleDisplayName,
  vehicleManufacturers,
  vehicleModels,
  vehicleYears,
} from '@/features/preview/selection/vehicle-facets';
import { usePreviewStore } from '@/features/preview/state/preview-store';

/**
 * Vehicle step: SearchBox + Manufacturer → Model → Year → Variant cascade,
 * then vehicle colour chips. Every narrowing of the cascade that leaves
 * exactly one candidate resolves it into the preview store automatically
 * (single-model makes like Ford need no further input); ambiguous positions
 * offer the Variant combobox to break the tie explicitly.
 */
export function VehicleSelector() {
  const vehiclesQuery = useVehicles({ page: 1, pageSize: 100 });
  const vehicles = vehiclesQuery.data?.data ?? [];

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [manufacturer, setManufacturer] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [variant, setVariant] = useState<string | null>(null);

  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const selectVehicle = usePreviewStore((state) => state.selectVehicle);

  const cascade = filterVehicles(vehicles, { manufacturer, model, year });
  const filtered = filterVehicles(vehicles, {
    manufacturer,
    model,
    year,
    query: debouncedQuery,
  });
  const manufacturers = vehicleManufacturers(vehicles);
  const models = vehicleModels(vehicles, manufacturer);
  const years = vehicleYears(vehicles, manufacturer, model);
  const variants = [...new Set(cascade.map((vehicle) => vehicle.variant))].sort((a, b) =>
    a.localeCompare(b),
  );

  // Reflect a restored store selection into the cascade once the catalog loads.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || vehicles.length === 0 || vehicleId === null) {
      return;
    }
    const stored = vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (!stored) {
      return;
    }
    hydratedRef.current = true;
    setManufacturer(stored.manufacturer);
    setModel(stored.model);
    setYear(stored.year);
    setVariant(stored.variant);
  }, [vehicles, vehicleId]);

  // Auto-resolve: a cascade/search position naming exactly one vehicle picks it.
  const uniqueMatchId = filtered.length === 1 ? filtered[0].id : null;
  useEffect(() => {
    if (uniqueMatchId !== null && uniqueMatchId !== vehicleId) {
      selectVehicle(uniqueMatchId);
    }
  }, [uniqueMatchId, vehicleId, selectVehicle]);

  if (vehiclesQuery.isPending) {
    return <LoadingSkeleton lines={4} lineHeight="h-11" aria-label="Loading vehicles" />;
  }

  if (vehiclesQuery.isError) {
    return (
      <ErrorState
        title="Vehicle catalog unavailable"
        description="The vehicle catalog could not be loaded. Your configuration so far is kept."
        onRetry={() => void vehiclesQuery.refetch()}
      />
    );
  }

  if (vehicles.length === 0) {
    return (
      <EmptyState
        title="No vehicles published yet"
        description="The tenant catalog is empty — publish vehicle packages first, then configure."
      />
    );
  }

  const resolvedVehicle = vehicleId
    ? vehicles.find((vehicle) => vehicle.id === vehicleId)
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <SearchBox label="Search vehicles" placeholder="Hilux, bakkie, 2025…" onSearch={setQuery} />
      <Combobox
        label="Manufacturer"
        options={manufacturers.map((option) => ({ value: option, label: option }))}
        value={manufacturer}
        onChange={(next) => {
          setManufacturer(next);
          setModel(null);
          setYear(null);
          setVariant(null);
        }}
        placeholder="All manufacturers"
      />
      <Combobox
        label="Model"
        options={models.map((option) => ({ value: option, label: option }))}
        value={model}
        onChange={(next) => {
          setModel(next);
          setYear(null);
          setVariant(null);
        }}
        placeholder={manufacturer ? 'All models' : 'Choose a manufacturer first'}
        disabled={manufacturer === null}
      />
      <Combobox
        label="Year"
        options={years.map((option) => ({ value: String(option), label: String(option) }))}
        value={year === null ? null : String(year)}
        onChange={(next) => {
          setYear(next === null ? null : Number(next));
          setVariant(null);
        }}
        placeholder={model ? 'All years' : 'Choose a model first'}
        disabled={model === null}
      />
      <Combobox
        label="Variant"
        options={variants.map((option) => ({ value: option, label: option }))}
        value={variant}
        onChange={(next) => {
          setVariant(next);
          if (next !== null) {
            const matches = cascade.filter((vehicle) => vehicle.variant === next);
            if (matches.length === 1) {
              // Variant names a concrete vehicle — sync the cascade below it.
              setManufacturer(matches[0].manufacturer);
              setModel(matches[0].model);
              setYear(matches[0].year);
              selectVehicle(matches[0].id);
            }
          }
        }}
        placeholder="Any variant"
        disabled={manufacturer === null}
      />

      {filtered.length === 0 ? (
        <p role="status" className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
          No vehicles match the current filters — widen the search or clear a filter.
        </p>
      ) : null}

      {resolvedVehicle ? (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Selected vehicle:{' '}
            <span className="text-slate-200">{vehicleDisplayName(resolvedVehicle)}</span>
          </p>
          <ColourSelector />
        </div>
      ) : null}
    </div>
  );
}
