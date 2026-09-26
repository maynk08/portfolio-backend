import { model, Schema } from 'mongoose';

import { contentItemFields, mediaReference, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

const projectSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: optionalString,
    // Markdown.
    description: optionalString,
    role: optionalString,
    techStack: { type: [String], default: [] },
    liveUrl: optionalString,
    repoUrl: optionalString,
    coverImage: mediaReference,
    gallery: { type: [{ type: Schema.Types.ObjectId, ref: 'Media' }], default: [] },
    isFeatured: { type: Boolean, required: true, default: false },
    ...contentItemFields,
  },
  { timestamps: true, collection: 'projects' },
);

projectSchema.index({ isVisible: 1, order: 1 });

export type Project = InferSchemaType<typeof projectSchema>;

export const ProjectModel = model('Project', projectSchema);
