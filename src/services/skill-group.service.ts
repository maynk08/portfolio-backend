import { SkillGroupModel } from '../models/skill-group.model.js';
import {
  createDocument,
  deleteByIdOrThrow,
  findByIdOrThrow,
  findPage,
  manualOrderSort,
  updateByIdOrThrow,
} from './shared/content-query.js';
import { applyManualOrder, getNextOrder } from './shared/manual-order.js';
import { toApiDocument } from '../utils/serialize.utils.js';

import type { CrudService } from './shared/crud-service.types.js';
import type { CreateSkillGroupInput, UpdateSkillGroupInput } from '../validators/skill-group.validator.js';

const NOT_FOUND_MESSAGE = 'Skill group not found';

export const skillGroupService: CrudService<CreateSkillGroupInput, UpdateSkillGroupInput> = {
  list: (query) => findPage(SkillGroupModel, manualOrderSort, query),

  getById: async (id) => toApiDocument(await findByIdOrThrow(SkillGroupModel, id, NOT_FOUND_MESSAGE)),

  create: async (input) => createDocument(SkillGroupModel, { ...input, order: await getNextOrder(SkillGroupModel) }),

  update: (id, input) => updateByIdOrThrow(SkillGroupModel, id, input, NOT_FOUND_MESSAGE),

  remove: (id) => deleteByIdOrThrow(SkillGroupModel, id, NOT_FOUND_MESSAGE),

  reorder: (ids) => applyManualOrder(SkillGroupModel, ids),
};
