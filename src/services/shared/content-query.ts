import { mongo } from 'mongoose';

import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { buildPaginationMeta } from '../../utils/pagination.utils.js';
import { toApiDocument } from '../../utils/serialize.utils.js';

import type { FieldError } from '../../errors/app-error.js';
import type { PaginationMeta } from '../../utils/pagination.utils.js';
import type { ApiDocument } from '../../utils/serialize.utils.js';
import type { PaginationQuery } from '../../validators/common.validator.js';
import type { Model, PipelineStage, QueryFilter, Types, UpdateQuery } from 'mongoose';

const QUERY_MAX_TIME_MS = 5_000;
const DUPLICATE_KEY_ERROR_CODE = 11000;

export type StoredDocument<T> = T & { _id: Types.ObjectId };

export interface Page<T> {
  items: ApiDocument<StoredDocument<T>>[];
  pagination: PaginationMeta;
}

export const manualOrderSort: PipelineStage[] = [{ $sort: { order: 1, _id: 1 } }];

// Newest first, with ongoing items (no end date) ahead of finished ones.
export function newestFirstSort(startField: string, endField: string): PipelineStage[] {
  return [
    { $addFields: { isOngoing: { $eq: [{ $ifNull: [`$${endField}`, null] }, null] } } },
    { $sort: { isOngoing: -1, [endField]: -1, [startField]: -1, _id: -1 } },
    { $unset: 'isOngoing' },
  ];
}

// `filter` must be built from validated values; wrap operator objects in `mongoose.trusted` so `sanitizeFilter` keeps them.
export async function findPage<T>(
  model: Model<T>,
  sortStages: PipelineStage[],
  { page, pageSize }: PaginationQuery,
  filter: QueryFilter<T> = {},
): Promise<Page<T>> {
  const [documents, totalItems] = await Promise.all([
    model
      .aggregate<StoredDocument<T>>([{ $match: filter }, ...sortStages, { $skip: (page - 1) * pageSize }, { $limit: pageSize }])
      .option({ maxTimeMS: QUERY_MAX_TIME_MS }),
    model.countDocuments(filter).maxTimeMS(QUERY_MAX_TIME_MS),
  ]);
  return { items: documents.map((document) => toApiDocument(document)), pagination: buildPaginationMeta(page, pageSize, totalItems) };
}

export async function findByIdOrThrow<T>(model: Model<T>, id: string, notFoundMessage: string): Promise<StoredDocument<T>> {
  const document = await model.findById(id).lean<StoredDocument<T>>();
  if (document === null) {
    throw new NotFoundError(notFoundMessage);
  }
  return document;
}

export async function createDocument<T>(model: Model<T>, fields: object): Promise<ApiDocument<StoredDocument<T>>> {
  const document = await model.create(fields);
  return toApiDocument(document.toObject<StoredDocument<T>>());
}

export async function updateByIdOrThrow<T>(
  model: Model<T>,
  id: string,
  fields: UpdateQuery<T>,
  notFoundMessage: string,
): Promise<ApiDocument<StoredDocument<T>>> {
  const document = await model
    .findByIdAndUpdate(id, { $set: fields }, { returnDocument: 'after', runValidators: true })
    .lean<StoredDocument<T>>();
  if (document === null) {
    throw new NotFoundError(notFoundMessage);
  }
  return toApiDocument(document);
}

export async function deleteByIdOrThrow<T>(model: Model<T>, id: string, notFoundMessage: string): Promise<void> {
  const document = await model.findByIdAndDelete(id).lean();
  if (document === null) {
    throw new NotFoundError(notFoundMessage);
  }
}

export function throwIfFieldErrors(errors: FieldError[]): void {
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

// Unique indexes are the final guard against two writes racing past an earlier uniqueness check.
export async function withDuplicateKeyAsConflict<T>(write: Promise<T>, conflictMessage: string): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw new ConflictError(conflictMessage);
    }
    throw error;
  }
}
