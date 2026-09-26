import type { PaginationMeta } from './pagination.utils.js';
import type { PaginatedResponse, SuccessResponse } from '../types/api-response.types.js';
import type { Response } from 'express';

const HTTP_OK = 200;
const HTTP_CREATED = 201;

export function sendSuccess(res: Response, data: unknown, options: { statusCode?: number; message?: string } = {}): void {
  const body: SuccessResponse<unknown> = { success: true, data };
  if (options.message !== undefined) {
    body.message = options.message;
  }
  res.status(options.statusCode ?? HTTP_OK).json(body);
}

export function sendCreated(res: Response, data: unknown): void {
  sendSuccess(res, data, { statusCode: HTTP_CREATED });
}

export function sendPaginated(res: Response, items: unknown[], pagination: PaginationMeta): void {
  const body: PaginatedResponse<unknown> = { success: true, data: items, pagination };
  res.status(HTTP_OK).json(body);
}
