'use client';

import { create } from 'zustand';

/**
 * Quote workspace UI state — which dialog is open and which quote it shows.
 * Pure chrome state: quote data itself lives in React Query (`features/quotes`
 * hooks), the current *configuration* lives in the preview store, and this
 * store only decides what the dealer is looking at.
 *
 * Three entry modes:
 *  - `openForConfiguration` — from the completed preview configuration
 *    (compose a new quotation),
 *  - `openWithQuoteId` — from a shared `?quote=` link (view/print that quote),
 *  - `openHistory` — the tenant's quote list (recall, duplicate, archive).
 */
interface QuoteUiStore {
  readonly open: boolean;
  /** Quote being viewed (shared-link / history recall), null while composing. */
  readonly quoteId: string | null;
  readonly historyOpen: boolean;
  openForConfiguration: () => void;
  openWithQuoteId: (quoteId: string) => void;
  openHistory: () => void;
  closeHistory: () => void;
  close: () => void;
}

export const useQuoteUiStore = create<QuoteUiStore>()((set) => ({
  open: false,
  quoteId: null,
  historyOpen: false,

  openForConfiguration: () => set({ open: true, quoteId: null }),
  openWithQuoteId: (quoteId) => set({ open: true, quoteId }),
  openHistory: () => set({ historyOpen: true }),
  closeHistory: () => set({ historyOpen: false }),
  close: () => set({ open: false, quoteId: null }),
}));
