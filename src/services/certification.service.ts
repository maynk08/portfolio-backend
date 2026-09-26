import { CertificationModel } from '../models/certification.model.js';
import {
  createDocument,
  deleteByIdOrThrow,
  findByIdOrThrow,
  findPage,
  throwIfFieldErrors,
  updateByIdOrThrow,
} from './shared/content-query.js';
import { checkDateRange } from '../utils/date-range.utils.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { CrudService } from './shared/crud-service.types.js';
import type { CreateCertificationInput, UpdateCertificationInput } from '../validators/certification.validator.js';
import type { PipelineStage } from 'mongoose';

const NOT_FOUND_MESSAGE = 'Certification not found';
const NEWEST_ISSUED_FIRST: PipelineStage[] = [{ $sort: { issueDate: -1, _id: -1 } }];

export const certificationService: CrudService<CreateCertificationInput, UpdateCertificationInput> = {
  list: (query) => findPage(CertificationModel, NEWEST_ISSUED_FIRST, query),

  getById: async (id) => toApiDocument(await findByIdOrThrow(CertificationModel, id, NOT_FOUND_MESSAGE)),

  create: (input) => {
    throwIfFieldErrors(checkDateRange(input.issueDate, input.expiryDate, 'expiryDate'));
    return createDocument(CertificationModel, input);
  },

  update: async (id, input) => {
    const existing = await findByIdOrThrow(CertificationModel, id, NOT_FOUND_MESSAGE);
    throwIfFieldErrors(
      checkDateRange(
        input.issueDate ?? existing.issueDate,
        input.expiryDate === undefined ? existing.expiryDate : input.expiryDate,
        'expiryDate',
      ),
    );
    return updateByIdOrThrow(CertificationModel, id, input, NOT_FOUND_MESSAGE);
  },

  remove: (id) => deleteByIdOrThrow(CertificationModel, id, NOT_FOUND_MESSAGE),
};
