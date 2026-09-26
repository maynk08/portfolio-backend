import { ServiceUnavailableError } from '../../src/errors/app-error.js';

import type { MediaStorage, StoredObjectInfo } from '../../src/lib/storage/media-storage.js';

// In-memory stand-in for S3. Tests "upload" a file by calling `putObject` directly.
export class FakeStorage implements MediaStorage {
  isConfigured = true;
  shouldFailDeletes = false;
  readonly objects = new Map<string, StoredObjectInfo>();
  readonly deletedKeys: string[] = [];

  reset(): void {
    this.isConfigured = true;
    this.shouldFailDeletes = false;
    this.objects.clear();
    this.deletedKeys.length = 0;
  }

  putObject(key: string, info: StoredObjectInfo): void {
    this.objects.set(key, info);
  }

  createUploadForm({ key, contentType }: { key: string; contentType: string; maxBytes: number }): Promise<{
    url: string;
    fields: Record<string, string>;
    expiresAt: Date;
  }> {
    return Promise.resolve({ url: 'https://fake-bucket.example.com', fields: { key, 'Content-Type': contentType }, expiresAt: new Date() });
  }

  getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  deleteObject(key: string): Promise<void> {
    if (this.shouldFailDeletes) {
      return Promise.reject(new Error('Simulated storage outage'));
    }
    this.objects.delete(key);
    this.deletedKeys.push(key);
    return Promise.resolve();
  }

  getPublicUrl(key: string): string {
    return `https://cdn.example.com/${key}`;
  }
}

export const fakeStorage = new FakeStorage();

// Mirrors `src/lib/storage/index.ts`, backed by the fake.
export const fakeStorageModule = {
  isStorageConfigured: (): boolean => fakeStorage.isConfigured,
  getStorage: (): MediaStorage => {
    if (!fakeStorage.isConfigured) {
      throw new ServiceUnavailableError('Media storage is not configured; set the AWS and S3 variables in .env');
    }
    return fakeStorage;
  },
};
