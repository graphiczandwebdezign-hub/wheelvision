'use client';

import { useEffect, useRef } from 'react';
import { Badge, ToastViewport, Toolbar, toast, useToastStore } from '@/components/ui';
import { useOnlineStatus } from '@/features/preview/hooks/use-online-status';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { ConfiguratorSidebar } from '@/features/preview/components/configurator-sidebar';
import { VehiclePreview } from '@/features/preview/components/vehicle-preview';
import { vehicleDisplayName } from '@/features/preview/selection/vehicle-facets';
import { usePreviewSelection } from '@/features/preview/hooks/use-preview-selection';

/**
 * The dealer preview experience: toolbar, canvas and configuration rail in
 * one responsive composition. Tablet is the primary target — the rail sits
 * beside the canvas on landscape widths and stacks beneath it in portrait,
 * always reachable and never covering the vehicle.
 *
 * Connectivity is surfaced, never fatal: selections live in the store, so an
 * offline dealer keeps configuring and React Query resumes on its own.
 */
export function PreviewExperience() {
  const online = useOnlineStatus();
  const selection = usePreviewSelection();
  const vehicleLabel = usePreviewStore((state) => state.vehicleId);
  const offlineToastId = useRef<number | null>(null);

  // One pinned toast per offline period; replaced with a confirmation on return.
  useEffect(() => {
    if (!online && offlineToastId.current === null) {
      offlineToastId.current = toast({
        kind: 'warning',
        message: 'Connection lost — your configuration is preserved.',
        durationMs: null,
      });
    } else if (online && offlineToastId.current !== null) {
      useToastStore.getState().dismiss(offlineToastId.current);
      offlineToastId.current = null;
      toast({ kind: 'success', message: 'Back online.' });
    }
    return undefined;
  }, [online]);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-slate-950 p-4 text-slate-100 lg:p-6">
      <Toolbar
        label="Preview toolbar"
        start={
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-semibold tracking-tight">WheelVision</span>
            <span className="hidden text-xs uppercase tracking-[0.3em] text-cyan-400 sm:inline">
              Dealer preview
            </span>
          </div>
        }
        center={
          selection.vehicle ? (
            <span className="truncate text-sm text-slate-300">
              {vehicleDisplayName(selection.vehicle)}
            </span>
          ) : null
        }
        end={
          <div className="flex items-center gap-2">
            {vehicleLabel ? <Badge tone="success">Configuring</Badge> : <Badge>Ready</Badge>}
            {online ? (
              <Badge tone="success">Online</Badge>
            ) : (
              <Badge tone="warning">Offline — changes preserved</Badge>
            )}
          </div>
        }
      />
      <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <VehiclePreview />
        <ConfiguratorSidebar />
      </div>
      <ToastViewport />
    </div>
  );
}
