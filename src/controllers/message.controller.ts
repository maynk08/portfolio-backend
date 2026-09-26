import * as messageService from '../services/message.service.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.utils.js';

import type { IdParams } from '../validators/common.validator.js';
import type {
  BulkDeleteMessagesInput,
  ContactMessageInput,
  ListMessagesQuery,
  UpdateMessageInput,
} from '../validators/message.validator.js';
import type { Request, Response } from 'express';

export async function receiveContactMessageHandler(req: Request<unknown, unknown, ContactMessageInput>, res: Response): Promise<void> {
  await messageService.receiveContactMessage(req.body);
  sendCreated(res, null, { message: 'Message sent' });
}

export async function listMessagesHandler(req: Request, res: Response): Promise<void> {
  // Express cannot carry the query type through the middleware chain; `validateQuery` has already replaced it.
  const { items, pagination } = await messageService.listMessages(req.query as unknown as ListMessagesQuery);
  sendPaginated(res, items, pagination);
}

export async function countMessagesHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await messageService.countMessagesByStatus());
}

export async function getMessageHandler(req: Request<IdParams>, res: Response): Promise<void> {
  sendSuccess(res, await messageService.getMessage(req.params.id));
}

export async function updateMessageHandler(req: Request<IdParams, unknown, UpdateMessageInput>, res: Response): Promise<void> {
  sendSuccess(res, await messageService.updateMessage(req.params.id, req.body));
}

export async function deleteMessageHandler(req: Request<IdParams>, res: Response): Promise<void> {
  await messageService.deleteMessage(req.params.id);
  sendSuccess(res, null, { message: 'Message deleted' });
}

export async function bulkDeleteMessagesHandler(req: Request<unknown, unknown, BulkDeleteMessagesInput>, res: Response): Promise<void> {
  sendSuccess(res, await messageService.deleteMessages(req.body.ids), { message: 'Messages deleted' });
}
