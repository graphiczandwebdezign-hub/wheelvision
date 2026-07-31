'use client';

import { useEffect, useMemo } from 'react';
import { toast } from '@/components/ui';
import { ApiClientError } from '@/features/catalog/api/client';
import { useTyre } from '@/features/catalog/hooks/use-tyre';
import { useVehicle } from '@/features/catalog/hooks/use-vehicle';
import { useWheel } from '@/features/catalog/hooks/use-wheel';
import {
  reconcileSelection,
  selectionSignature,
} from '@/features/preview/selection/configuration-reconciliation';
import { usePreviewStore, type PreviewSelection } from '@/features/preview/state/preview-store';
import { useValidationNoticeStore } from '@/features/preview/state/validation-notices';

/** Only a definitive 404 marks an entity as gone — transient failures preserve the selection. */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

/**
 * Continuously validates the current selection against the live catalog
 * (saved-configuration recall, shared links and browser-restored selections
 * all flow through the same store, so one hook covers every restore path).
 *
 * On definitive drift the hook applies one atomic correction via
 * `restoreConfiguration`, publishes the adjustment notices for the summary
 * and raises a single toast — then goes quiet: the corrected selection
 * reconciles cleanly on the next pass, so there is no write loop.
 */
export function useConfigurationValidation(): void {
  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const colour = usePreviewStore((state) => state.colour);
  const wheelId = usePreviewStore((state) => state.wheelId);
  const wheelFinish = usePreviewStore((state) => state.wheelFinish);
  const wheelSizeId = usePreviewStore((state) => state.wheelSizeId);
  const tyreId = usePreviewStore((state) => state.tyreId);
  const tyreProfileId = usePreviewStore((state) => state.tyreProfileId);
  const restoreConfiguration = usePreviewStore((state) => state.restoreConfiguration);

  const batch = useValidationNoticeStore((state) => state.batch);
  const publish = useValidationNoticeStore((state) => state.publish);
  const dismiss = useValidationNoticeStore((state) => state.dismiss);

  const selection: PreviewSelection = useMemo(
    () => ({ vehicleId, colour, wheelId, wheelFinish, wheelSizeId, tyreId, tyreProfileId }),
    [vehicleId, colour, wheelId, wheelFinish, wheelSizeId, tyreId, tyreProfileId],
  );

  const vehicleQuery = useVehicle(vehicleId ?? undefined);
  const wheelQuery = useWheel(wheelId ?? undefined);
  const tyreQuery = useTyre(tyreId ?? undefined);

  const result = useMemo(
    () =>
      reconcileSelection({
        selection,
        vehicle: vehicleQuery.data,
        wheel: wheelQuery.data,
        tyre: tyreQuery.data,
        missing: {
          vehicle: isNotFound(vehicleQuery.error),
          wheel: isNotFound(wheelQuery.error),
          tyre: isNotFound(tyreQuery.error),
        },
      }),
    [
      selection,
      vehicleQuery.data,
      wheelQuery.data,
      tyreQuery.data,
      vehicleQuery.error,
      wheelQuery.error,
      tyreQuery.error,
    ],
  );

  useEffect(() => {
    const signature = selectionSignature(selection);
    if (result.changed) {
      restoreConfiguration(result.corrected);
      publish({
        notices: result.notices,
        originalSignature: signature,
        correctedSignature: selectionSignature(result.corrected),
      });
      toast({
        kind: 'warning',
        message: 'Configuration adjusted to the current catalog — see the summary for details.',
      });
      return;
    }
    // The selection reconciles cleanly: retire a published notice only once
    // the dealer has moved on from both sides of the correction it describes.
    if (
      batch !== null &&
      signature !== batch.originalSignature &&
      signature !== batch.correctedSignature
    ) {
      dismiss();
    }
  }, [selection, result, batch, publish, dismiss, restoreConfiguration]);
}
