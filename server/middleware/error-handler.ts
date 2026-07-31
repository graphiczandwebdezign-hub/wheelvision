import { NextResponse } from 'next/server';
import { AppError } from '@/server/utils/errors';
import { logger } from '@/server/utils/logger';

export function handleApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    logger.warn(error.message, { statusCode: error.statusCode, details: error.details });
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  logger.error(fallbackMessage, { error });
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
