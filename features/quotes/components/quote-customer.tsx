'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { controlBase, focusRing } from '@/components/ui/styles';

/**
 * Customer capture for a new quotation. Controlled and presentation-only —
 * the dialog owns the values and validation (Zod at the boundary).
 */

export interface QuoteCustomerDraft {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

export interface QuoteCustomerErrors {
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
}

interface FieldSpec {
  readonly key: keyof QuoteCustomerDraft;
  readonly label: string;
  readonly type: string;
  readonly autoComplete: string;
  readonly placeholder: string;
  readonly required: boolean;
}

const FIELDS: readonly FieldSpec[] = [
  {
    key: 'name',
    label: 'Customer name',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Mrs Nkosi',
    required: true,
  },
  {
    key: 'email',
    label: 'Email (optional)',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'customer@example.co.za',
    required: false,
  },
  {
    key: 'phone',
    label: 'Phone (optional)',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '+27 82 000 0000',
    required: false,
  },
];

export function QuoteCustomer({
  draft,
  onChange,
  errors,
}: {
  readonly draft: QuoteCustomerDraft;
  readonly onChange: (patch: Partial<QuoteCustomerDraft>) => void;
  readonly errors: QuoteCustomerErrors;
}) {
  const baseId = useId();

  return (
    <fieldset className="flex flex-col gap-3" aria-label="Customer details">
      {FIELDS.map((field) => {
        const id = `${baseId}-${field.key}`;
        const error = errors[field.key];
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={id}
              className="text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              {field.label}
            </label>
            <input
              id={id}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              required={field.required}
              aria-invalid={error !== undefined}
              aria-describedby={error !== undefined ? `${id}-error` : undefined}
              value={draft[field.key]}
              onChange={(event) => onChange({ [field.key]: event.target.value })}
              className={cn(
                controlBase,
                focusRing,
                'min-h-11 px-3',
                error !== undefined && 'border-rose-600',
              )}
            />
            {error !== undefined ? (
              <p id={`${id}-error`} role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
