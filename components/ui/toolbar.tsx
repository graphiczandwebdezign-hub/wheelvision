'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ToolbarProps {
  readonly start?: ReactNode;
  readonly center?: ReactNode;
  readonly end?: ReactNode;
  readonly label: string;
  readonly className?: string;
}

/** Top-level action bar with start/center/end slots. `role="toolbar"`. */
export function Toolbar({ start, center, end, label, className }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        'flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 backdrop-blur',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{start}</div>
      {center ? <div className="hidden items-center gap-3 md:flex">{center}</div> : null}
      <div className="flex items-center gap-2">{end}</div>
    </div>
  );
}
