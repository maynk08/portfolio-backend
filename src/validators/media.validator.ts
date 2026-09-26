import { z } from 'zod';

import { optionalText, paginationQuerySchema, requiredText, TEXT_LIMITS } from './common.validator.js';
import { MEDIA_MIME_TYPES, MEDIA_TYPES } from '../config/media-types.js';

const MAX_IMAGE_DIMENSION = 20_000;
const MEGABYTE = 1024 * 1024;

const dimensionSchema = z.number().int().min(1).max(MAX_IMAGE_DIMENSION).nullable().optional();

export const uploadUrlSchema = z
  .object({
    fileName: requiredText(TEXT_LIMITS.title),
    mimeType: z.enum(MEDIA_MIME_TYPES, 'Allowed types: JPEG, PNG, WebP, AVIF, GIF images and PDF'),
    size: z.number().int().min(1),
    // Read by the browser before uploading; images only.
    width: dimensionSchema,
    height: dimensionSchema,
    altText: optionalText(TEXT_LIMITS.listItem),
  })
  .superRefine((input, context) => {
    const { maxBytes } = MEDIA_TYPES[input.mimeType];
    if (input.size > maxBytes) {
      context.addIssue({ code: 'custom', path: ['size'], message: `Must be at most ${maxBytes / MEGABYTE} MB for this file type` });
    }
  });

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

export const updateMediaSchema = z
  .object({
    altText: optionalText(TEXT_LIMITS.listItem),
    isVisible: z.boolean(),
  })
  .partial();

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const listMediaQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(['image', 'document']).optional(),
});

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

export const deleteMediaQuerySchema = z.object({
  // Set after the admin has confirmed deleting a file that is still in use.
  force: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type DeleteMediaQuery = z.infer<typeof deleteMediaQuerySchema>;
