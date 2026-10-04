import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/loaders/express.js';
import { ProjectModel } from '../../src/models/project.model.js';
import { SectionModel } from '../../src/models/section.model.js';
import { useTestDatabase } from '../helpers/database.js';
import { createReadyMedia } from '../helpers/media.js';

import type { PublicProject, PublicProjectCard } from '../../src/types/public.types.js';

useTestDatabase();

const app = createApp();

async function listProjects(): Promise<PublicProjectCard[]> {
  const response = await request(app).get('/api/public/projects');
  expect(response.status).toBe(200);
  return (response.body as { data: PublicProjectCard[] }).data;
}

function getProject(slug: string): request.Test {
  return request(app).get(`/api/public/projects/${slug}`);
}

describe('GET /api/public/projects', () => {
  it('returns an empty list when there are no projects', async () => {
    expect(await listProjects()).toEqual([]);
  });

  it('returns every visible project in manual order as cards', async () => {
    const cover = await createReadyMedia('image/webp', {
      url: 'https://cdn.example.com/cover.webp',
      altText: 'Screenshot',
      width: 1200,
      height: 630,
    });
    await ProjectModel.create([
      { title: 'Second', slug: 'second', order: 1 },
      {
        title: 'First',
        slug: 'first',
        order: 0,
        summary: 'A summary',
        description: '# Long text',
        role: 'Solo',
        techStack: ['Node.js'],
        liveUrl: 'https://first.example.com',
        coverImage: cover,
        gallery: [cover],
        isFeatured: true,
      },
      { title: 'Hidden', slug: 'hidden', order: 2, isVisible: false },
    ]);

    const projects = await listProjects();

    expect(projects.map((project) => project.slug)).toEqual(['first', 'second']);
    expect(projects[0]).toEqual({
      id: expect.any(String) as string,
      slug: 'first',
      title: 'First',
      summary: 'A summary',
      role: 'Solo',
      techStack: ['Node.js'],
      liveUrl: 'https://first.example.com',
      repoUrl: null,
      coverImage: { url: 'https://cdn.example.com/cover.webp', altText: 'Screenshot', width: 1200, height: 630 },
      isFeatured: true,
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as string,
    });
  });

  it('returns 404 when the projects section is hidden', async () => {
    await ProjectModel.create({ title: 'Site', slug: 'site' });
    await SectionModel.updateOne({ key: 'projects' }, { $set: { isVisible: false } });

    const response = await request(app).get('/api/public/projects');

    expect(response.status).toBe(404);
  });
});

describe('GET /api/public/projects/:slug', () => {
  it('returns the project with its description and visible gallery images in order', async () => {
    const [first, hidden, pending, last] = await Promise.all([
      createReadyMedia('image/png', { url: 'https://cdn.example.com/1.png' }),
      createReadyMedia('image/png', { isVisible: false }),
      createReadyMedia('image/png', { status: 'pending' }),
      createReadyMedia('image/png', { url: 'https://cdn.example.com/2.png' }),
    ]);
    await ProjectModel.create({
      title: 'Site',
      slug: 'site',
      description: '# Hello',
      coverImage: hidden,
      gallery: [first, hidden, pending, last],
    });

    const response = await getProject('site');

    expect(response.status).toBe(200);
    const project = (response.body as { data: PublicProject }).data;
    expect(project).toMatchObject({ slug: 'site', title: 'Site', description: '# Hello', coverImage: null });
    expect(project.gallery.map((image) => image.url)).toEqual(['https://cdn.example.com/1.png', 'https://cdn.example.com/2.png']);
    expect(project).not.toHaveProperty('isVisible');
    expect(project).not.toHaveProperty('order');
    expect(project).not.toHaveProperty('createdAt');
  });

  it.each([
    ['an unknown slug', 'missing'],
    ['a hidden project', 'hidden'],
    ['a malformed slug', 'Not_A-Slug'],
    ['a slug that is too long', 'a'.repeat(81)],
  ])('returns 404 for %s', async (_case, slug) => {
    await ProjectModel.create({ title: 'Hidden', slug: 'hidden', isVisible: false });

    const response = await getProject(slug);

    expect(response.status).toBe(404);
    expect((response.body as { message: string }).message).toBe('Project not found');
  });

  it('returns 404 for a visible project when the projects section is hidden', async () => {
    await ProjectModel.create({ title: 'Site', slug: 'site' });
    await SectionModel.updateOne({ key: 'projects' }, { $set: { isVisible: false } });

    expect((await getProject('site')).status).toBe(404);
  });
});
