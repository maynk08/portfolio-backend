import { ValidationError } from '../errors/app-error.js';

import type { FieldError } from '../errors/app-error.js';
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

const WHOLE_BODY_FIELD = 'body';

function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : WHOLE_BODY_FIELD,
    message: issue.message,
  }));
}

// Replaces `req.body` with the parsed result, so unknown fields are stripped before any controller sees them.
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(toFieldErrors(result.error));
    }
    req.body = result.data;
    next();
  };
}
