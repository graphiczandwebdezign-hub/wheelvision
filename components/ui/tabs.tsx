'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/styles';

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: React.ReactNode;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  /** Controlled active tab. Omit for uncontrolled (first tab active). */
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly label: string;
  readonly className?: string;
}

/**
 * Tabs with the WAI-ARIA tabs pattern: roving tabindex, Left/Right (and
 * Home/End) move between tabs, aria-selected mirrors the active tab, and
 * panels are associated to their tab via aria-labelledby/aria-controls.
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(items[0]?.value ?? '');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const active = value ?? internal;

  const activate = (next: string, focusIndex?: number) => {
    if (value === undefined) {
      setInternal(next);
    }
    onChange?.(next);
    if (focusIndex !== undefined) {
      tabRefs.current[focusIndex]?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    if (items.length === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const next = index === last ? 0 : index + 1;
        activate(items[next].value, next);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const next = index === 0 ? last : index - 1;
        activate(items[next].value, next);
        break;
      }
      case 'Home':
        event.preventDefault();
        activate(items[0].value, 0);
        break;
      case 'End':
        event.preventDefault();
        activate(items[last].value, last);
        break;
      default:
        break;
    }
  };

  const activeItem = items.find((item) => item.value === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1"
      >
        {items.map((item, index) => {
          const isActive = item.value === activeItem?.value;
          return (
            <button
              key={item.value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => activate(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'min-h-10 flex-1 rounded-lg px-4 text-sm font-medium transition-colors',
                focusRing,
                isActive
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.value}`}
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
          className="mt-4"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
