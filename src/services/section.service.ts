import { NotFoundError, ValidationError } from '../errors/app-error.js';
import { SECTION_KEYS, SectionModel } from '../models/section.model.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { StoredDocument } from './shared/content-query.js';
import type { Section } from '../models/section.model.js';
import type { SectionKey } from '../models/section.model.js';
import type { ApiDocument } from '../utils/serialize.utils.js';
import type { UpdateSectionInput } from '../validators/section.validator.js';

const DEFAULT_HEADINGS: Record<SectionKey, string> = {
  hero: 'Home',
  about: 'About',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  contact: 'Contact',
};

// Creates any missing sections with their defaults; existing sections are left untouched.
export async function ensureDefaultSections(): Promise<void> {
  await SectionModel.bulkWrite(
    SECTION_KEYS.map((key, index) => ({
      updateOne: {
        filter: { key },
        update: { $setOnInsert: { key, heading: DEFAULT_HEADINGS[key], isVisible: true, order: index, settings: {} } },
        upsert: true,
      },
    })),
  );
}

export async function listSections(): Promise<ApiDocument<StoredDocument<Section>>[]> {
  const sections = await SectionModel.find().sort({ order: 1 }).lean();
  return sections.map((section) => toApiDocument(section));
}

// Saves the display order. The hero is the top of the page (and holds its main heading), so it must stay first.
export async function reorderSections(keys: SectionKey[]): Promise<void> {
  const isCompleteList = new Set(keys).size === keys.length && keys.length === SECTION_KEYS.length;
  if (!isCompleteList) {
    throw new ValidationError([{ field: 'keys', message: 'Must list every section exactly once' }]);
  }
  if (keys[0] !== 'hero') {
    throw new ValidationError([{ field: 'keys', message: 'The hero must stay first' }]);
  }
  await SectionModel.bulkWrite(keys.map((key, index) => ({ updateOne: { filter: { key }, update: { $set: { order: index } } } })));
}

export async function updateSection(key: SectionKey, input: UpdateSectionInput): Promise<ApiDocument<StoredDocument<Section>>> {
  const section = await SectionModel.findOneAndUpdate({ key }, { $set: input }, { returnDocument: 'after', runValidators: true }).lean();
  if (section === null) {
    throw new NotFoundError('Section not found');
  }
  return toApiDocument(section);
}
