import { model, Schema } from 'mongoose';

import { mediaReference, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

export const SOCIAL_PLATFORMS = [
  'github',
  'linkedin',
  'x',
  'instagram',
  'youtube',
  'medium',
  'devto',
  'stackoverflow',
  'leetcode',
  'website',
  'email',
  'other',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

const socialLinkSchema = new Schema(
  {
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    // Shown instead of the platform name; required for `other`.
    label: optionalString,
    url: { type: String, required: true },
    isVisible: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const languageSchema = new Schema(
  {
    name: { type: String, required: true },
    proficiency: optionalString,
  },
  { _id: false },
);

// Optional profile details, each with its own show/hide toggle.
function toggleableField<T>(value: T) {
  return {
    value,
    isVisible: { type: Boolean, required: true, default: false },
  };
}

const profileSchema = new Schema(
  {
    name: { type: String, default: '' },
    headline: { type: String, default: '' },
    heroPhrases: { type: [String], default: [] },
    about: { type: String, default: '' },
    photo: mediaReference,
    resume: mediaReference,
    // Array order is display order.
    socialLinks: { type: [socialLinkSchema], default: [] },
    location: toggleableField(optionalString),
    publicEmail: toggleableField(optionalString),
    isOpenToWork: toggleableField({ type: Boolean, required: true, default: false }),
    yearsOfExperience: toggleableField({ type: Number, default: null }),
    languages: toggleableField({ type: [languageSchema], default: [] }),
  },
  { timestamps: true, collection: 'profile' },
);

export type Profile = InferSchemaType<typeof profileSchema>;

export const ProfileModel = model('Profile', profileSchema);
