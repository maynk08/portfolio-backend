import { model, Schema } from 'mongoose';

import { optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

export const MESSAGE_STATUSES = ['unread', 'read', 'archived'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

const messageSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: optionalString,
    message: { type: String, required: true },
    status: { type: String, enum: MESSAGE_STATUSES, required: true, default: 'unread' },
  },
  { timestamps: true, collection: 'messages' },
);

messageSchema.index({ status: 1, createdAt: -1 });

export type Message = InferSchemaType<typeof messageSchema>;

export const MessageModel = model('Message', messageSchema);
