import { isValidObjectId } from 'mongoose';

import { UnauthorizedError, ValidationError } from '../errors/app-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { InvalidTokenError, issueAccessToken, verifyAccessToken } from '../lib/token.js';
import { AdminModel } from '../models/admin.model.js';

import type { IssuedToken } from '../lib/token.js';
import type { AdminProfile } from '../types/admin.types.js';
import type { ChangePasswordInput, LoginInput } from '../validators/auth.validator.js';
import type { Types } from 'mongoose';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const SESSION_ENDED_MESSAGE = 'Session has ended, please log in again';
const PROFILE_FIELDS = 'email lastLoginAt';

export interface LoginResult extends IssuedToken {
  admin: AdminProfile;
}

let dummyPasswordHash: Promise<string> | undefined;

// Comparing against a throwaway hash when the email is unknown keeps the response time the same,
// so timing cannot reveal whether an email belongs to the admin.
function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword('timing-equaliser-not-a-real-password');
  return dummyPasswordHash;
}

function toAdminProfile(admin: { _id: Types.ObjectId; email: string; lastLoginAt?: Date | null }): AdminProfile {
  return { id: admin._id.toString(), email: admin.email, lastLoginAt: admin.lastLoginAt ?? null };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const admin = await AdminModel.findOne({ email: input.email }).select('+passwordHash sessionVersion email').lean();
  if (admin === null) {
    await verifyPassword(input.password, await getDummyPasswordHash());
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const isPasswordCorrect = await verifyPassword(input.password, admin.passwordHash);
  if (!isPasswordCorrect) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const lastLoginAt = new Date();
  await AdminModel.updateOne({ _id: admin._id }, { $set: { lastLoginAt } });
  const issuedToken = await issueAccessToken({ adminId: admin._id.toString(), sessionVersion: admin.sessionVersion });

  return { ...issuedToken, admin: toAdminProfile({ ...admin, lastLoginAt }) };
}

export async function authenticate(token: string): Promise<AdminProfile> {
  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw new UnauthorizedError(SESSION_ENDED_MESSAGE);
    }
    throw error;
  }

  if (!isValidObjectId(claims.adminId)) {
    throw new UnauthorizedError(SESSION_ENDED_MESSAGE);
  }
  const admin = await AdminModel.findById(claims.adminId).select(`${PROFILE_FIELDS} sessionVersion`).lean();
  if (admin?.sessionVersion !== claims.sessionVersion) {
    throw new UnauthorizedError(SESSION_ENDED_MESSAGE);
  }

  return toAdminProfile(admin);
}

export async function logout(adminId: string): Promise<void> {
  await AdminModel.updateOne({ _id: adminId }, { $inc: { sessionVersion: 1 } });
}

// Ends every existing session and returns a fresh token so the caller stays logged in.
export async function changePassword(adminId: string, input: ChangePasswordInput): Promise<IssuedToken> {
  const admin = await AdminModel.findById(adminId).select('+passwordHash').lean();
  if (admin === null) {
    throw new UnauthorizedError(SESSION_ENDED_MESSAGE);
  }

  const isCurrentPasswordCorrect = await verifyPassword(input.currentPassword, admin.passwordHash);
  if (!isCurrentPasswordCorrect) {
    // A validation error rather than 401, so the CMS does not treat a typo as an expired session.
    throw new ValidationError([{ field: 'currentPassword', message: 'Current password is incorrect' }]);
  }

  const passwordHash = await hashPassword(input.newPassword);
  const updatedAdmin = await AdminModel.findByIdAndUpdate(
    adminId,
    { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
    { returnDocument: 'after', projection: { sessionVersion: 1 } },
  ).lean();
  if (updatedAdmin === null) {
    throw new UnauthorizedError(SESSION_ENDED_MESSAGE);
  }

  return issueAccessToken({ adminId, sessionVersion: updatedAdmin.sessionVersion });
}
