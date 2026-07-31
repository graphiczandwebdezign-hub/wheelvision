'use client';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  /** Retries the failed operation (React Query refetch, typically). */
  readonly onRetry?: () => void;
  readonly retrying?: boolean;
  readonly className?: string;
}

/**
 * Graceful failure block. `role="alert"` announces the failure immediately;
 * retry is a first-class action because catalog failures at a kiosk must
 * recover without a page refresh.
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-900/60 bg-rose-950/30 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-semibold text-rose-200">{title}</p>
      {description ? <p className="max-w-sm text-xs text-rose-300/80">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
