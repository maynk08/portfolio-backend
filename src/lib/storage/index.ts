import { createS3MediaStorage } from './s3-media-storage.js';
import { config } from '../../config/index.js';
import { ServiceUnavailableError } from '../../errors/app-error.js';

import type { MediaStorage } from './media-storage.js';

const storage: MediaStorage | null = config.storage === null ? null : createS3MediaStorage(config.storage);

export function isStorageConfigured(): boolean {
  return storage !== null;
}

export function getStorage(): MediaStorage {
  if (storage === null) {
    throw new ServiceUnavailableError('Media storage is not configured; set the AWS and S3 variables in .env');
  }
  return storage;
}
