'use client';

import { useMemo } from 'react';
import type { TyreDetail, VehicleDetail, WheelDetail } from '@/types/catalog';
import { useTyre } from '@/features/catalog/hooks/use-tyre';
import { useVehicle } from '@/features/catalog/hooks/use-vehicle';
import { useWheel } from '@/features/catalog/hooks/use-wheel';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import type { DiagnosticsConfig } from '@/features/preview/engine/render-context';

export interface PreviewSelectionData {
  /** Resolved DTOs for the current selection (undefined = not selected/not loaded). */
  readonly vehicle: VehicleDetail | undefined;
  readonly wheel: WheelDetail | undefined;
  readonly tyre: TyreDetail | undefined;
  readonly colour: string | null;
  readonly wheelFinish: string | null;
  readonly wheelSizeId: string | null;
  readonly tyreProfileId: string | null;
  readonly diagnostics: DiagnosticsConfig;
  /** True while any selected entity's detail request is in flight. */
  readonly resolving: boolean;
  /** True when a selected entity's detail request failed (partial failure surface). */
  readonly hasError: boolean;
  refetchAll: () => void;
}

/**
 * The data-flow seam: Preview Store selections → React Query detail DTOs →
 * props for RendererProvider. React Query stays the only data source and the
 * store stays the only selection state; this hook is the single place they
 * meet, memoized so the expensive canvas subtree never re-renders needlessly.
 */
export function usePreviewSelection(): PreviewSelectionData {
  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const wheelId = usePreviewStore((state) => state.wheelId);
  const tyreId = usePreviewStore((state) => state.tyreId);
  const colour = usePreviewStore((state) => state.colour);
  const wheelFinish = usePreviewStore((state) => state.wheelFinish);
  const wheelSizeId = usePreviewStore((state) => state.wheelSizeId);
  const tyreProfileId = usePreviewStore((state) => state.tyreProfileId);
  const diagnostics = usePreviewStore((state) => state.rendererSettings.diagnostics);

  const vehicleQuery = useVehicle(vehicleId ?? undefined);
  const wheelQuery = useWheel(wheelId ?? undefined);
  const tyreQuery = useTyre(tyreId ?? undefined);

  const resolving =
    (vehicleId !== null && vehicleQuery.isPending) ||
    (wheelId !== null && wheelQuery.isPending) ||
    (tyreId !== null && tyreQuery.isPending);

  const hasError =
    (vehicleId !== null && vehicleQuery.isError) ||
    (wheelId !== null && wheelQuery.isError) ||
    (tyreId !== null && tyreQuery.isError);

  return useMemo(
    () => ({
      vehicle: vehicleQuery.data,
      wheel: wheelQuery.data,
      tyre: tyreQuery.data,
      colour,
      wheelFinish,
      wheelSizeId,
      tyreProfileId,
      diagnostics,
      resolving,
      hasError,
      refetchAll: () => {
        void vehicleQuery.refetch();
        void wheelQuery.refetch();
        void tyreQuery.refetch();
      },
    }),
    [
      vehicleQuery.data,
      wheelQuery.data,
      tyreQuery.data,
      colour,
      wheelFinish,
      wheelSizeId,
      tyreProfileId,
      diagnostics,
      resolving,
      hasError,
      // refetch functions are stable across renders (React Query guarantee).
      vehicleQuery.refetch,
      wheelQuery.refetch,
      tyreQuery.refetch,
    ],
  );
}
