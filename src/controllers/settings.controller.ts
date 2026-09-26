import { getSettings, replaceSettings } from '../services/settings.service.js';
import { sendSuccess } from '../utils/response.utils.js';

import type { SettingsInput } from '../validators/settings.validator.js';
import type { Request, Response } from 'express';

export async function getSettingsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getSettings());
}

export async function replaceSettingsHandler(req: Request<unknown, unknown, SettingsInput>, res: Response): Promise<void> {
  sendSuccess(res, await replaceSettings(req.body));
}
