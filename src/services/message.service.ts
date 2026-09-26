import mongoose from 'mongoose';

import { deleteByIdOrThrow, findByIdOrThrow, findPage, updateByIdOrThrow } from './shared/content-query.js';
import { logger } from '../lib/logger.js';
import { MESSAGE_STATUSES, MessageModel } from '../models/message.model.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { Page, StoredDocument } from './shared/content-query.js';
import type { Message, MessageStatus } from '../models/message.model.js';
import type { ApiDocument } from '../utils/serialize.utils.js';
import type { ContactMessageInput, ListMessagesQuery, UpdateMessageInput } from '../validators/message.validator.js';
import type { PipelineStage, QueryFilter } from 'mongoose';

type MessageDocument = ApiDocument<StoredDocument<Message>>;

const NOT_FOUND_MESSAGE = 'Message not found';
const NEWEST_FIRST: PipelineStage[] = [{ $sort: { createdAt: -1, _id: -1 } }];

// A filled-in honeypot means a bot: the caller gets the normal success response, but nothing is stored.
export async function receiveContactMessage(input: ContactMessageInput): Promise<void> {
  if (input.website !== undefined && input.website.trim() !== '') {
    logger.info('Contact form submission dropped by the spam trap');
    return;
  }
  await MessageModel.create({ name: input.name, email: input.email, subject: input.subject ?? null, message: input.message });
}

export function listMessages(query: ListMessagesQuery): Promise<Page<Message>> {
  const filter: QueryFilter<Message> = query.status === undefined ? {} : { status: query.status };
  return findPage(MessageModel, NEWEST_FIRST, query, filter);
}

export async function countMessagesByStatus(): Promise<Record<MessageStatus, number>> {
  const counts = await Promise.all(MESSAGE_STATUSES.map((status) => MessageModel.countDocuments({ status })));
  return { unread: counts[0] ?? 0, read: counts[1] ?? 0, archived: counts[2] ?? 0 };
}

export async function getMessage(id: string): Promise<MessageDocument> {
  return toApiDocument(await findByIdOrThrow(MessageModel, id, NOT_FOUND_MESSAGE));
}

export function updateMessage(id: string, input: UpdateMessageInput): Promise<MessageDocument> {
  return updateByIdOrThrow(MessageModel, id, input, NOT_FOUND_MESSAGE);
}

export function deleteMessage(id: string): Promise<void> {
  return deleteByIdOrThrow(MessageModel, id, NOT_FOUND_MESSAGE);
}

// IDs that no longer exist are skipped, so deleting from a stale inbox view still succeeds.
export async function deleteMessages(ids: string[]): Promise<{ deletedCount: number }> {
  if (ids.length === 0) {
    throw new Error('deleteMessages needs at least one ID; an empty filter would delete every message');
  }
  const result = await MessageModel.deleteMany({ _id: mongoose.trusted({ $in: ids }) });
  return { deletedCount: result.deletedCount };
}
