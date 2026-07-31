'use client';

import { create } from 'zustand';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
  /** Auto-dismiss delay in ms; `null` keeps the toast until dismissed. */
  readonly durationMs: number | null;
}

export interface ToastInput {
  readonly kind?: ToastKind;
  readonly message: string;
  readonly durationMs?: number | null;
}

interface ToastStore {
  readonly toasts: readonly ToastItem[];
  push: (input: ToastInput) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const DEFAULT_TOAST_DURATION_MS = 4_000;

let nextToastId = 1;

/** Resets the id counter — test isolation helper. */
export function resetToastIds(): void {
  nextToastId = 1;
}

/**
 * App-wide transient notifications. Kept out of the preview store: toasts
 * are UI chrome, not configuration state (which the preview store owns
 * exclusively).
 */
export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  push: (input) => {
    const id = nextToastId;
    nextToastId += 1;
    const toast: ToastItem = {
      id,
      kind: input.kind ?? 'info',
      message: input.message,
      durationMs: input.durationMs === undefined ? DEFAULT_TOAST_DURATION_MS : input.durationMs,
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  clear: () => {
    set({ toasts: [] });
  },
}));

/** Imperative helper for module-level notifications (no hook needed). */
export function toast(input: ToastInput): number {
  return useToastStore.getState().push(input);
}
