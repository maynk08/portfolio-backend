import { getProfile, replaceProfile } from '../services/profile.service.js';
import { sendSuccess } from '../utils/response.utils.js';

import type { ProfileInput } from '../validators/profile.validator.js';
import type { Request, Response } from 'express';

export async function getProfileHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getProfile());
}

export async function replaceProfileHandler(req: Request<unknown, unknown, ProfileInput>, res: Response): Promise<void> {
  sendSuccess(res, await replaceProfile(req.body));
}
