import { beforeEach, describe, expect, it } from 'vitest';

import { createAdminClient, dataOf } from '../helpers/api-client.js';
import { useTestDatabase } from '../helpers/database.js';
import { createReadyMedia } from '../helpers/media.js';

import type { AdminClient } from '../helpers/api-client.js';

useTestDatabase();

let client: AdminClient;

beforeEach(async () => {
  client = await createAdminClient();
});

const validProfile = {
  name: 'Mayank',
  headline: 'Software Engineer',
  heroPhrases: ['I build APIs', 'I ship products'],
  about: '## Hello\n\nI write **TypeScript**.',
  photo: null,
  resume: null as string | null,
  socialLinks: [
    { platform: 'github', url: 'https://github.com/example', isVisible: true },
    { platform: 'email', url: 'mailto:me@example.com', isVisible: true },
    { platform: 'other', label: 'Blog', url: 'https://blog.example.com', isVisible: false },
  ],
  location: { value: 'Berlin', isVisible: true },
  publicEmail: { value: 'me@example.com', isVisible: false },
  isOpenToWork: { value: true, isVisible: true },
  yearsOfExperience: { value: 5, isVisible: true },
  languages: { value: [{ name: 'English', proficiency: 'Fluent' }], isVisible: true },
};

describe('profile', () => {
  it('starts as an empty profile with optional details hidden', async () => {
    const response = await client.get('/profile');

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      name: '',
      socialLinks: [],
      location: { value: null, isVisible: false },
      isOpenToWork: { value: false, isVisible: false },
    });
  });

  it('replaces the whole profile', async () => {
    const resume = await createReadyMedia('application/pdf');

    const response = await client.put('/profile', { ...validProfile, resume });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({
      ...validProfile,
      resume,
      socialLinks: validProfile.socialLinks.map((link) => ({ label: null, ...link })),
    });
    expect(dataOf(await client.get('/profile'))).toMatchObject({ name: 'Mayank', resume });
  });

  it('requires the photo to be an image and the resume to be a PDF', async () => {
    const image = await createReadyMedia('image/png');
    const pdf = await createReadyMedia('application/pdf');

    const response = await client.put('/profile', { ...validProfile, photo: pdf, resume: image });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([
      { field: 'photo', message: 'Must be an image' },
      { field: 'resume', message: 'Must be a PDF' },
    ]);
  });

  it('requires every field', async () => {
    const { languages: _omitted, ...profileWithoutLanguages } = validProfile;

    const response = await client.put('/profile', profileWithoutLanguages);

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('languages');
  });

  it.each([
    ['a label for "other" links', { platform: 'other', url: 'https://example.com', isVisible: true }, 'socialLinks.0.label'],
    ['a mailto link for email', { platform: 'email', url: 'https://example.com', isVisible: true }, 'socialLinks.0.url'],
    ['an http(s) link for other platforms', { platform: 'github', url: 'javascript:alert(1)', isVisible: true }, 'socialLinks.0.url'],
    ['a known platform', { platform: 'myspace', url: 'https://example.com', isVisible: true }, 'socialLinks.0.platform'],
  ])('requires %s', async (_description, socialLink, field) => {
    const response = await client.put('/profile', { ...validProfile, socialLinks: [socialLink] });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe(field);
  });

  it('rejects a malformed media id', async () => {
    const response = await client.put('/profile', { ...validProfile, photo: 'photo.jpg' });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('photo');
  });
});

describe('settings', () => {
  it('defaults to the dark theme', async () => {
    expect(dataOf(await client.get('/settings'))).toMatchObject({ theme: 'dark' });
  });

  it('switches to the light theme', async () => {
    const response = await client.put('/settings', { theme: 'light' });

    expect(dataOf(response)).toMatchObject({ theme: 'light' });
  });

  it('rejects an unknown theme', async () => {
    const response = await client.put('/settings', { theme: 'blue' });

    expect(response.status).toBe(422);
  });
});

describe('sections', () => {
  it('lists the eight default sections in order', async () => {
    const response = await client.get('/sections');

    expect((response.body.data as { key: string }[]).map((section) => section.key)).toEqual([
      'hero',
      'about',
      'experience',
      'projects',
      'skills',
      'education',
      'certifications',
      'contact',
    ]);
    expect((response.body.data as unknown[])[1]).toMatchObject({ key: 'about', heading: 'About', isVisible: true, settings: {} });
  });

  it('updates the heading and visibility', async () => {
    const response = await client.patch('/sections/projects', { heading: 'Things I built', isVisible: false });

    expect(dataOf(response)).toMatchObject({ key: 'projects', heading: 'Things I built', isVisible: false });
  });

  it('does not overwrite edited sections when defaults are ensured again', async () => {
    await client.patch('/sections/about', { heading: 'Who I am' });
    const { ensureDefaultContent } = await import('../../src/services/default-content.service.js');

    await ensureDefaultContent();

    const sections = (await client.get('/sections')).body.data as { key: string; heading: string }[];
    expect(sections).toHaveLength(8);
    expect(sections.find((section) => section.key === 'about')?.heading).toBe('Who I am');
  });

  it('rejects an unknown section', async () => {
    const response = await client.patch('/sections/blog', { heading: 'Blog' });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('key');
  });

  it('rejects an empty heading', async () => {
    const response = await client.patch('/sections/about', { heading: '' });

    expect(response.status).toBe(422);
  });
});

describe('section order', () => {
  const reordered = ['hero', 'projects', 'about', 'experience', 'skills', 'education', 'certifications', 'contact'];

  async function listKeys(): Promise<string[]> {
    return ((await client.get('/sections')).body.data as { key: string }[]).map((section) => section.key);
  }

  it('saves the new display order', async () => {
    const response = await client.patch('/sections/order', { keys: reordered });

    expect(response.status).toBe(200);
    expect(await listKeys()).toEqual(reordered);
  });

  it.each([
    ['a section is missing', reordered.slice(0, -1)],
    ['a section appears twice', [...reordered.slice(0, -1), 'about']],
  ])('rejects the order when %s, changing nothing', async (_case, keys) => {
    const before = await listKeys();

    const response = await client.patch('/sections/order', { keys });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]).toEqual({ field: 'keys', message: 'Must list every section exactly once' });
    expect(await listKeys()).toEqual(before);
  });

  it('keeps the hero first', async () => {
    const response = await client.patch('/sections/order', { keys: ['about', 'hero', ...reordered.slice(3)].concat('projects') });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]).toEqual({ field: 'keys', message: 'The hero must stay first' });
  });

  it('rejects unknown section keys', async () => {
    const response = await client.patch('/sections/order', { keys: [...reordered.slice(0, -1), 'blog'] });

    expect(response.status).toBe(422);
  });

  it('requires the admin login', async () => {
    const { default: request } = await import('supertest');
    const { createApp } = await import('../../src/loaders/express.js');

    const response = await request(createApp()).patch('/api/admin/sections/order').send({ keys: reordered });

    expect(response.status).toBe(401);
  });
});
