import { CertificationModel } from '../models/certification.model.js';
import { EducationModel } from '../models/education.model.js';
import { ExperienceModel } from '../models/experience.model.js';
import { ProfileModel } from '../models/profile.model.js';
import { ProjectModel } from '../models/project.model.js';

import type { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';

export interface MediaUsage {
  resource: 'profile' | 'experience' | 'project' | 'education' | 'certification';
  id: string;
  // Human-readable name of the item, for the CMS "where used" list.
  label: string;
  field: string;
}

interface MediaReferenceField {
  findUsages(mediaId: string): Promise<MediaUsage[]>;
  detach(mediaId: string): Promise<void>;
}

// One field that can hold a media ID: a single reference, or a list of them (`isList`).
function referenceField<T>(options: {
  model: Model<T>;
  resource: MediaUsage['resource'];
  field: string;
  describe: (document: Record<string, unknown>) => string;
  labelFields: string;
  isList?: boolean;
}): MediaReferenceField {
  const { model, resource, field, describe, labelFields, isList = false } = options;
  // The field name is dynamic, so TypeScript cannot check these against the model's type; Mongoose still casts the ID.
  const filterFor = (mediaId: string): QueryFilter<T> => ({ [field]: mediaId });
  const detachUpdate = (mediaId: string): UpdateQuery<T> =>
    (isList ? { $pull: { [field]: mediaId } } : { $set: { [field]: null } }) as UpdateQuery<T>;

  return {
    findUsages: async (mediaId) => {
      const documents = await model
        .find(filterFor(mediaId))
        .select(labelFields)
        .lean<(Record<string, unknown> & { _id: Types.ObjectId })[]>();
      return documents.map((document) => ({ resource, id: document._id.toString(), label: describe(document), field }));
    },
    detach: async (mediaId) => {
      await model.updateMany(filterFor(mediaId), detachUpdate(mediaId));
    },
  };
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const REFERENCE_FIELDS: MediaReferenceField[] = [
  referenceField({ model: ProfileModel, resource: 'profile', field: 'photo', labelFields: '_id', describe: () => 'Profile' }),
  referenceField({ model: ProfileModel, resource: 'profile', field: 'resume', labelFields: '_id', describe: () => 'Profile' }),
  referenceField({
    model: ExperienceModel,
    resource: 'experience',
    field: 'companyLogo',
    labelFields: 'company role',
    describe: (experience) => `${textOf(experience.role)} at ${textOf(experience.company)}`,
  }),
  referenceField({
    model: ProjectModel,
    resource: 'project',
    field: 'coverImage',
    labelFields: 'title',
    describe: (project) => textOf(project.title),
  }),
  referenceField({
    model: ProjectModel,
    resource: 'project',
    field: 'gallery',
    labelFields: 'title',
    describe: (project) => textOf(project.title),
    isList: true,
  }),
  referenceField({
    model: EducationModel,
    resource: 'education',
    field: 'logo',
    labelFields: 'institution degree',
    describe: (education) => `${textOf(education.degree)}, ${textOf(education.institution)}`,
  }),
  referenceField({
    model: CertificationModel,
    resource: 'certification',
    field: 'badge',
    labelFields: 'name',
    describe: (certification) => textOf(certification.name),
  }),
];

// Computed on demand from the content collections, so it can never go stale.
export async function findMediaUsages(mediaId: string): Promise<MediaUsage[]> {
  const usagesPerField = await Promise.all(REFERENCE_FIELDS.map((referenceField) => referenceField.findUsages(mediaId)));
  return usagesPerField.flat();
}

export async function detachMediaEverywhere(mediaId: string): Promise<void> {
  await Promise.all(REFERENCE_FIELDS.map((referenceField) => referenceField.detach(mediaId)));
}
