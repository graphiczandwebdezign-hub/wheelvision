'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-slate-700 bg-slate-800/70 text-slate-300',
  accent: 'border-cyan-800 bg-cyan-950/70 text-cyan-300',
  success: 'border-emerald-800 bg-emerald-950/70 text-emerald-300',
  warning: 'border-amber-800 bg-amber-950/70 text-amber-300',
  danger: 'border-rose-800 bg-rose-950/70 text-rose-300',
};

/** Small status pill for metadata and state flags. */
export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  );
}
