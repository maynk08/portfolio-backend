export interface UploadForm {
  // The browser POSTs a multipart form to `url` with every entry of `fields`, then the file as `file`.
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObjectInfo {
  size: number;
  contentType: string | undefined;
}

// Everything the app needs from file storage, so the S3 implementation can be swapped or mocked.
export interface MediaStorage {
  createUploadForm(options: { key: string; contentType: string; maxBytes: number }): Promise<UploadForm>;
  getObjectInfo(key: string): Promise<StoredObjectInfo | null>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
