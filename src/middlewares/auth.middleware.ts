import { UnauthorizedError } from '../errors/app-error.js';
import { authenticate } from '../services/auth.service.js';

import type { AdminProfile } from '../types/admin.types.js';
import type { NextFunction, Request, Response } from 'express';

const BEARER_PREFIX = 'Bearer ';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authorizationHeader = req.headers.authorization;
  if (authorizationHeader?.startsWith(BEARER_PREFIX) !== true) {
    throw new UnauthorizedError();
  }

  req.admin = await authenticate(authorizationHeader.slice(BEARER_PREFIX.length).trim());
  next();
}

export function getAuthenticatedAdmin(req: Request): AdminProfile {
  if (req.admin === undefined) {
    throw new Error('getAuthenticatedAdmin was called on a route without the requireAuth middleware');
  }
  return req.admin;
}
