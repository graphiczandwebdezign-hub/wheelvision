'use client';

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';

export interface SelectOption {
  readonly value: string;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'onChange' | 'value'
> {
  readonly label: string;
  readonly options: readonly SelectOption[];
  /** Selected option value; `null` = nothing selected. */
  readonly value?: string | null;
  /** Leading entry shown when nothing is selected. Omit to disallow empty. */
  readonly placeholder?: string;
  readonly onChange: (value: string | null) => void;
}

/**
 * Labelled native select. Native semantics give free keyboard and screen
 * reader behaviour; styling matches the design system. An empty value maps
 * to `null`.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, onChange, id, className, value, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={selectId}
        className="text-xs font-medium uppercase tracking-wider text-slate-400"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className={cn(controlBase, focusRing, 'min-h-11 px-3')}
        {...rest}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});
