'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  /** Optional follow-up action (button/link). */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** Friendly "nothing here yet" block for empty catalogs and filters. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
