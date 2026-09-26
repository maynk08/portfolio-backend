import { ExperienceModel } from '../models/experience.model.js';
import {
  createDocument,
  deleteByIdOrThrow,
  findByIdOrThrow,
  findPage,
  newestFirstSort,
  throwIfFieldErrors,
  updateByIdOrThrow,
} from './shared/content-query.js';
import { checkDateRange } from '../utils/date-range.utils.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { CrudService } from './shared/crud-service.types.js';
import type { CreateExperienceInput, UpdateExperienceInput } from '../validators/experience.validator.js';

const NOT_FOUND_MESSAGE = 'Experience not found';

export const experienceService: CrudService<CreateExperienceInput, UpdateExperienceInput> = {
  list: (query) => findPage(ExperienceModel, newestFirstSort('startDate', 'endDate'), query),

  getById: async (id) => toApiDocument(await findByIdOrThrow(ExperienceModel, id, NOT_FOUND_MESSAGE)),

  create: (input) => {
    throwIfFieldErrors(checkDateRange(input.startDate, input.endDate, 'endDate'));
    return createDocument(ExperienceModel, input);
  },

  update: async (id, input) => {
    const existing = await findByIdOrThrow(ExperienceModel, id, NOT_FOUND_MESSAGE);
    throwIfFieldErrors(
      checkDateRange(input.startDate ?? existing.startDate, input.endDate === undefined ? existing.endDate : input.endDate, 'endDate'),
    );
    return updateByIdOrThrow(ExperienceModel, id, input, NOT_FOUND_MESSAGE);
  },

  remove: (id) => deleteByIdOrThrow(ExperienceModel, id, NOT_FOUND_MESSAGE),
};
