import { Schema } from 'mongoose';

// Common to every content item: show/hide and a manual display position.
export const contentItemFields = {
  isVisible: { type: Boolean, required: true, default: true },
  order: { type: Number, required: true, default: 0 },
};

export const mediaReference = { type: Schema.Types.ObjectId, ref: 'Media', default: null };

export const optionalString = { type: String, default: null };
