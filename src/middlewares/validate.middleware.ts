import { ValidationError } from '../errors/app-error.js';

import type { FieldError } from '../errors/app-error.js';
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

function toFieldErrors(error: z.ZodError, part: RequestPart): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : part,
    message: issue.message,
  }));
}

function parseOrThrow(schema: z.ZodType, value: unknown, part: RequestPart): unknown {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(toFieldErrors(result.error, part));
  }
  return result.data;
}

// Each validator replaces the request part with the parsed result, so unknown fields are stripped
// and defaults applied before any controller sees the data.

export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = parseOrThrow(schema, req.body, 'body');
    next();
  };
}

export function validateParams(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.params = parseOrThrow(schema, req.params, 'params') as Request['params'];
    next();
  };
}

export function validateQuery(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const query = parseOrThrow(schema, req.query, 'query');
    // Express 5 exposes `req.query` as a getter, so it has to be redefined rather than assigned.
    Object.defineProperty(req, 'query', { value: query, writable: true, enumerable: true, configurable: true });
    next();
  };
}
