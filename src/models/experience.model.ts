import { model, Schema } from 'mongoose';

import { contentItemFields, mediaReference, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

const experienceSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: optionalString,
    startDate: { type: String, required: true },
    // null means "Present".
    endDate: optionalString,
    summary: optionalString,
    highlights: { type: [String], default: [] },
    techStack: { type: [String], default: [] },
    companyLogo: mediaReference,
    companyUrl: optionalString,
    ...contentItemFields,
  },
  { timestamps: true, collection: 'experiences' },
);

export type Experience = InferSchemaType<typeof experienceSchema>;

export const ExperienceModel = model('Experience', experienceSchema);
