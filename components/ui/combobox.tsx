'use client';

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';

export const COMBOBOX_MAX_VISIBLE_OPTIONS = 50;

export interface ComboOption {
  readonly value: string;
  readonly label: string;
  /** Extra free-text the filter also matches (e.g. "VW Amarok"). */
  readonly keywords?: string;
  readonly disabled?: boolean;
}

export interface ComboboxProps {
  readonly label: string;
  readonly options: readonly ComboOption[];
  /** Selected option value; `null` = nothing selected. */
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly placeholder?: string;
  readonly emptyMessage?: string;
  readonly id?: string;
  readonly disabled?: boolean;
}

/**
 * Accessible single-select combobox (ARIA 1.2 combobox pattern): type to
 * filter, ArrowUp/Down (+ Home/End) move the active option, Enter selects,
 * Escape closes and restores the selection display. The rendered list caps
 * at 50 options with a "keep typing" hint so huge catalogs stay instant.
 */
export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Type to search…',
  emptyMessage = 'No matches found',
  id,
  disabled = false,
}: ComboboxProps) {
  const reactId = useId();
  const inputId = id ?? `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  /** -1 = no active option yet (aria-activedescendant unset). */
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (text === '') {
      return options;
    }
    return options.filter((option) =>
      [option.label, option.keywords ?? ''].some((haystack) =>
        haystack.toLowerCase().includes(text),
      ),
    );
  }, [options, query]);

  const visible = filtered.slice(0, COMBOBOX_MAX_VISIBLE_OPTIONS);
  const hiddenCount = filtered.length - visible.length;

  const optionId = (index: number) => `${listboxId}-${index}`;

  const openMenu = () => {
    setOpen(true);
    setQuery('');
    setActiveIndex(-1);
  };

  const closeMenu = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const commitSelection = (option: ComboOption) => {
    if (!option.disabled) {
      onChange(option.value);
    }
    closeMenu();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          openMenu();
          return;
        }
        if (visible.length === 0) {
          return;
        }
        if (event.key === 'ArrowDown') {
          setActiveIndex((current) => (current < visible.length - 1 ? current + 1 : 0));
        } else {
          setActiveIndex((current) => (current > 0 ? current - 1 : visible.length - 1));
        }
        break;
      }
      case 'Home': {
        if (open && visible.length > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      }
      case 'End': {
        if (open && visible.length > 0) {
          event.preventDefault();
          setActiveIndex(visible.length - 1);
        }
        break;
      }
      case 'Enter': {
        if (!open) {
          return;
        }
        event.preventDefault();
        const active = activeIndex >= 0 ? visible[activeIndex] : undefined;
        if (active !== undefined) {
          commitSelection(active);
        } else if (visible.length === 1 && visible[0] !== undefined) {
          // Unique filter match: Enter selects it without arrow-key travel.
          commitSelection(visible[0]);
        }
        break;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          closeMenu();
        }
        break;
      }
      default:
        break;
    }
  };

  // Scroll the active option into view (guarded: jsdom lacks scrollIntoView).
  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open, listboxId]);

  return (
    <div
      className="relative flex flex-col gap-1.5"
      onBlur={(event) => {
        // Close when focus leaves the combobox entirely; option clicks are
        // intercepted on pointerdown and never move focus.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          closeMenu();
        }
      }}
    >
      <label
        htmlFor={inputId}
        className="text-xs font-medium uppercase tracking-wider text-slate-400"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={open ? query : (selectedOption?.label ?? '')}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(controlBase, focusRing, 'min-h-11 px-3 pr-10')}
          onFocus={openMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) {
              setOpen(true);
            }
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />
        {selectedOption && !disabled ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange(null);
              setQuery('');
              document.getElementById(inputId)?.focus();
            }}
            className={cn(
              'absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-200',
              'disabled:cursor-not-allowed disabled:opacity-50',
              focusRing,
            )}
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500"
          >
            ▾
          </span>
        )}
      </div>
      {open ? (
        <ul
          role="listbox"
          id={listboxId}
          aria-label={label}
          className="absolute top-full z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl shadow-black/60"
        >
          {visible.length === 0 ? (
            <li
              role="option"
              aria-selected="false"
              aria-disabled="true"
              className="px-3 py-3 text-sm text-slate-500"
            >
              {emptyMessage}
            </li>
          ) : (
            visible.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled === true}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSelection(option)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm',
                    index === activeIndex ? 'bg-slate-800 text-slate-50' : 'text-slate-200',
                    option.disabled === true && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="flex-1">{option.label}</span>
                  {selected ? <span aria-hidden="true">✓</span> : null}
                </li>
              );
            })
          )}
          {hiddenCount > 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500" aria-hidden="true">
              {hiddenCount} more — keep typing to narrow results
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
