import { z } from 'zod';

import { emailSchema } from './auth.validator.js';
import { httpUrlSchema, mediaIdSchema, optionalText, requiredText, TEXT_LIMITS, textList } from './common.validator.js';
import { SOCIAL_PLATFORMS } from '../models/profile.model.js';

const MAX_HERO_PHRASES = 10;
const MAX_SOCIAL_LINKS = 20;
const MAX_LANGUAGES = 20;
const MAX_YEARS_OF_EXPERIENCE = 80;

const mailtoUrlSchema = z
  .string()
  .trim()
  .max(TEXT_LIMITS.url)
  .refine((url) => url.startsWith('mailto:') && emailSchema.safeParse(url.slice('mailto:'.length)).success, 'Must be a mailto: link');

const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

// The platform decides which URL is valid and whether a label is required.
const socialLinkSchema = z.discriminatedUnion('platform', [
  z.object({
    platform: socialPlatformSchema.exclude(['email', 'other']),
    label: optionalText(TEXT_LIMITS.tag),
    url: httpUrlSchema,
    isVisible: z.boolean(),
  }),
  z.object({
    platform: z.literal('email'),
    label: optionalText(TEXT_LIMITS.tag),
    url: mailtoUrlSchema,
    isVisible: z.boolean(),
  }),
  z.object({
    platform: z.literal('other'),
    label: requiredText(TEXT_LIMITS.tag),
    url: httpUrlSchema,
    isVisible: z.boolean(),
  }),
]);

function toggleable<T extends z.ZodType>(valueSchema: T) {
  return z.object({ value: valueSchema, isVisible: z.boolean() });
}

// PUT replaces the whole profile, so every field is required; optional details use null for "not set".
export const profileSchema = z.object({
  name: requiredText(TEXT_LIMITS.name),
  headline: requiredText(TEXT_LIMITS.title),
  heroPhrases: textList({ maxItems: MAX_HERO_PHRASES, maxLength: TEXT_LIMITS.name }),
  about: z.string().trim().max(TEXT_LIMITS.markdown),
  photo: mediaIdSchema,
  resume: mediaIdSchema,
  socialLinks: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS),
  location: toggleable(optionalText(TEXT_LIMITS.name).transform((value) => value ?? null)),
  publicEmail: toggleable(emailSchema.nullable()),
  isOpenToWork: toggleable(z.boolean()),
  yearsOfExperience: toggleable(z.number().int().min(0).max(MAX_YEARS_OF_EXPERIENCE).nullable()),
  languages: toggleable(
    z
      .array(
        z.object({
          name: requiredText(TEXT_LIMITS.tag),
          proficiency: optionalText(TEXT_LIMITS.tag),
        }),
      )
      .max(MAX_LANGUAGES),
  ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
