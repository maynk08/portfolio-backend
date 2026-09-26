import { AppError, BadRequestError, PayloadTooLargeError } from '../errors/app-error.js';

import type { ErrorResponse } from '../types/api-response.types.js';
import type { NextFunction, Request, Response } from 'express';

const INTERNAL_SERVER_ERROR = 500;

// Errors raised by Express's body parser carry a `type` field describing what went wrong.
function isBodyParserError(error: unknown): error is Error & { type: string } {
  return error instanceof Error && 'type' in error && typeof error.type === 'string';
}

function toAppError(error: unknown): AppError | undefined {
  if (error instanceof AppError) {
    return error;
  }
  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      return new BadRequestError('Request body is not valid JSON', { cause: error });
    }
    if (error.type === 'entity.too.large') {
      return new PayloadTooLargeError();
    }
  }
  return undefined;
}

export function handleError(error: unknown, req: Request, res: Response, next: NextFunction): void {
  // Once a response has started streaming, only Express's default handler can end it safely.
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);

  if (appError === undefined) {
    req.log.error({ err: error }, 'Unhandled error');
    const body: ErrorResponse = { success: false, message: 'Internal server error' };
    res.status(INTERNAL_SERVER_ERROR).json(body);
    return;
  }

  const body: ErrorResponse = { success: false, message: appError.message };
  if (appError.errors !== undefined) {
    body.errors = appError.errors;
  }
  if (appError.details !== undefined) {
    body.details = appError.details;
  }
  res.status(appError.statusCode).json(body);
}
