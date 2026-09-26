import { model, Schema } from 'mongoose';

import { contentItemFields, mediaReference, optionalString } from './shared-fields.js';

import type { InferSchemaType } from 'mongoose';

const certificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: String, required: true },
    // null means it does not expire.
    expiryDate: optionalString,
    credentialId: optionalString,
    credentialUrl: optionalString,
    badge: mediaReference,
    ...contentItemFields,
  },
  { timestamps: true, collection: 'certifications' },
);

export type Certification = InferSchemaType<typeof certificationSchema>;

export const CertificationModel = model('Certification', certificationSchema);
