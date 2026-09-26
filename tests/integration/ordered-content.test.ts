import { beforeEach, describe, expect, it } from 'vitest';

import { createAdminClient, dataOf } from '../helpers/api-client.js';
import { useTestDatabase } from '../helpers/database.js';

import type { AdminClient } from '../helpers/api-client.js';

useTestDatabase();

let client: AdminClient;

beforeEach(async () => {
  client = await createAdminClient();
});

async function createProject(input: Record<string, unknown>): Promise<{ id: string; slug: string; order: number }> {
  const response = await client.post('/projects', input);
  expect(response.status).toBe(201);
  return dataOf(response);
}

describe('project slugs', () => {
  it('generates a slug from the title', async () => {
    const project = await createProject({ title: 'My Café App!' });

    expect(project.slug).toBe('my-cafe-app');
  });

  it('adds a number when the generated slug is taken', async () => {
    await createProject({ title: 'Portfolio' });
    const second = await createProject({ title: 'Portfolio' });
    const third = await createProject({ title: 'Portfolio' });

    expect([second.slug, third.slug]).toEqual(['portfolio-2', 'portfolio-3']);
  });

  it('uses a slug that is sent explicitly', async () => {
    const project = await createProject({ title: 'Portfolio', slug: 'personal-site' });

    expect(project.slug).toBe('personal-site');
  });

  it('rejects an explicit slug that is already taken', async () => {
    await createProject({ title: 'First', slug: 'shared' });

    const response = await client.post('/projects', { title: 'Second', slug: 'shared' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('This slug is already used by another project');
  });

  it('keeps the slug when the title changes', async () => {
    const project = await createProject({ title: 'Old title' });

    const response = await client.patch(`/projects/${project.id}`, { title: 'New title' });

    expect(dataOf(response)).toMatchObject({ title: 'New title', slug: 'old-title' });
  });

  it('allows saving a project with its own slug but not another project’s', async () => {
    const first = await createProject({ title: 'First' });
    const second = await createProject({ title: 'Second' });

    expect((await client.patch(`/projects/${first.id}`, { slug: 'first' })).status).toBe(200);
    expect((await client.patch(`/projects/${second.id}`, { slug: 'first' })).status).toBe(409);
  });

  it.each(['Has Spaces', 'UPPER', 'double--hyphen', '-leading', 'ünïcode'])('rejects the slug %s', async (slug) => {
    const response = await client.post('/projects', { title: 'Project', slug });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('slug');
  });

  it('asks for a slug when the title has no letters or numbers', async () => {
    const response = await client.post('/projects', { title: '!!!' });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('slug');
  });
});

describe.each(['/projects', '/skill-groups'])('manual ordering of %s', (path) => {
  async function createItems(count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const body = path === '/projects' ? { title: `Item ${index}` } : { name: `Item ${index}` };
      const response = await client.post(path, body);
      ids.push(dataOf<{ id: string }>(response).id);
    }
    return ids;
  }

  function idsOf(response: { body: { data?: unknown } }): string[] {
    return (response.body.data as { id: string }[]).map((item) => item.id);
  }

  it('appends new items to the end', async () => {
    const ids = await createItems(3);

    expect(idsOf(await client.get(path))).toEqual(ids);
  });

  it('applies a new order', async () => {
    const [first, second, third] = await createItems(3);

    const response = await client.patch(`${path}/order`, { ids: [third, first, second] });

    expect(response.status).toBe(200);
    expect(idsOf(await client.get(path))).toEqual([third, first, second]);
  });

  it.each([
    ['misses an item', (ids: string[]) => ids.slice(0, 2)],
    ['repeats an item', (ids: string[]) => [ids[0], ids[0], ids[1]]],
    ['contains an unknown id', (ids: string[]) => [ids[0], ids[1], '0123456789abcdef01234567']],
  ])('rejects a list that %s', async (_description, buildIds) => {
    const ids = await createItems(3);

    const response = await client.patch(`${path}/order`, { ids: buildIds(ids) });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field: 'ids', message: 'Must list every item exactly once' }]);
  });
});

describe('skill groups', () => {
  it('rejects an icon that is not a Simple Icons slug', async () => {
    const response = await client.post('/skill-groups', { name: 'Backend', skills: [{ name: 'Node.js', icon: 'Node.js' }] });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('skills.0.icon');
  });

  it('keeps skills in the order they are sent and makes them visible by default', async () => {
    const response = await client.post('/skill-groups', {
      name: 'Backend',
      skills: [{ name: 'Go' }, { name: 'Node.js', isVisible: false }],
    });

    expect(dataOf(response)).toMatchObject({
      skills: [
        { name: 'Go', icon: null, isVisible: true },
        { name: 'Node.js', icon: null, isVisible: false },
      ],
    });
  });
});

describe('date-sorted resources', () => {
  it('have no manual order route', async () => {
    const response = await client.patch('/experiences/order', { ids: [] });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('id');
  });
});
