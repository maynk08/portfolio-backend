import { sendSuccess } from '../utils/response.utils.js';

import type { Request, Response } from 'express';

export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, { status: 'ok' });
}
