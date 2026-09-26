import { model, Schema } from 'mongoose';

import type { InferSchemaType } from 'mongoose';

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Embedded in every token; incrementing it invalidates all tokens issued before (logout, password change).
    sessionVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Admin = InferSchemaType<typeof adminSchema>;

export const AdminModel = model('Admin', adminSchema);
