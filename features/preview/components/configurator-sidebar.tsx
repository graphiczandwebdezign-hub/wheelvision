'use client';

import { Accordion, Sidebar } from '@/components/ui';
import { useOnlineStatus } from '@/features/preview/hooks/use-online-status';
import { usePreviewStore } from '@/features/preview/state/preview-store';
import { ConfigurationSummary } from '@/features/preview/selection/configuration-summary';
import { TyreSelector } from '@/features/preview/selection/tyre-selector';
import { VehicleSelector } from '@/features/preview/selection/vehicle-selector';
import { WheelSelector } from '@/features/preview/selection/wheel-selector';
import { Badge } from '@/components/ui';

/**
 * The dealer configuration rail: accordion steps for vehicle → wheels →
 * tyres with completion badges mirroring store state, and the summary +
 * action footer pinned beneath. Tablet-first: sections size for thumbs.
 */
export function ConfiguratorSidebar() {
  const online = useOnlineStatus();
  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const wheelId = usePreviewStore((state) => state.wheelId);
  const tyreId = usePreviewStore((state) => state.tyreId);

  const completion = (done: boolean, label: string) => (
    <Badge tone={done ? 'success' : 'neutral'}>{done ? '✓' : label}</Badge>
  );

  return (
    <Sidebar title="Configure" footer={<ConfigurationSummary online={online} />}>
      <Accordion
        items={[
          {
            id: 'vehicle',
            title: 'Vehicle',
            meta: completion(vehicleId !== null, 'Step 1'),
            defaultOpen: true,
            // Colour chips live inside VehicleSelector's selected-vehicle
            // block — mounting them here too would duplicate every chip on
            // the page (identical accessible names).
            content: (
              <div className="pt-3">
                <VehicleSelector />
              </div>
            ),
          },
          {
            id: 'wheel',
            title: 'Wheels',
            meta: completion(wheelId !== null, 'Step 2'),
            defaultOpen: true,
            content: (
              <div className="pt-3">
                <WheelSelector />
              </div>
            ),
          },
          {
            id: 'tyre',
            title: 'Tyres',
            meta: completion(tyreId !== null, 'Step 3'),
            defaultOpen: true,
            content: (
              <div className="pt-3">
                <TyreSelector />
              </div>
            ),
          },
        ]}
      />
    </Sidebar>
  );
}
