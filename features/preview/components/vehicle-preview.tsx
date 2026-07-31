'use client';

import dynamic from 'next/dynamic';
import { Card, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';
import { vehicleDisplayName } from '@/features/preview/selection/vehicle-facets';
import { RendererProvider } from '@/features/preview/engine/renderer-provider';

/**
 * The preview canvas panel. Presentation only: the selection is resolved by
 * usePreviewSelection and passed into the (unmodified) rendering engine via
 * RendererProvider. All transitional states — nothing selected, catalog
 * loading, detail failure — render deliberate UI, never a blank panel.
 *
 * The Konva canvas loads client-side only (it needs the real DOM), so it is
 * dynamically imported; SSR shows its skeleton.
 */
const VehicleCanvas = dynamic(
  () => import('@/features/preview/engine/vehicle-canvas').then((module) => module.VehicleCanvas),
  { ssr: false, loading: () => <LoadingSkeleton lines={1} lineHeight="h-64" /> },
);

export function VehiclePreview() {
  const selection = usePreviewSelection();

  if (selection.vehicle === undefined) {
    if (selection.hasError) {
      return (
        <Card
          title="Preview"
          subtitle="We could not load this vehicle. Check the connection and try again."
        >
          <ErrorState
            title="Vehicle details unavailable"
            description="The configuration you already made is preserved."
            onRetry={selection.refetchAll}
          />
        </Card>
      );
    }
    return (
      <Card title="Preview" subtitle="Pick a vehicle from the configuration panel to see it here.">
        <EmptyState
          title="Nothing on the turntable yet"
          description="Choose a manufacturer, model and year — the vehicle appears instantly, ready for wheels and tyres."
        />
      </Card>
    );
  }

  return (
    <Card
      title={vehicleDisplayName(selection.vehicle)}
      subtitle={selection.colour ?? undefined}
      actions={
        selection.resolving ? (
          <span role="status" className="text-xs text-slate-400">
            Updating…
          </span>
        ) : undefined
      }
    >
      <RendererProvider
        vehicle={selection.vehicle}
        wheel={selection.wheel ?? null}
        tyre={selection.tyre ?? null}
        wheelFinish={selection.wheelFinish}
        selectedWheelSizeId={selection.wheelSizeId}
        selectedTyreProfileId={selection.tyreProfileId}
        diagnostics={selection.diagnostics}
      >
        <VehicleCanvas className="w-full" />
      </RendererProvider>
    </Card>
  );
}
