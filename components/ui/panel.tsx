'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { surfaceBase } from '@/components/ui/styles';

export interface PanelProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /** Optional right-aligned actions in the header row. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Section container used across the configurator sidebar: labelled header
 * plus content region, with the header wired to the region for screen
 * readers.
 */
export function Panel({ title, description, actions, children, className }: PanelProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn(surfaceBase, 'p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3
            id={headingId}
            className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300"
          >
            {title}
          </h3>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
