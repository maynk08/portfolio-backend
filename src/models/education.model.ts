import { model, Schema } from 'mongoose';

import { contentItemFields, mediaReference, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

const educationSchema = new Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: optionalString,
    startDate: { type: String, required: true },
    // null means ongoing.
    endDate: optionalString,
    grade: optionalString,
    description: optionalString,
    logo: mediaReference,
    ...contentItemFields,
  },
  { timestamps: true, collection: 'education' },
);

export type Education = InferSchemaType<typeof educationSchema>;

export const EducationModel = model('Education', educationSchema);
