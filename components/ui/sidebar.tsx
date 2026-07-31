'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SidebarProps {
  readonly title: ReactNode;
  readonly children: ReactNode;
  /** Pinned region at the bottom (summary/actions). */
  readonly footer?: ReactNode;
  readonly className?: string;
}

/** Configurator rail: titled aside with scrollable body and pinned footer. */
export function Sidebar({ title, children, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60',
        className,
      )}
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer ? <div className="border-t border-slate-800 px-4 py-4">{footer}</div> : null}
    </aside>
  );
}
