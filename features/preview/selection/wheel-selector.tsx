'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Combobox,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SearchBox,
  Select,
} from '@/components/ui';
import { useWheel } from '@/features/catalog/hooks/use-wheel';
import { useWheels } from '@/features/catalog/hooks/use-wheels';
import { useDebouncedValue } from '@/features/preview/hooks/use-debounced-value';
import {
  filterWheelSizes,
  filterWheels,
  formatWheelSize,
  sizeDiametersInches,
  sizeOffsetsMm,
  wheelBrands,
  wheelModels,
} from '@/features/preview/selection/wheel-facets';
import { usePreviewStore } from '@/features/preview/state/preview-store';

/**
 * Wheel step: SearchBox + Rim brand → Rim model cascade; a completed cascade
 * position naming exactly one wheel resolves it into the store. The selected
 * wheel's detail then unlocks the finish picker and the size select, which
 * the fitment filters (diameter, offset) narrow live. A stored size that
 * stops matching tightened filters is cleared — never left dangling.
 */
export function WheelSelector() {
  const wheelsQuery = useWheels({ page: 1, pageSize: 100 });
  const wheels = wheelsQuery.data?.data ?? [];

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [brand, setBrand] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [diameterFilter, setDiameterFilter] = useState<number | null>(null);
  const [offsetFilter, setOffsetFilter] = useState<number | null>(null);

  const wheelId = usePreviewStore((state) => state.wheelId);
  const wheelFinish = usePreviewStore((state) => state.wheelFinish);
  const wheelSizeId = usePreviewStore((state) => state.wheelSizeId);
  const selectWheel = usePreviewStore((state) => state.selectWheel);
  const selectWheelFinish = usePreviewStore((state) => state.selectWheelFinish);
  const selectWheelSize = usePreviewStore((state) => state.selectWheelSize);

  const filtered = filterWheels(wheels, { brand, model, query: debouncedQuery });
  const brands = wheelBrands(wheels);
  const models = wheelModels(wheels, brand);

  // Reflect a restored store selection into the cascade once the catalog loads.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || wheels.length === 0 || wheelId === null) {
      return;
    }
    const stored = wheels.find((wheel) => wheel.id === wheelId);
    if (!stored) {
      return;
    }
    hydratedRef.current = true;
    setBrand(stored.brand);
    setModel(stored.model);
  }, [wheels, wheelId]);

  // Cascade-complete resolution: brand + model naming exactly one wheel picks it.
  const cascadeComplete = brand !== null && model !== null;
  const cascadeMatchId = cascadeComplete && filtered.length === 1 ? filtered[0].id : null;
  useEffect(() => {
    if (cascadeMatchId !== null && cascadeMatchId !== wheelId) {
      selectWheel(cascadeMatchId);
    }
  }, [cascadeMatchId, wheelId, selectWheel]);

  const wheelQuery = useWheel(wheelId ?? undefined);
  const wheelDetail = wheelQuery.data ?? null;

  const sizeOptions = filterWheelSizes(wheelDetail?.sizes ?? [], {
    diameterInches: diameterFilter,
    offsetMm: offsetFilter,
  });

  // A stored size that no longer fits the tightened filters cannot linger.
  useEffect(() => {
    if (wheelId === null || wheelSizeId === null || wheelDetail === null) {
      return;
    }
    if (!sizeOptions.some((size) => size.id === wheelSizeId)) {
      selectWheelSize(null);
    }
  }, [wheelId, wheelSizeId, wheelDetail, sizeOptions, selectWheelSize]);

  if (wheelsQuery.isPending) {
    return <LoadingSkeleton lines={4} lineHeight="h-11" aria-label="Loading wheels" />;
  }

  if (wheelsQuery.isError) {
    return (
      <ErrorState
        title="Wheel catalog unavailable"
        description="The wheel catalog could not be loaded. Your configuration so far is kept."
        onRetry={() => void wheelsQuery.refetch()}
      />
    );
  }

  if (wheels.length === 0) {
    return (
      <EmptyState
        title="No wheels published yet"
        description="The tenant catalog is empty — publish wheel packages first, then configure."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchBox label="Search wheels" placeholder="TE37, Volk, bronze…" onSearch={setQuery} />
      <Combobox
        label="Rim brand"
        options={brands.map((option) => ({ value: option, label: option }))}
        value={brand}
        onChange={(next) => {
          setBrand(next);
          setModel(null);
        }}
        placeholder="All brands"
      />
      <Combobox
        label="Rim model"
        options={models.map((option) => ({ value: option, label: option }))}
        value={model}
        onChange={setModel}
        placeholder={brand ? 'All models' : 'Choose a brand first'}
        disabled={brand === null}
      />

      {filtered.length === 0 ? (
        <p role="status" className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
          No wheels match those filters — widen the search or clear the cascade.
        </p>
      ) : null}

      {wheelId !== null ? (
        wheelQuery.isPending ? (
          <p className="text-sm text-slate-500">Loading wheel details…</p>
        ) : wheelDetail ? (
          <>
            <Select
              label="Rim finish"
              options={wheelDetail.finishes.map((finish) => ({ value: finish, label: finish }))}
              value={wheelFinish ?? ''}
              placeholder="Any finish"
              onChange={(next) => selectWheelFinish(next)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Filter sizes by diameter"
                options={sizeDiametersInches(wheelDetail.sizes).map((diameter) => ({
                  value: String(diameter),
                  label: `${diameter}″`,
                }))}
                value={diameterFilter === null ? '' : String(diameterFilter)}
                placeholder="All diameters"
                onChange={(next) => setDiameterFilter(next === null ? null : Number(next))}
              />
              <Select
                label="Filter sizes by offset"
                options={sizeOffsetsMm(wheelDetail.sizes).map((offset) => ({
                  value: String(offset),
                  label: `ET${offset}`,
                }))}
                value={offsetFilter === null ? '' : String(offsetFilter)}
                placeholder="All offsets"
                onChange={(next) => setOffsetFilter(next === null ? null : Number(next))}
              />
            </div>
            <Select
              label="Rim size"
              options={sizeOptions.map((size) => ({
                value: size.id,
                label: formatWheelSize(size),
              }))}
              value={wheelSizeId ?? ''}
              placeholder="Choose a size"
              onChange={(next) => selectWheelSize(next)}
            />
            {sizeOptions.length === 0 ? (
              <p className="text-xs text-amber-400">
                No sizes fit the current diameter/offset filters for this wheel.
              </p>
            ) : null}
          </>
        ) : (
          <ErrorState
            title="Wheel details unavailable"
            description="The selected wheel could not be loaded."
            onRetry={() => void wheelQuery.refetch()}
          />
        )
      ) : null}
    </div>
  );
}
