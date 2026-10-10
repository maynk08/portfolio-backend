import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaModel } from '../../src/models/media.model.js';
import { ProfileModel } from '../../src/models/profile.model.js';
import { ProjectModel } from '../../src/models/project.model.js';
import { deleteStalePendingMedia } from '../../src/services/media.service.js';
import { createAdminClient, dataOf } from '../helpers/api-client.js';
import { useTestDatabase } from '../helpers/database.js';
import { fakeStorage } from '../helpers/fake-storage.js';
import { createReadyMedia } from '../helpers/media.js';

import type { AdminClient } from '../helpers/api-client.js';

vi.mock('../../src/lib/storage/index.js', async () => (await import('../helpers/fake-storage.js')).fakeStorageModule);

useTestDatabase();

let client: AdminClient;

beforeEach(async () => {
  fakeStorage.reset();
  client = await createAdminClient();
});

const pngUpload = { fileName: 'My Photo.PNG', mimeType: 'image/png', size: 2048, width: 800, height: 600, altText: 'Me' };

interface UploadResult {
  media: { id: string; key: string; url: string; status: string; width: number | null };
  upload: { url: string; fields: Record<string, string> };
}

async function requestUpload(input: Record<string, unknown> = pngUpload): Promise<UploadResult> {
  const response = await client.post('/media/upload-url', input);
  expect(response.status).toBe(201);
  return dataOf<UploadResult>(response);
}

// Simulates the browser upload followed by the CMS confirming it.
async function uploadFile(input: Record<string, unknown> = pngUpload): Promise<string> {
  const { media } = await requestUpload(input);
  fakeStorage.putObject(media.key, { size: input.size as number, contentType: input.mimeType as string });
  const response = await client.post(`/media/${media.id}/complete`, {});
  expect(response.status).toBe(200);
  return media.id;
}

describe('POST /media/upload-url', () => {
  it('creates a pending record and returns the upload form', async () => {
    const { media, upload } = await requestUpload();

    expect(media).toMatchObject({ status: 'pending', fileName: 'My Photo.PNG', mimeType: 'image/png', width: 800, altText: 'Me' });
    expect(media.key).toMatch(/^media\/[a-f\d]{24}\/my-photo\.png$/);
    expect(media.key).toContain(media.id);
    expect(media.url).toBe(`https://cdn.example.com/${media.key}`);
    expect(upload.fields).toMatchObject({ key: media.key, 'Content-Type': 'image/png' });
  });

  it('does not store image dimensions for a PDF', async () => {
    const { media } = await requestUpload({ fileName: 'cv.pdf', mimeType: 'application/pdf', size: 5000, width: 100, height: 100 });

    expect(media.width).toBeNull();
  });

  it.each([
    ['an SVG', { ...pngUpload, mimeType: 'image/svg+xml' }, 'mimeType'],
    ['an image over 5 MB', { ...pngUpload, size: 5 * 1024 * 1024 + 1 }, 'size'],
    ['a PDF over 10 MB', { fileName: 'cv.pdf', mimeType: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, 'size'],
    ['an empty file', { ...pngUpload, size: 0 }, 'size'],
  ])('rejects %s', async (_description, input, field) => {
    const response = await client.post('/media/upload-url', input);

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe(field);
  });

  it('returns 503 while storage is not configured', async () => {
    fakeStorage.isConfigured = false;

    const response = await client.post('/media/upload-url', pngUpload);

    expect(response.status).toBe(503);
    expect(await MediaModel.countDocuments()).toBe(0);
  });
});

describe('POST /media/:id/complete', () => {
  it('marks the file ready once it is in storage', async () => {
    const id = await uploadFile();

    expect(dataOf(await client.get(`/media/${id}`))).toMatchObject({ status: 'ready' });
  });

  it('returns 409 when the file has not been uploaded', async () => {
    const { media } = await requestUpload();

    const response = await client.post(`/media/${media.id}/complete`, {});

    expect(response.status).toBe(409);
    expect(dataOf(await client.get(`/media/${media.id}`))).toMatchObject({ status: 'pending' });
  });

  it('discards an upload that does not match the request', async () => {
    const { media } = await requestUpload();
    fakeStorage.putObject(media.key, { size: 999_999, contentType: 'image/png' });

    const response = await client.post(`/media/${media.id}/complete`, {});

    expect(response.status).toBe(409);
    expect(await MediaModel.exists({ _id: media.id })).toBeNull();
    expect(fakeStorage.deletedKeys).toEqual([media.key]);
  });

  it('can be called again safely', async () => {
    const id = await uploadFile();

    const response = await client.post(`/media/${id}/complete`, {});

    expect(response.status).toBe(200);
  });
});

describe('GET /media/upload-status', () => {
  it('says whether storage is configured', async () => {
    expect(dataOf(await client.get('/media/upload-status'))).toEqual({ isConfigured: true });

    fakeStorage.isConfigured = false;
    expect(dataOf(await client.get('/media/upload-status'))).toEqual({ isConfigured: false });
  });
});

describe('GET /media', () => {
  it('lists finished uploads, newest first, and filters by kind', async () => {
    const first = await uploadFile();
    const pdf = await uploadFile({ fileName: 'cv.pdf', mimeType: 'application/pdf', size: 5000 });
    const last = await uploadFile();
    await requestUpload();

    const all = await client.get('/media');
    const images = await client.get('/media?kind=image');
    const documents = await client.get('/media?kind=document');

    const idsOf = (response: { body: { data?: unknown } }): string[] => (response.body.data as { id: string }[]).map((item) => item.id);
    expect(idsOf(all)).toEqual([last, pdf, first]);
    expect(all.body.pagination?.totalItems).toBe(3);
    expect(idsOf(images)).toEqual([last, first]);
    expect(idsOf(documents)).toEqual([pdf]);
  });
});

describe('PATCH /media/:id', () => {
  it('updates alt text and visibility', async () => {
    const id = await uploadFile();

    const response = await client.patch(`/media/${id}`, { altText: 'Portrait', isVisible: false });

    expect(dataOf(response)).toMatchObject({ altText: 'Portrait', isVisible: false });
  });
});

describe('media references from content', () => {
  it('accepts a finished image', async () => {
    const image = await uploadFile();

    const response = await client.post('/projects', { title: 'Project', coverImage: image, gallery: [image] });

    expect(response.status).toBe(201);
  });

  it('rejects unknown, unfinished and wrong-kind files', async () => {
    const { media: pending } = await requestUpload();
    const pdf = await createReadyMedia('application/pdf');

    const response = await client.post('/projects', {
      title: 'Project',
      coverImage: '0123456789abcdef01234567',
      gallery: [pending.id, pdf],
    });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([
      { field: 'coverImage', message: 'File not found' },
      { field: 'gallery.0', message: 'File not found' },
      { field: 'gallery.1', message: 'Must be an image' },
    ]);
  });

  it.each([
    ['/experiences', { company: 'Acme', role: 'Engineer', startDate: '2022-01' }, 'companyLogo'],
    ['/education', { institution: 'Uni', degree: 'BSc', startDate: '2016-01' }, 'logo'],
    ['/certifications', { name: 'Cert', issuer: 'Issuer', issueDate: '2023-01' }, 'badge'],
  ])('checks the image field of %s', async (path, input, field) => {
    const response = await client.post(path, { ...input, [field]: '0123456789abcdef01234567' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field, message: 'File not found' }]);
  });
});

