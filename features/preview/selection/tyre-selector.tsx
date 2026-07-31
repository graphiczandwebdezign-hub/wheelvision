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
import { useTyre } from '@/features/catalog/hooks/use-tyre';
import { useTyres } from '@/features/catalog/hooks/use-tyres';
import { useDebouncedValue } from '@/features/preview/hooks/use-debounced-value';
import {
  filterTyres,
  formatTyreProfile,
  profileAspectRatios,
  profileRimDiametersInches,
  profileWidthsMm,
  resolveTyreProfile,
  tyreBrands,
  tyrePatterns,
} from '@/features/preview/selection/tyre-facets';
import { usePreviewStore } from '@/features/preview/state/preview-store';

/**
 * Tyre step: SearchBox + Tyre brand → Tyre pattern cascade resolving the
 * tyre, then the Width → Profile → Diameter dimension cascade resolving the
 * exact TyreProfileSpec the renderer prices and draws. Changing an upstream
 * dimension resets the downstream steps and clears a resolved profile —
 * the store never points at a profile the cascade no longer names.
 */
export function TyreSelector() {
  const tyresQuery = useTyres({ page: 1, pageSize: 100 });
  const tyres = tyresQuery.data?.data ?? [];

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [brand, setBrand] = useState<string | null>(null);
  const [pattern, setPattern] = useState<string | null>(null);

  const tyreId = usePreviewStore((state) => state.tyreId);
  const tyreProfileId = usePreviewStore((state) => state.tyreProfileId);
  const selectTyre = usePreviewStore((state) => state.selectTyre);
  const selectTyreProfile = usePreviewStore((state) => state.selectTyreProfile);

  const [width, setWidth] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [diameter, setDiameter] = useState<number | null>(null);

  const filtered = filterTyres(tyres, { brand, pattern, query: debouncedQuery });
  const brands = tyreBrands(tyres);
  const patterns = tyrePatterns(tyres, brand);

  // Reflect a restored store selection into the cascade once the catalog loads.
  const cascadeHydratedRef = useRef(false);
  useEffect(() => {
    if (cascadeHydratedRef.current || tyres.length === 0 || tyreId === null) {
      return;
    }
    const stored = tyres.find((tyre) => tyre.id === tyreId);
    if (!stored) {
      return;
    }
    cascadeHydratedRef.current = true;
    setBrand(stored.brand);
    setPattern(stored.pattern);
  }, [tyres, tyreId]);

  // Cascade-complete resolution: brand + pattern naming exactly one tyre picks it.
  const cascadeComplete = brand !== null && pattern !== null;
  const cascadeMatchId = cascadeComplete && filtered.length === 1 ? filtered[0].id : null;
  useEffect(() => {
    if (cascadeMatchId !== null && cascadeMatchId !== tyreId) {
      selectTyre(cascadeMatchId);
    }
  }, [cascadeMatchId, tyreId, selectTyre]);

  const tyreQuery = useTyre(tyreId ?? undefined);
  const profiles = tyreQuery.data?.profiles ?? [];

  // Reflect a restored store profile into the dimension cascade once detail loads.
  const dimensionsHydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (tyreId === null || tyreProfileId === null || profiles.length === 0) {
      return;
    }
    const hydrationKey = `${tyreId}:${tyreProfileId}`;
    if (dimensionsHydratedRef.current === hydrationKey) {
      return;
    }
    const stored = profiles.find((profile) => profile.id === tyreProfileId);
    if (!stored) {
      return;
    }
    dimensionsHydratedRef.current = hydrationKey;
    setWidth(stored.widthMm);
    setAspectRatio(stored.aspectRatio);
    setDiameter(stored.rimDiameterInches);
  }, [tyreId, tyreProfileId, profiles]);

  // Dimension resolution: a completed cascade names exactly one profile.
  const dimensions = { widthMm: width, aspectRatio, rimDiameterInches: diameter };
  const resolvedProfile =
    width !== null && aspectRatio !== null && diameter !== null
      ? resolveTyreProfile(profiles, dimensions)
      : undefined;
  useEffect(() => {
    if (resolvedProfile !== undefined && resolvedProfile.id !== tyreProfileId) {
      selectTyreProfile(resolvedProfile.id);
    }
  }, [resolvedProfile, tyreProfileId, selectTyreProfile]);

  const resetDownstream = (level: 'width' | 'aspect') => {
    if (level === 'width') {
      setAspectRatio(null);
    }
    setDiameter(null);
    if (tyreProfileId !== null) {
      selectTyreProfile(null);
    }
  };

  if (tyresQuery.isPending) {
    return <LoadingSkeleton lines={4} lineHeight="h-11" aria-label="Loading tyres" />;
  }

  if (tyresQuery.isError) {
    return (
      <ErrorState
        title="Tyre catalog unavailable"
        description="The tyre catalog could not be loaded. Your configuration so far is kept."
        onRetry={() => void tyresQuery.refetch()}
      />
    );
  }

  if (tyres.length === 0) {
    return (
      <EmptyState
        title="No tyres published yet"
        description="The tenant catalog is empty — publish tyre ranges first, then configure."
      />
    );
  }

  const selectedProfile = tyreProfileId
    ? (profiles.find((profile) => profile.id === tyreProfileId) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        label="Search tyres"
        placeholder="Michelin, all-terrain, 265…"
        onSearch={setQuery}
      />
      <Combobox
        label="Tyre brand"
        options={brands.map((option) => ({ value: option, label: option }))}
        value={brand}
        onChange={(next) => {
          setBrand(next);
          setPattern(null);
        }}
        placeholder="All brands"
      />
      <Combobox
        label="Tyre pattern"
        options={patterns.map((option) => ({ value: option, label: option }))}
        value={pattern}
        onChange={setPattern}
        placeholder={brand ? 'All patterns' : 'Choose a brand first'}
        disabled={brand === null}
      />

      {filtered.length === 0 ? (
        <p role="status" className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
          No tyres match those filters — widen the search or clear the cascade.
        </p>
      ) : null}

      {tyreId !== null ? (
        tyreQuery.isPending ? (
          <p className="text-sm text-slate-500">Loading tyre details…</p>
        ) : tyreQuery.data ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label="Width"
                options={profileWidthsMm(profiles).map((option) => ({
                  value: String(option),
                  label: String(option),
                }))}
                value={width === null ? '' : String(width)}
                placeholder="Any width"
                onChange={(next) => {
                  setWidth(next === null ? null : Number(next));
                  resetDownstream('width');
                }}
              />
              <Select
                label="Profile"
                options={profileAspectRatios(profiles, width).map((option) => ({
                  value: String(option),
                  label: String(option),
                }))}
                value={aspectRatio === null ? '' : String(aspectRatio)}
                placeholder="Any profile"
                onChange={(next) => {
                  setAspectRatio(next === null ? null : Number(next));
                  resetDownstream('aspect');
                }}
              />
              <Select
                label="Diameter"
                options={profileRimDiametersInches(profiles, {
                  widthMm: width,
                  aspectRatio,
                }).map((option) => ({
                  value: String(option),
                  label: `${option}″`,
                }))}
                value={diameter === null ? '' : String(diameter)}
                placeholder="Any diameter"
                onChange={(next) => {
                  setDiameter(next === null ? null : Number(next));
                  if (tyreProfileId !== null) {
                    selectTyreProfile(null);
                  }
                }}
              />
            </div>
            {selectedProfile ? (
              <p role="status" className="text-xs text-slate-400">
                Selected profile:{' '}
                <span className="font-medium text-slate-200">
                  {formatTyreProfile(selectedProfile)}
                </span>
              </p>
            ) : null}
          </>
        ) : (
          <ErrorState
            title="Tyre details unavailable"
            description="The selected tyre could not be loaded."
            onRetry={() => void tyreQuery.refetch()}
          />
        )
      ) : null}
    </div>
  );
}
