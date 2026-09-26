import { Types } from 'mongoose';

import { ValidationError } from '../../errors/app-error.js';

import type { Model } from 'mongoose';

// New items go to the end of the list.
export async function getNextOrder<T extends { order: number }>(model: Model<T>): Promise<number> {
  const lastDocument = await model.findOne().sort({ order: -1 }).select('order').lean<{ order: number }>();
  return (lastDocument?.order ?? -1) + 1;
}

// `ids` must name every document exactly once, so a stale list from the CMS cannot silently drop items.
export async function applyManualOrder<T extends { order: number }>(model: Model<T>, ids: string[]): Promise<void> {
  const existingDocuments = await model.find().select('_id').lean<{ _id: Types.ObjectId }[]>();
  const existingIds = new Set(existingDocuments.map((document) => document._id.toString()));
  const requestedIds = new Set(ids);

  const isCompleteList =
    requestedIds.size === ids.length && requestedIds.size === existingIds.size && ids.every((id) => existingIds.has(id));
  if (!isCompleteList) {
    throw new ValidationError([{ field: 'ids', message: 'Must list every item exactly once' }]);
  }

  // Goes through the driver collection because Mongoose's bulk-write types cannot be resolved for a generic model.
  await model.collection.bulkWrite(
    ids.map((id, index) => ({ updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { order: index } } } })),
  );
}
