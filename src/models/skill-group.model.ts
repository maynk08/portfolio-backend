import { model, Schema } from 'mongoose';

import { contentItemFields, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

const skillSchema = new Schema(
  {
    name: { type: String, required: true },
    // A Simple Icons slug (for example `nodedotjs`); the portfolio renders the matching logo.
    icon: optionalString,
    isVisible: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const skillGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    // Array order is display order.
    skills: { type: [skillSchema], default: [] },
    ...contentItemFields,
  },
  { timestamps: true, collection: 'skillGroups' },
);

skillGroupSchema.index({ isVisible: 1, order: 1 });

export type SkillGroup = InferSchemaType<typeof skillGroupSchema>;

export const SkillGroupModel = model('SkillGroup', skillGroupSchema);
