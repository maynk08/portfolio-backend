import { getAuthenticatedAdmin } from '../middlewares/auth.middleware.js';
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.utils.js';

import type { ChangePasswordInput, LoginInput } from '../validators/auth.validator.js';
import type { Request, Response } from 'express';

type RequestWithBody<Body> = Request<Record<string, string>, unknown, Body>;

export async function login(req: RequestWithBody<LoginInput>, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  sendSuccess(res, result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(getAuthenticatedAdmin(req).id);
  sendSuccess(res, null, { message: 'Logged out' });
}

export function getCurrentAdmin(req: Request, res: Response): void {
  sendSuccess(res, getAuthenticatedAdmin(req));
}

export async function changePassword(req: RequestWithBody<ChangePasswordInput>, res: Response): Promise<void> {
  const issuedToken = await authService.changePassword(getAuthenticatedAdmin(req).id, req.body);
  sendSuccess(res, issuedToken, { message: 'Password changed' });
}
