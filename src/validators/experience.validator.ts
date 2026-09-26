import { z } from 'zod';

import {
  mediaIdSchema,
  optionalHttpUrlSchema,
  optionalText,
  requiredText,
  TEXT_LIMITS,
  textList,
  yearMonthSchema,
} from './common.validator.js';

const experienceFields = z.object({
  company: requiredText(TEXT_LIMITS.name),
  role: requiredText(TEXT_LIMITS.name),
  location: optionalText(TEXT_LIMITS.name),
  startDate: yearMonthSchema,
  endDate: yearMonthSchema.nullable().optional(),
  summary: optionalText(TEXT_LIMITS.summary),
  highlights: textList({ maxItems: 20, maxLength: TEXT_LIMITS.listItem }).optional(),
  techStack: textList({ maxItems: 30, maxLength: TEXT_LIMITS.tag }).optional(),
  companyLogo: mediaIdSchema,
  companyUrl: optionalHttpUrlSchema,
  isVisible: z.boolean().optional(),
});

// The end-date check needs both dates, so on update the service runs it against the merged document.
export const createExperienceSchema = experienceFields;
export const updateExperienceSchema = experienceFields.partial();

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
