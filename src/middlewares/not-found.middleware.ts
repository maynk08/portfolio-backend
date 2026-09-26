import { NotFoundError } from '../errors/app-error.js';

import type { Request } from 'express';

export function handleUnknownRoute(req: Request): never {
  throw new NotFoundError(`Route ${req.method} ${req.path} not found`);
}
