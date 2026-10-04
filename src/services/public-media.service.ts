import mongoose from 'mongoose';

import { isMediaMimeType, MEDIA_TYPES } from '../config/media-types.js';
import { MediaModel } from '../models/media.model.js';

import type { MediaKind } from '../config/media-types.js';
import type { PublicDocument, PublicImage } from '../types/public.types.js';
import type { Types } from 'mongoose';

type MediaId = Types.ObjectId | null | undefined;

interface ShownMedia {
  kind: MediaKind | undefined;
  url: string;
  fileName: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

// Turns stored media references into what visitors may see; anything hidden, pending or deleted resolves to nothing.
export interface PublicMediaLookup {
  image(id: MediaId): PublicImage | null;
  document(id: MediaId): PublicDocument | null;
  // Keeps the order of `ids` and leaves out anything that cannot be shown.
  images(ids: MediaId[]): PublicImage[];
}

// Loads every referenced file in one query, so a response never makes a lookup per item.
export async function loadPublicMedia(ids: MediaId[]): Promise<PublicMediaLookup> {
  const uniqueIds = [...new Set(ids.flatMap((id) => (id ? [id.toString()] : [])))];
  const mediaDocuments =
    uniqueIds.length === 0
      ? []
      : await MediaModel.find({ _id: mongoose.trusted({ $in: uniqueIds }), status: 'ready', isVisible: true })
          .select('url fileName mimeType altText width height')
          .lean();

  const shownById = new Map<string, ShownMedia>(
    mediaDocuments.map((media) => [
      media._id.toString(),
      {
        kind: isMediaMimeType(media.mimeType) ? MEDIA_TYPES[media.mimeType].kind : undefined,
        url: media.url,
        fileName: media.fileName,
        altText: media.altText ?? null,
        width: media.width ?? null,
        height: media.height ?? null,
      },
    ]),
  );

  const find = (id: MediaId, kind: MediaKind): ShownMedia | undefined => {
    const media = id ? shownById.get(id.toString()) : undefined;
    return media?.kind === kind ? media : undefined;
  };
  const image = (id: MediaId): PublicImage | null => {
    const media = find(id, 'image');
    return media ? { url: media.url, altText: media.altText, width: media.width, height: media.height } : null;
  };

  return {
    image,
    document: (id) => {
      const media = find(id, 'document');
      return media ? { url: media.url, fileName: media.fileName } : null;
    },
    images: (imageIds) => imageIds.flatMap((id) => image(id) ?? []),
  };
}
