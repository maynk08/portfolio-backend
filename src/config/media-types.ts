const MEGABYTE = 1024 * 1024;

export type MediaKind = 'image' | 'document';

interface MediaTypeRule {
  kind: MediaKind;
  extension: string;
  maxBytes: number;
}

// The only file types that can be uploaded. SVG is left out on purpose: it can carry scripts.
export const MEDIA_TYPES = {
  'image/jpeg': { kind: 'image', extension: 'jpg', maxBytes: 5 * MEGABYTE },
  'image/png': { kind: 'image', extension: 'png', maxBytes: 5 * MEGABYTE },
  'image/webp': { kind: 'image', extension: 'webp', maxBytes: 5 * MEGABYTE },
  'image/avif': { kind: 'image', extension: 'avif', maxBytes: 5 * MEGABYTE },
  'image/gif': { kind: 'image', extension: 'gif', maxBytes: 5 * MEGABYTE },
  'application/pdf': { kind: 'document', extension: 'pdf', maxBytes: 10 * MEGABYTE },
} as const satisfies Record<string, MediaTypeRule>;

export type MediaMimeType = keyof typeof MEDIA_TYPES;

export const MEDIA_MIME_TYPES = Object.keys(MEDIA_TYPES) as [MediaMimeType, ...MediaMimeType[]];

export function isMediaMimeType(mimeType: string): mimeType is MediaMimeType {
  return Object.hasOwn(MEDIA_TYPES, mimeType);
}

export function getMimeTypesOfKind(kind: MediaKind): MediaMimeType[] {
  return MEDIA_MIME_TYPES.filter((mimeType) => MEDIA_TYPES[mimeType].kind === kind);
}
