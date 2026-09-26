import { z } from 'zod';

import {
  mediaIdSchema,
  objectIdSchema,
  optionalHttpUrlSchema,
  optionalText,
  requiredText,
  TEXT_LIMITS,
  textList,
} from './common.validator.js';
import { MAX_SLUG_LENGTH, SLUG_PATTERN } from '../utils/slug.utils.js';

const MAX_GALLERY_IMAGES = 20;

const slugSchema = z
  .string()
  .trim()
  .max(MAX_SLUG_LENGTH)
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens, for example my-project');

const projectFields = z.object({
  title: requiredText(TEXT_LIMITS.title),
  slug: slugSchema,
  summary: optionalText(TEXT_LIMITS.summary),
  description: optionalText(TEXT_LIMITS.markdown),
  role: optionalText(TEXT_LIMITS.name),
  techStack: textList({ maxItems: 30, maxLength: TEXT_LIMITS.tag }).optional(),
  liveUrl: optionalHttpUrlSchema,
  repoUrl: optionalHttpUrlSchema,
  coverImage: mediaIdSchema,
  gallery: z.array(objectIdSchema).max(MAX_GALLERY_IMAGES).optional(),
  isFeatured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

// On create the slug is generated from the title when left out.
export const createProjectSchema = projectFields.extend({ slug: slugSchema.optional() });
export const updateProjectSchema = projectFields.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
