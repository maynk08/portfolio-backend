import { Router } from 'express';

import {
  bulkDeleteMessagesHandler,
  countMessagesHandler,
  deleteMessageHandler,
  getMessageHandler,
  listMessagesHandler,
  updateMessageHandler,
} from '../controllers/message.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamsSchema } from '../validators/common.validator.js';
import { bulkDeleteMessagesSchema, listMessagesQuerySchema, updateMessageSchema } from '../validators/message.validator.js';

export const messageRouter = Router();

const validateId = validateParams(idParamsSchema);

messageRouter.get('/', validateQuery(listMessagesQuerySchema), listMessagesHandler);
// Registered before `/:id` so "counts" is not mistaken for an ID.
messageRouter.get('/counts', countMessagesHandler);
messageRouter.post('/bulk-delete', validateBody(bulkDeleteMessagesSchema), bulkDeleteMessagesHandler);
messageRouter.get('/:id', validateId, getMessageHandler);
messageRouter.patch('/:id', validateId, validateBody(updateMessageSchema), updateMessageHandler);
messageRouter.delete('/:id', validateId, deleteMessageHandler);
