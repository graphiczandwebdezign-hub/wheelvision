import type { PreviewSelectionData } from '@/features/preview/hooks/use-preview-selection';
import { formatTyreProfile } from '@/features/preview/selection/tyre-facets';
import { vehicleDisplayName } from '@/features/preview/selection/vehicle-facets';

export type ConfigurationRow = readonly [label: string, value: string | null];

/**
 * The resolved configuration rows, shared by the on-screen summary and the
 * print handout so both always present the same facts in the same order.
 * Values are `null` when that step is unselected (rendered as an em dash).
 */
export function buildConfigurationRows(
  selection: PreviewSelectionData,
): readonly ConfigurationRow[] {
  return [
    ['Vehicle', selection.vehicle ? vehicleDisplayName(selection.vehicle) : null],
    ['Colour', selection.colour],
    ['Wheel', selection.wheel ? `${selection.wheel.brand} ${selection.wheel.model}` : null],
    ['Finish', selection.wheelFinish],
    [
      'Size',
      selection.wheel?.sizes.find((size) => size.id === selection.wheelSizeId)?.size ?? null,
    ],
    ['Tyre', selection.tyre ? `${selection.tyre.brand} ${selection.tyre.pattern}` : null],
    [
      'Profile',
      (() => {
        const profile = selection.tyre?.profiles.find(
          (candidate) => candidate.id === selection.tyreProfileId,
        );
        return profile ? formatTyreProfile(profile) : null;
      })(),
    ],
  ];
}
