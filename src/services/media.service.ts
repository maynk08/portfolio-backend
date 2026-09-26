import mongoose, { Types } from 'mongoose';

import { findMediaUsages, detachMediaEverywhere } from './media-usage.service.js';
import { findByIdOrThrow, findPage, throwIfFieldErrors, updateByIdOrThrow } from './shared/content-query.js';
import { getMimeTypesOfKind, isMediaMimeType, MEDIA_TYPES } from '../config/media-types.js';
import { ConflictError } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';
import { getStorage, isStorageConfigured } from '../lib/storage/index.js';
import { MediaModel } from '../models/media.model.js';
import { toApiDocument } from '../utils/serialize.utils.js';
import { slugify } from '../utils/slug.utils.js';

import type { MediaUsage } from './media-usage.service.js';
import type { Page, StoredDocument } from './shared/content-query.js';
import type { MediaKind } from '../config/media-types.js';
import type { FieldError } from '../errors/app-error.js';
import type { UploadForm } from '../lib/storage/media-storage.js';
import type { Media } from '../models/media.model.js';
import type { ApiDocument } from '../utils/serialize.utils.js';
import type { ListMediaQuery, UpdateMediaInput, UploadUrlInput } from '../validators/media.validator.js';
import type { PipelineStage, QueryFilter } from 'mongoose';

type MediaDocument = ApiDocument<StoredDocument<Media>>;

const NOT_FOUND_MESSAGE = 'File not found';
const MAX_FILE_NAME_SLUG_LENGTH = 60;
const NEWEST_FIRST: PipelineStage[] = [{ $sort: { createdAt: -1, _id: -1 } }];
const STALE_PENDING_AGE_MS = 60 * 60 * 1000;
const STALE_PENDING_BATCH_SIZE = 100;

// Keys look like `media/<id>/<readable-name>.<ext>`: unique by ID, still recognisable in the S3 console.
function buildObjectKey(mediaId: Types.ObjectId, fileName: string, mimeType: keyof typeof MEDIA_TYPES): string {
  const baseName = fileName.replace(/\.[^.]*$/, '');
  const readableName = slugify(baseName).slice(0, MAX_FILE_NAME_SLUG_LENGTH).replace(/-+$/, '') || 'file';
  return `media/${mediaId.toString()}/${readableName}.${MEDIA_TYPES[mimeType].extension}`;
}

async function deleteStoredObject(key: string): Promise<void> {
  if (!isStorageConfigured()) {
    logger.warn({ key }, 'Media storage is not configured, so the stored file could not be deleted');
    return;
  }
  try {
    await getStorage().deleteObject(key);
  } catch (error) {
    // The database record is already gone, so the request succeeds; the orphaned object is logged for manual cleanup.
    logger.error({ err: error, key }, 'Failed to delete a file from storage');
  }
}

export async function createUpload(input: UploadUrlInput): Promise<{ media: MediaDocument; upload: UploadForm }> {
  const storage = getStorage();
  const mediaId = new Types.ObjectId();
  const key = buildObjectKey(mediaId, input.fileName, input.mimeType);

  const upload = await storage.createUploadForm({ key, contentType: input.mimeType, maxBytes: MEDIA_TYPES[input.mimeType].maxBytes });
  const isImage = MEDIA_TYPES[input.mimeType].kind === 'image';
  const media = await MediaModel.create({
    _id: mediaId,
    key,
    url: storage.getPublicUrl(key),
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    width: isImage ? (input.width ?? null) : null,
    height: isImage ? (input.height ?? null) : null,
    altText: input.altText ?? null,
    status: 'pending',
  });

  return { media: toApiDocument(media.toObject()), upload };
}

