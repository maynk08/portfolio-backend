import type { Types } from 'mongoose';

export type ApiDocument<T> = Omit<T, '_id' | '__v'> & { id: string };

// API responses expose `id` instead of MongoDB's `_id`, and never the internal `__v` version key.
export function toApiDocument<T extends { _id: Types.ObjectId }>(document: T): ApiDocument<T> {
  const { _id, __v, ...fields } = document as T & { __v?: unknown };
  return { ...fields, id: _id.toString() };
}
