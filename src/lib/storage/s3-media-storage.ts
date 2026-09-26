import { DeleteObjectCommand, HeadObjectCommand, NotFound, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

import type { MediaStorage } from './media-storage.js';
import type { StorageConfig } from '../../config/env.js';

const UPLOAD_EXPIRY_SECONDS = 5 * 60;
const MS_PER_SECOND = 1000;

export function createS3MediaStorage(config: StorageConfig): MediaStorage {
  const client = new S3Client({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  return {
    createUploadForm: async ({ key, contentType, maxBytes }) => {
      // The policy makes S3 itself reject a different key, content type or a file above the size limit.
      const { url, fields } = await createPresignedPost(client, {
        Bucket: config.bucket,
        Key: key,
        Fields: { 'Content-Type': contentType },
        Conditions: [
          ['eq', '$Content-Type', contentType],
          ['content-length-range', 1, maxBytes],
        ],
        Expires: UPLOAD_EXPIRY_SECONDS,
      });
      return { url, fields, expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * MS_PER_SECOND) };
    },

    getObjectInfo: async (key) => {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
        return { size: head.ContentLength ?? 0, contentType: head.ContentType };
      } catch (error) {
        if (error instanceof NotFound) {
          return null;
        }
        throw error;
      }
    },

    deleteObject: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },

    getPublicUrl: (key) => `${config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
  };
}
