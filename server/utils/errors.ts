/**
 * Application error contract shared by every API route.
 *
 * All API error responses use the documented envelope:
 *
 * ```json
 * { "success": false, "error": { "code": "...", "message": "...", "details": {} } }
 * ```
 *
 * `code` is a stable machine-readable identifier safe for clients to branch
 * on; `message` is human-readable; `details` carries optional structured
 * metadata (never secrets or internal stack traces).
 */
export type ErrorCode =
  'VALIDATION_ERROR' | 'TENANT_REQUIRED' | 'TENANT_NOT_FOUND' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
}

/** Prisma request failures carry a stable engine code (e.g. P2002 unique violation). */
export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }

  static validation(details?: Record<string, unknown>): AppError {
    return new AppError('Request validation failed', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
  }

  static notFound(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, { code: 'NOT_FOUND', statusCode: 404, details });
  }
}
