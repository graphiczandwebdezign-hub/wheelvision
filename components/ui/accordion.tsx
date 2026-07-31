'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { focusRing, surfaceBase } from '@/components/ui/styles';

export interface AccordionItem {
  readonly id: string;
  readonly title: ReactNode;
  /** Optional trailing content in the header (badges, status). */
  readonly meta?: ReactNode;
  readonly content: ReactNode;
  readonly defaultOpen?: boolean;
}

export interface AccordionProps {
  readonly items: readonly AccordionItem[];
  readonly className?: string;
}

/**
 * Accordion of independently toggleable sections. Headers are real buttons
 * with aria-expanded wired to their region — Space/Enter toggle, everything
 * stays in the natural tab order.
 */
export function Accordion({ items, className }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(items.filter((item) => item.defaultOpen).map((item) => item.id)),
  );

  const toggle = (id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const headerId = `${baseId}-header-${item.id}`;
        const regionId = `${baseId}-region-${item.id}`;
        return (
          <div key={item.id} className={cn(surfaceBase, 'overflow-hidden')}>
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={regionId}
              onClick={() => toggle(item.id)}
              className={cn(
                'flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left',
                focusRing,
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn('text-slate-500 transition-transform', isOpen && 'rotate-90')}
                >
                  ›
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {item.title}
                </span>
              </span>
              {item.meta ? <span className="flex items-center gap-2">{item.meta}</span> : null}
            </button>
            {isOpen ? (
              <div id={regionId} role="region" aria-labelledby={headerId} className="px-4 pb-4">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
