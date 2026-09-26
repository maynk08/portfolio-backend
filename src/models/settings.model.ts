import { model, Schema } from 'mongoose';

import type { InferSchemaType } from 'mongoose';

export const THEMES = ['dark', 'light'] as const;

const settingsSchema = new Schema(
  {
    theme: { type: String, enum: THEMES, required: true, default: 'dark' },
  },
  { timestamps: true, collection: 'settings' },
);

export type Settings = InferSchemaType<typeof settingsSchema>;

export const SettingsModel = model('Settings', settingsSchema);
