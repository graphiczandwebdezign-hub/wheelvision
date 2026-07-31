import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, type ErrorCode } from '@/server/utils/errors';
import type { ApiErrorEnvelope } from '@/types/catalog';
import { logger } from '@/lib/logger';

function errorBody(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorEnvelope {
  return {
    success: false,
    error: { code, message, details: details ?? null },
  };
}

/**
 * Maps any thrown error to the documented API error envelope:
 * `{ success: false, error: { code, message, details } }`.
 *
 * - `ZodError`        → 400 VALIDATION_ERROR (never a 500 for bad input)
 * - `AppError`        → its own status code and error code
 * - anything else     → 500 INTERNAL_ERROR, details server-logged only
 */
export function handleApiError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ZodError) {
    const details = error.flatten();
    logger.warn('request validation failed', { issues: error.issues.length });
    return NextResponse.json(errorBody('VALIDATION_ERROR', 'Request validation failed', details), {
      status: 400,
    });
  }

  if (error instanceof AppError) {
    logger.warn(error.message, { code: error.code, statusCode: error.statusCode });
    return NextResponse.json(errorBody(error.code, error.message, error.details), {
      status: error.statusCode,
    });
  }

  logger.error(fallbackMessage, { error });
  return NextResponse.json(errorBody('INTERNAL_ERROR', fallbackMessage), { status: 500 });
}
