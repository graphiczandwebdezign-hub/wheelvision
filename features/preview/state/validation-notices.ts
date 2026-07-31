'use client';

import { create } from 'zustand';
import type { ReconciliationNotice } from '@/features/preview/selection/configuration-reconciliation';

/**
 * Transient record of the most recent reconciliation correction, surfaced
 * inline in the configuration summary. Event-based (not derived): the notice
 * is published the moment a correction is applied and stays visible while the
 * selection still matches either side of that correction — so the message
 * survives the very store write it describes. It retires automatically once
 * the dealer changes the configuration, or manually via Dismiss.
 *
 * Kept out of the preview store: notices are UI chrome, not selection state.
 */

export interface ValidationNoticeBatch {
  readonly notices: readonly ReconciliationNotice[];
  /** Signature of the selection before the correction was applied. */
  readonly originalSignature: string;
  /** Signature of the corrected selection. */
  readonly correctedSignature: string;
}

interface ValidationNoticeStore {
  readonly batch: ValidationNoticeBatch | null;
  publish: (batch: ValidationNoticeBatch) => void;
  dismiss: () => void;
}

export const useValidationNoticeStore = create<ValidationNoticeStore>()((set) => ({
  batch: null,
  publish: (batch) => set({ batch }),
  dismiss: () => set({ batch: null }),
}));
