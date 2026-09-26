import { EducationModel } from '../models/education.model.js';
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
import type { CreateEducationInput, UpdateEducationInput } from '../validators/education.validator.js';

const NOT_FOUND_MESSAGE = 'Education entry not found';

export const educationService: CrudService<CreateEducationInput, UpdateEducationInput> = {
  list: (query) => findPage(EducationModel, newestFirstSort('startDate', 'endDate'), query),

  getById: async (id) => toApiDocument(await findByIdOrThrow(EducationModel, id, NOT_FOUND_MESSAGE)),

  create: (input) => {
    throwIfFieldErrors(checkDateRange(input.startDate, input.endDate, 'endDate'));
    return createDocument(EducationModel, input);
  },

  update: async (id, input) => {
    const existing = await findByIdOrThrow(EducationModel, id, NOT_FOUND_MESSAGE);
    throwIfFieldErrors(
      checkDateRange(input.startDate ?? existing.startDate, input.endDate === undefined ? existing.endDate : input.endDate, 'endDate'),
    );
    return updateByIdOrThrow(EducationModel, id, input, NOT_FOUND_MESSAGE);
  },

  remove: (id) => deleteByIdOrThrow(EducationModel, id, NOT_FOUND_MESSAGE),
};