// Confirms the browser's upload reached storage and matches what was requested, then makes the file usable.
export async function completeUpload(id: string): Promise<MediaDocument> {
  const media = await findByIdOrThrow(MediaModel, id, NOT_FOUND_MESSAGE);
  if (media.status === 'ready') {
    return toApiDocument(media);
  }

  const storedObject = await getStorage().getObjectInfo(media.key);
  if (storedObject === null) {
    throw new ConflictError('The file has not been uploaded yet');
  }
  if (storedObject.size !== media.size || storedObject.contentType !== media.mimeType) {
    await MediaModel.deleteOne({ _id: media._id });
    await deleteStoredObject(media.key);
    throw new ConflictError('The uploaded file does not match the upload request; please upload it again');
  }

  return updateByIdOrThrow(MediaModel, id, { status: 'ready' }, NOT_FOUND_MESSAGE);
}

// Pending uploads are never listed: they are either still in progress or were abandoned.
export function listMedia(query: ListMediaQuery): Promise<Page<Media>> {
  const filter: QueryFilter<Media> = { status: 'ready' };
  if (query.kind !== undefined) {
    filter.mimeType = mongoose.trusted({ $in: getMimeTypesOfKind(query.kind) });
  }
  return findPage(MediaModel, NEWEST_FIRST, query, filter);
}

export async function getMedia(id: string): Promise<MediaDocument> {
  return toApiDocument(await findByIdOrThrow(MediaModel, id, NOT_FOUND_MESSAGE));
}

export function updateMedia(id: string, input: UpdateMediaInput): Promise<MediaDocument> {
  return updateByIdOrThrow(MediaModel, id, input, NOT_FOUND_MESSAGE);
}

export async function getMediaUsages(id: string): Promise<MediaUsage[]> {
  await findByIdOrThrow(MediaModel, id, NOT_FOUND_MESSAGE);
  return findMediaUsages(id);
}

/**
 * Deletes a file. A file that is still used is refused with its usages, unless `force` is set after the admin confirmed;
 * then it is detached everywhere first. The storage object is deleted last so a failure there cannot leave broken references.
 */
export async function deleteMedia(id: string, options: { force: boolean }): Promise<void> {
  const media = await findByIdOrThrow(MediaModel, id, NOT_FOUND_MESSAGE);

  const usages = await findMediaUsages(id);
  if (usages.length > 0) {
    if (!options.force) {
      throw new ConflictError('This file is in use', { details: { usages } });
    }
    await detachMediaEverywhere(id);
  }

  await MediaModel.deleteOne({ _id: media._id });
  await deleteStoredObject(media.key);
}

export interface MediaReference {
  field: string;
  id: string | null | undefined;
  kind: MediaKind;
}

// Content may only point at uploaded files of the right kind (an image field cannot hold a PDF).
export async function assertMediaReferences(references: MediaReference[]): Promise<void> {
  const referencedIds = [...new Set(references.flatMap((reference) => (typeof reference.id === 'string' ? [reference.id] : [])))];
  if (referencedIds.length === 0) {
    return;
  }

  const mediaDocuments = await MediaModel.find({ _id: mongoose.trusted({ $in: referencedIds }), status: 'ready' })
    .select('mimeType')
    .lean();
  const kindById = new Map(
    mediaDocuments.map((media) => [media._id.toString(), isMediaMimeType(media.mimeType) ? MEDIA_TYPES[media.mimeType].kind : undefined]),
  );

  const errors: FieldError[] = [];
  for (const { field, id, kind } of references) {
    if (typeof id !== 'string') {
      continue;
    }
    if (!kindById.has(id)) {
      errors.push({ field, message: 'File not found' });
    } else if (kindById.get(id) !== kind) {
      errors.push({ field, message: kind === 'image' ? 'Must be an image' : 'Must be a PDF' });
    }
  }
  throwIfFieldErrors(errors);
}

// Removes uploads that were started but never completed, together with any file that did reach storage.
export async function deleteStalePendingMedia(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_PENDING_AGE_MS);
  const staleMedia = await MediaModel.find({ status: 'pending', createdAt: mongoose.trusted({ $lt: cutoff }) })
    .select('key')
    .limit(STALE_PENDING_BATCH_SIZE)
    .lean();

  for (const media of staleMedia) {
    await MediaModel.deleteOne({ _id: media._id });
    if (isStorageConfigured()) {
      await deleteStoredObject(media.key);
    }
  }
  return staleMedia.length;
}
