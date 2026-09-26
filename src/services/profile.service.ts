import { assertMediaReferences } from './media.service.js';
import { ProfileModel } from '../models/profile.model.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { StoredDocument } from './shared/content-query.js';
import type { Profile } from '../models/profile.model.js';
import type { ApiDocument } from '../utils/serialize.utils.js';
import type { ProfileInput } from '../validators/profile.validator.js';

// The profile is a singleton created at startup; a missing one means startup did not finish, so it is a server error.
const MISSING_PROFILE_MESSAGE = 'Profile document is missing; ensureDefaultContent must run at startup';

export async function ensureProfile(): Promise<void> {
  const hasProfile = (await ProfileModel.exists({})) !== null;
  if (!hasProfile) {
    await ProfileModel.create({});
  }
}

export async function getProfile(): Promise<ApiDocument<StoredDocument<Profile>>> {
  const profile = await ProfileModel.findOne().lean();
  if (profile === null) {
    throw new Error(MISSING_PROFILE_MESSAGE);
  }
  return toApiDocument(profile);
}

export async function replaceProfile(input: ProfileInput): Promise<ApiDocument<StoredDocument<Profile>>> {
  await assertMediaReferences([
    { field: 'photo', id: input.photo, kind: 'image' },
    { field: 'resume', id: input.resume, kind: 'document' },
  ]);
  const profile = await ProfileModel.findOneAndUpdate({}, { $set: input }, { returnDocument: 'after', runValidators: true }).lean();
  if (profile === null) {
    throw new Error(MISSING_PROFILE_MESSAGE);
  }
  return toApiDocument(profile);
}
