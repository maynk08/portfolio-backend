import { describe, expect, it } from 'vitest';

import { createS3MediaStorage } from '../../src/lib/storage/s3-media-storage.js';

const storage = createS3MediaStorage({
  region: 'eu-central-1',
  bucket: 'portfolio-media',
  accessKeyId: 'AKIAEXAMPLEEXAMPLE',
  secretAccessKey: 'example-secret-key-not-real',
  publicBaseUrl: 'https://portfolio-media.s3.eu-central-1.amazonaws.com',
});

describe('S3 media storage', () => {
  it('builds public URLs with each path segment encoded', () => {
    expect(storage.getPublicUrl('media/abc/my file.png')).toBe(
      'https://portfolio-media.s3.eu-central-1.amazonaws.com/media/abc/my%20file.png',
    );
  });

  it('signs an upload form limited to the key, content type and size', async () => {
    const form = await storage.createUploadForm({ key: 'media/abc/photo.png', contentType: 'image/png', maxBytes: 1000 });

    expect(form.url).toContain('portfolio-media');
    expect(form.fields).toMatchObject({ key: 'media/abc/photo.png', 'Content-Type': 'image/png' });
    const policy = JSON.parse(Buffer.from(form.fields.Policy ?? '', 'base64').toString('utf8')) as { conditions: unknown[] };
    expect(policy.conditions).toEqual(
      expect.arrayContaining([['eq', '$Content-Type', 'image/png'], ['content-length-range', 1, 1000], { key: 'media/abc/photo.png' }]),
    );
    expect(form.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
