import { z } from 'zod';

import { requiredText, TEXT_LIMITS } from './common.validator.js';
import { SECTION_KEYS } from '../models/section.model.js';

export const sectionParamsSchema = z.object({ key: z.enum(SECTION_KEYS) });

export type SectionParams = z.infer<typeof sectionParamsSchema>;

export const updateSectionSchema = z
  .object({
    heading: requiredText(TEXT_LIMITS.name),
    isVisible: z.boolean(),
  })
  .partial();

export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

// The full display order; the service checks that every section appears once and the hero stays first.
export const sectionOrderSchema = z.object({
  keys: z.array(z.enum(SECTION_KEYS)).min(1).max(SECTION_KEYS.length),
});

export type SectionOrderInput = z.infer<typeof sectionOrderSchema>;
