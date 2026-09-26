import { ConflictError, ValidationError } from '../errors/app-error.js';
import { ProjectModel } from '../models/project.model.js';
import {
  createDocument,
  deleteByIdOrThrow,
  findByIdOrThrow,
  findPage,
  manualOrderSort,
  updateByIdOrThrow,
  withDuplicateKeyAsConflict,
} from './shared/content-query.js';
import { applyManualOrder, getNextOrder } from './shared/manual-order.js';
import { toApiDocument } from '../utils/serialize.utils.js';
import { MAX_SLUG_LENGTH, slugify } from '../utils/slug.utils.js';

import type { CrudService } from './shared/crud-service.types.js';
import type { CreateProjectInput, UpdateProjectInput } from '../validators/project.validator.js';

const NOT_FOUND_MESSAGE = 'Project not found';
const SLUG_TAKEN_MESSAGE = 'This slug is already used by another project';
const MAX_SLUG_SUFFIX = 100;

async function isSlugTaken(slug: string, exceptProjectId?: string): Promise<boolean> {
  const project = await ProjectModel.findOne({ slug }).select('_id').lean();
  return project !== null && project._id.toString() !== exceptProjectId;
}

// Turns the title into a slug and appends -2, -3, ... until it is free.
async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title);
  if (baseSlug === '') {
    throw new ValidationError([{ field: 'slug', message: 'The title has no letters or numbers to build a slug from; enter a slug' }]);
  }

  for (let suffix = 1; suffix <= MAX_SLUG_SUFFIX; suffix += 1) {
    const suffixText = suffix === 1 ? '' : `-${suffix}`;
    const candidate = `${baseSlug.slice(0, MAX_SLUG_LENGTH - suffixText.length).replace(/-+$/, '')}${suffixText}`;
    if (!(await isSlugTaken(candidate))) {
      return candidate;
    }
  }
  throw new ConflictError(SLUG_TAKEN_MESSAGE);
}

export const projectService: CrudService<CreateProjectInput, UpdateProjectInput> = {
  list: (query) => findPage(ProjectModel, manualOrderSort, query),

  getById: async (id) => toApiDocument(await findByIdOrThrow(ProjectModel, id, NOT_FOUND_MESSAGE)),

  // The slug is fixed once created (changing the title keeps it), so shared links keep working.
  create: async (input) => {
    if (input.slug !== undefined && (await isSlugTaken(input.slug))) {
      throw new ConflictError(SLUG_TAKEN_MESSAGE);
    }
    const slug = input.slug ?? (await generateUniqueSlug(input.title));
    const order = await getNextOrder(ProjectModel);
    return withDuplicateKeyAsConflict(createDocument(ProjectModel, { ...input, slug, order }), SLUG_TAKEN_MESSAGE);
  },

  update: async (id, input) => {
    if (input.slug !== undefined && (await isSlugTaken(input.slug, id))) {
      throw new ConflictError(SLUG_TAKEN_MESSAGE);
    }
    return withDuplicateKeyAsConflict(updateByIdOrThrow(ProjectModel, id, input, NOT_FOUND_MESSAGE), SLUG_TAKEN_MESSAGE);
  },

  remove: (id) => deleteByIdOrThrow(ProjectModel, id, NOT_FOUND_MESSAGE),

  reorder: (ids) => applyManualOrder(ProjectModel, ids),
};
