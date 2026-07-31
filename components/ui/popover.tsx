'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';

export interface PopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Element the popover is visually anchored to. */
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly label?: string;
  readonly className?: string;
}

/**
 * Non-modal floating panel anchored under an element. Escape closes it and
 * so does a click anywhere outside; it intentionally does not steal focus
 * (use Dialog for modal duties).
 */
export function Popover({ open, onClose, anchorRef, children, label, className }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) === false &&
        anchorRef.current?.contains(target) === false
      ) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      aria-modal="false"
      className={cn(
        'absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200 shadow-2xl shadow-slate-950/60',
        className,
      )}
    >
      {children}
    </div>
  );
}
