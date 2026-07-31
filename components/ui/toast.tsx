'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/styles';
import { useToastStore, type ToastItem } from '@/components/ui/toast-store';

const kindClasses: Record<ToastItem['kind'], string> = {
  success: 'border-emerald-800 bg-emerald-950/90 text-emerald-200',
  info: 'border-slate-700 bg-slate-900/95 text-slate-200',
  warning: 'border-amber-800 bg-amber-950/90 text-amber-200',
  error: 'border-rose-800 bg-rose-950/90 text-rose-200',
};

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    if (item.durationMs === null) {
      return;
    }
    const timer = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(timer);
  }, [item.id, item.durationMs, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex min-h-11 w-72 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl shadow-slate-950/50',
        kindClasses[item.kind],
      )}
    >
      <span>{item.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(item.id)}
        className={cn('rounded-md px-1 text-current/70 hover:text-current', focusRing)}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Fixed viewport that renders every queued toast. Announcements go through
 * aria-live so screen readers hear saves, failures and connectivity changes.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
