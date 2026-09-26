import { z } from 'zod';

import { mediaIdSchema, optionalText, requiredText, TEXT_LIMITS, yearMonthSchema } from './common.validator.js';

const educationFields = z.object({
  institution: requiredText(TEXT_LIMITS.title),
  degree: requiredText(TEXT_LIMITS.name),
  field: optionalText(TEXT_LIMITS.name),
  startDate: yearMonthSchema,
  endDate: yearMonthSchema.nullable().optional(),
  grade: optionalText(TEXT_LIMITS.tag),
  description: optionalText(TEXT_LIMITS.summary),
  logo: mediaIdSchema,
  isVisible: z.boolean().optional(),
});

export const createEducationSchema = educationFields;
export const updateEducationSchema = educationFields.partial();

export type CreateEducationInput = z.infer<typeof createEducationSchema>;
export type UpdateEducationInput = z.infer<typeof updateEducationSchema>;
