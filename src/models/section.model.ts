import { model, Schema } from 'mongoose';

import type { InferSchemaType } from 'mongoose';

export const SECTION_KEYS = ['hero', 'about', 'experience', 'projects', 'skills', 'education', 'certifications', 'contact'] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const sectionSchema = new Schema(
  {
    key: { type: String, enum: SECTION_KEYS, required: true, unique: true },
    heading: { type: String, required: true },
    isVisible: { type: Boolean, required: true, default: true },
    order: { type: Number, required: true },
    // Reserved for section layout options and the future page builder.
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'sections', minimize: false },
);

export type Section = InferSchemaType<typeof sectionSchema>;

export const SectionModel = model('Section', sectionSchema);
