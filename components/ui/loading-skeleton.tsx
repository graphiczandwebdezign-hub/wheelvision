'use client';

import { cn } from '@/lib/cn';

export interface LoadingSkeletonProps {
  /** Number of stacked placeholder lines. Default 3. */
  readonly lines?: number;
  /** Height of each line (Tailwind class). */
  readonly lineHeight?: string;
  readonly className?: string;
}

/**
 * Generic content placeholder shown while catalog slices load. Hidden from
 * assistive technology — loading state is announced by nearby status text.
 */
export function LoadingSkeleton({
  lines = 3,
  lineHeight = 'h-4',
  className,
}: LoadingSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('flex animate-pulse flex-col gap-3', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn('rounded-lg bg-slate-800/80', lineHeight, index === lines - 1 && 'w-2/3')}
        />
      ))}
    </div>
  );
}
