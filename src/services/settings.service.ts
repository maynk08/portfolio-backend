import { SettingsModel } from '../models/settings.model.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { StoredDocument } from './shared/content-query.js';
import type { Settings } from '../models/settings.model.js';
import type { ApiDocument } from '../utils/serialize.utils.js';
import type { SettingsInput } from '../validators/settings.validator.js';

// Settings are a singleton created at startup; a missing document means startup did not finish.
const MISSING_SETTINGS_MESSAGE = 'Settings document is missing; ensureDefaultContent must run at startup';

export async function ensureSettings(): Promise<void> {
  const hasSettings = (await SettingsModel.exists({})) !== null;
  if (!hasSettings) {
    await SettingsModel.create({});
  }
}

export async function getSettings(): Promise<ApiDocument<StoredDocument<Settings>>> {
  const settings = await SettingsModel.findOne().lean();
  if (settings === null) {
    throw new Error(MISSING_SETTINGS_MESSAGE);
  }
  return toApiDocument(settings);
}

export async function replaceSettings(input: SettingsInput): Promise<ApiDocument<StoredDocument<Settings>>> {
  const settings = await SettingsModel.findOneAndUpdate({}, { $set: input }, { returnDocument: 'after', runValidators: true }).lean();
  if (settings === null) {
    throw new Error(MISSING_SETTINGS_MESSAGE);
  }
  return toApiDocument(settings);
}
