/**
 * Tiny class-name combiner. Falsy entries are dropped so callers can write
 * conditional classes inline without string concatenation.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}
