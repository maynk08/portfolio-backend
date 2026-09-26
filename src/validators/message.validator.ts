import { z } from 'zod';

import { emailSchema } from './auth.validator.js';
import { objectIdSchema, optionalText, paginationQuerySchema, requiredText, TEXT_LIMITS } from './common.validator.js';
import { MESSAGE_STATUSES } from '../models/message.model.js';

const MAX_MESSAGE_LENGTH = 5000;
const MAX_BULK_DELETE_IDS = 100;

export const contactMessageSchema = z.object({
  name: requiredText(TEXT_LIMITS.name),
  email: emailSchema,
  subject: optionalText(TEXT_LIMITS.title),
  message: requiredText(MAX_MESSAGE_LENGTH),
  // Honeypot: hidden from people on the portfolio, so only bots fill it in.
  website: z.string().max(TEXT_LIMITS.url).optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export const listMessagesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(MESSAGE_STATUSES).optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

export const updateMessageSchema = z.object({
  status: z.enum(MESSAGE_STATUSES),
});

export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

export const bulkDeleteMessagesSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(MAX_BULK_DELETE_IDS),
});

export type BulkDeleteMessagesInput = z.infer<typeof bulkDeleteMessagesSchema>;
