import type { SuccessResponse } from '../types/api-response.types.js';
import type { Response } from 'express';

const HTTP_OK = 200;

export function sendSuccess(res: Response, data: unknown, options: { statusCode?: number; message?: string } = {}): void {
  const body: SuccessResponse<unknown> = { success: true, data };
  if (options.message !== undefined) {
    body.message = options.message;
  }
  res.status(options.statusCode ?? HTTP_OK).json(body);
}
