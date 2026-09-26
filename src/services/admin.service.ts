import { hashPassword } from '../lib/password.js';
import { AdminModel } from '../models/admin.model.js';

export type SetAdminCredentialsResult = 'created' | 'updated';

/**
 * Creates the single admin, or replaces the existing admin's email and password.
 * Replacing the password also ends every session, which makes this the recovery path for a forgotten password.
 */
export async function setAdminCredentials(email: string, password: string): Promise<SetAdminCredentialsResult> {
  const existingAdmins = await AdminModel.find().select('_id').limit(2).lean();
  if (existingAdmins.length > 1) {
    throw new Error('More than one admin exists; remove the extra admin documents before running the seed');
  }

  const passwordHash = await hashPassword(password);
  const [existingAdmin] = existingAdmins;
  if (existingAdmin === undefined) {
    await AdminModel.create({ email, passwordHash });
    return 'created';
  }

  await AdminModel.updateOne({ _id: existingAdmin._id }, { $set: { email, passwordHash }, $inc: { sessionVersion: 1 } });
  return 'updated';
}
