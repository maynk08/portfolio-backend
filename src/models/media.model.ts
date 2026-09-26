import { model, Schema } from 'mongoose';

import type { InferSchemaType } from 'mongoose';

export const MEDIA_STATUSES = ['pending', 'ready'] as const;

const mediaSchema = new Schema(
  {
    // Object key in storage.
    key: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    altText: { type: String, default: null },
    isVisible: { type: Boolean, required: true, default: true },
    // `pending` from the upload URL request until the client confirms the upload finished.
    status: { type: String, enum: MEDIA_STATUSES, required: true, default: 'pending' },
  },
  { timestamps: true, collection: 'media' },
);

mediaSchema.index({ status: 1, createdAt: -1 });

export type Media = InferSchemaType<typeof mediaSchema>;

export const MediaModel = model('Media', mediaSchema);
