'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { surfaceBase } from '@/components/ui/styles';

export interface CardProps {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  /** Optional right-aligned actions in the header row. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Content card: optional header (title/subtitle/actions) plus body. */
export function Card({ title, subtitle, actions, children, className }: CardProps) {
  return (
    <div className={cn(surfaceBase, 'p-6 shadow-xl shadow-slate-950/40', className)}>
      {title || subtitle || actions ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-xl font-semibold text-slate-100">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
