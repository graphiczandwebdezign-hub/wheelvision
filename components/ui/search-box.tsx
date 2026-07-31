'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';

export interface SearchBoxProps {
  /** Accessible name (the clear action is announced as "Clear {label}"). */
  readonly label: string;
  /** Emitted once on mount (with the initial value) and after each debounce. */
  readonly onSearch: (value: string) => void;
  readonly placeholder?: string;
  /** Debounce delay in ms. Default 150. */
  readonly delayMs?: number;
  readonly id?: string;
}

/**
 * Debounced search input. Typing updates the visible text instantly while
 * `onSearch` fires only after typing pauses (React Query / filter churn
 * stays off the keystroke path). The initial emission on mount lets parents
 * treat remote results and local filters uniformly. Escape clears the input
 * without bubbling (dialogs/overlays stay open).
 */
export function SearchBox({
  label,
  onSearch,
  placeholder = 'Search…',
  delayMs = 150,
  id,
}: SearchBoxProps) {
  const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [text, setText] = useState('');
  const mountedRef = useRef(false);

  useEffect(() => {
    // Mount: emit once after the debounce (see doc comment).
    // Afterwards: emit whenever the text changed since the last timer arm.
    if (!mountedRef.current) {
      mountedRef.current = true;
      const timer = setTimeout(() => onSearch(text), delayMs);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => onSearch(text), delayMs);
    return () => clearTimeout(timer);
    // onSearch identity changes must not re-emit — parents memoise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delayMs]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        role="searchbox"
        aria-label={label}
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(controlBase, focusRing, 'min-h-11 px-3 pr-10')}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setText('');
          }
        }}
      />
      {text !== '' ? (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            setText('');
            document.getElementById(inputId)?.focus();
          }}
          className={cn(
            'absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-200',
            focusRing,
          )}
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500"
        >
          ⌕
        </span>
      )}
    </div>
  );
}
