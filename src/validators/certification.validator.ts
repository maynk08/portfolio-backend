import { z } from 'zod';

import { mediaIdSchema, optionalHttpUrlSchema, optionalText, requiredText, TEXT_LIMITS, yearMonthSchema } from './common.validator.js';

const certificationFields = z.object({
  name: requiredText(TEXT_LIMITS.title),
  issuer: requiredText(TEXT_LIMITS.name),
  issueDate: yearMonthSchema,
  expiryDate: yearMonthSchema.nullable().optional(),
  credentialId: optionalText(TEXT_LIMITS.name),
  credentialUrl: optionalHttpUrlSchema,
  badge: mediaIdSchema,
  isVisible: z.boolean().optional(),
});

export const createCertificationSchema = certificationFields;
export const updateCertificationSchema = certificationFields.partial();

export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;