describe('usages and delete', () => {
  async function useEverywhere(mediaId: string): Promise<string> {
    const project = dataOf<{ id: string }>(await client.post('/projects', { title: 'Site', coverImage: mediaId, gallery: [mediaId] }));
    await ProfileModel.updateOne({}, { $set: { photo: mediaId } });
    return project.id;
  }

  it('lists every place a file is used', async () => {
    const id = await uploadFile();
    const projectId = await useEverywhere(id);

    const response = await client.get(`/media/${id}/usages`);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        { resource: 'profile', id: expect.any(String) as unknown, label: 'Profile', field: 'photo' },
        { resource: 'project', id: projectId, label: 'Site', field: 'coverImage' },
        { resource: 'project', id: projectId, label: 'Site', field: 'gallery' },
      ]),
    );
    expect(response.body.data).toHaveLength(3);
  });

  it('deletes an unused file from the database and storage', async () => {
    const id = await uploadFile();
    const { key } = dataOf<{ key: string }>(await client.get(`/media/${id}`));

    const response = await client.delete(`/media/${id}`);

    expect(response.status).toBe(200);
    expect(await MediaModel.exists({ _id: id })).toBeNull();
    expect(fakeStorage.deletedKeys).toEqual([key]);
  });

  it('refuses to delete a file in use and returns where it is used', async () => {
    const id = await uploadFile();
    await useEverywhere(id);

    const response = await client.delete(`/media/${id}`);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      message: 'This file is in use',
      details: { usages: expect.any(Array) as unknown },
    });
    expect(await MediaModel.exists({ _id: id })).not.toBeNull();
    expect(fakeStorage.deletedKeys).toEqual([]);
  });

  it('with force, detaches the file everywhere and deletes it', async () => {
    const id = await uploadFile();
    const otherImage = await uploadFile();
    const projectId = await useEverywhere(id);
    await ProjectModel.updateOne({ _id: projectId }, { $push: { gallery: otherImage } });

    const response = await client.delete(`/media/${id}?force=true`);

    expect(response.status).toBe(200);
    const project = await ProjectModel.findById(projectId).lean();
    expect(project?.coverImage).toBeNull();
    expect(project?.gallery.map(String)).toEqual([otherImage]);
    expect((await ProfileModel.findOne().lean())?.photo).toBeNull();
    expect(await MediaModel.exists({ _id: id })).toBeNull();
  });

  it('still succeeds when storage fails to delete the object', async () => {
    const id = await uploadFile();
    fakeStorage.shouldFailDeletes = true;

    const response = await client.delete(`/media/${id}`);

    expect(response.status).toBe(200);
    expect(await MediaModel.exists({ _id: id })).toBeNull();
  });

  it('returns 404 for an unknown file', async () => {
    expect((await client.delete('/media/0123456789abcdef01234567')).status).toBe(404);
    expect((await client.get('/media/0123456789abcdef01234567/usages')).status).toBe(404);
  });
});

describe('deleteStalePendingMedia', () => {
  it('removes pending uploads older than an hour and their stored files, and keeps everything else', async () => {
    const { media: stale } = await requestUpload();
    fakeStorage.putObject(stale.key, { size: 2048, contentType: 'image/png' });
    const ready = await uploadFile();
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const deletedCount = await deleteStalePendingMedia(twoHoursLater);

    expect(deletedCount).toBe(1);
    expect(await MediaModel.exists({ _id: stale.id })).toBeNull();
    expect(await MediaModel.exists({ _id: ready })).not.toBeNull();
    expect(fakeStorage.deletedKeys).toEqual([stale.key]);
  });

  it('keeps recent pending uploads', async () => {
    await requestUpload();

    expect(await deleteStalePendingMedia()).toBe(0);
  });
});
