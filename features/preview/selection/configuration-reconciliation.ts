import type { TyreDetail, VehicleDetail, WheelDetail } from '@/types/catalog';
import type { PreviewSelection } from '@/features/preview/state/preview-store';

/**
 * Configuration reconciliation — pure validation of a restored selection
 * (saved-configuration recall, shared `?config=` link, or a browser-restored
 * persisted selection) against the live catalog DTOs.
 *
 * The catalog evolves: vehicles are superseded, wheels discontinued, finishes
 * and sizes delisted. A stale id must never crash the kiosk or silently show
 * a phantom configuration — this module computes the deterministic correction
 * plus consultant-readable notices explaining exactly what was adjusted.
 *
 * Definitive evidence only: corrections happen when a detail DTO is loaded
 * (its arrays are the truth) or when the detail request returned a 404
 * (`missing`). Pending requests and transient errors (offline, 5xx) yield no
 * correction — the selection is preserved and re-evaluated on the next pass.
 */

export type ReconciliationField =
  'vehicle' | 'colour' | 'wheel' | 'wheelFinish' | 'wheelSize' | 'tyre' | 'tyreProfile';

export interface ReconciliationNotice {
  readonly field: ReconciliationField;
  /** Consultant-readable explanation of a single adjustment. */
  readonly message: string;
}

export interface MissingEntities {
  /** True only on a definitive 404 from the detail endpoint. */
  readonly vehicle: boolean;
  readonly wheel: boolean;
  readonly tyre: boolean;
}

export interface ReconciliationInput {
  readonly selection: PreviewSelection;
  /** Resolved detail DTOs (undefined while pending or after a transient error). */
  readonly vehicle?: VehicleDetail;
  readonly wheel?: WheelDetail;
  readonly tyre?: TyreDetail;
  readonly missing: MissingEntities;
}

export interface ReconciliationResult {
  readonly corrected: PreviewSelection;
  readonly notices: readonly ReconciliationNotice[];
  /** True when `corrected` differs from the input selection. */
  readonly changed: boolean;
}

export const MISSING_NONE: MissingEntities = { vehicle: false, wheel: false, tyre: false };

/** Working copy of the selection while corrections are computed. */
type MutablePreviewSelection = { -readonly [K in keyof PreviewSelection]: PreviewSelection[K] };

/**
 * Stable string form of a selection — used to detect whether the dealer (or
 * any other store write) has moved on from a corrected selection, which is
 * what retires the inline adjustment notice.
 */
export function selectionSignature(selection: PreviewSelection): string {
  return [
    selection.vehicleId,
    selection.colour,
    selection.wheelId,
    selection.wheelFinish,
    selection.wheelSizeId,
    selection.tyreId,
    selection.tyreProfileId,
  ]
    .map((value) => value ?? '')
    .join('');
}

export function reconcileSelection(input: ReconciliationInput): ReconciliationResult {
  const { selection, missing } = input;
  const notices: ReconciliationNotice[] = [];
  const corrected: MutablePreviewSelection = { ...selection };

  // A loaded DTO is the truth and beats the missing flag (e.g. a cached
  // detail that resolved after an earlier 404 would otherwise mislead).
  if (selection.vehicleId !== null) {
    if (input.vehicle !== undefined) {
      if (corrected.colour !== null && !input.vehicle.colours.includes(corrected.colour)) {
        notices.push({
          field: 'colour',
          message: `The colour “${corrected.colour}” is no longer listed for this vehicle — cleared it.`,
        });
        corrected.colour = null;
      }
    } else if (missing.vehicle) {
      notices.push({
        field: 'vehicle',
        message:
          'The selected vehicle is no longer in the catalog — removed it (colour cleared too).',
      });
      corrected.vehicleId = null;
      corrected.colour = null;
    }
  }

  if (selection.wheelId !== null) {
    if (input.wheel !== undefined) {
      if (corrected.wheelFinish !== null && !input.wheel.finishes.includes(corrected.wheelFinish)) {
        notices.push({
          field: 'wheelFinish',
          message: `The finish “${corrected.wheelFinish}” is no longer listed for this wheel — cleared it.`,
        });
        corrected.wheelFinish = null;
      }
      if (
        corrected.wheelSizeId !== null &&
        !input.wheel.sizes.some((size) => size.id === corrected.wheelSizeId)
      ) {
        notices.push({
          field: 'wheelSize',
          message: 'The selected size is no longer listed for this wheel — cleared it.',
        });
        corrected.wheelSizeId = null;
      }
    } else if (missing.wheel) {
      notices.push({
        field: 'wheel',
        message:
          'The selected wheel is no longer in the catalog — removed it (finish and size cleared too).',
      });
      corrected.wheelId = null;
      corrected.wheelFinish = null;
      corrected.wheelSizeId = null;
    }
  }

  if (selection.tyreId !== null) {
    if (input.tyre !== undefined) {
      if (
        corrected.tyreProfileId !== null &&
        !input.tyre.profiles.some((profile) => profile.id === corrected.tyreProfileId)
      ) {
        notices.push({
          field: 'tyreProfile',
          message: 'The selected profile is no longer listed for this tyre — cleared it.',
        });
        corrected.tyreProfileId = null;
      }
    } else if (missing.tyre) {
      notices.push({
        field: 'tyre',
        message:
          'The selected tyre is no longer in the catalog — removed it (profile cleared too).',
      });
      corrected.tyreId = null;
      corrected.tyreProfileId = null;
    }
  }

  return {
    corrected,
    notices,
    changed: selectionSignature(corrected) !== selectionSignature(selection),
  };
}
