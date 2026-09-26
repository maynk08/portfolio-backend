import { beforeEach, describe, expect, it } from 'vitest';

import { createAdminClient, dataOf, unauthenticatedGet } from '../helpers/api-client.js';
import { useTestDatabase } from '../helpers/database.js';

import type { AdminClient } from '../helpers/api-client.js';

useTestDatabase();

let client: AdminClient;

beforeEach(async () => {
  client = await createAdminClient();
});

const UNKNOWN_ID = '0123456789abcdef01234567';

interface ResourceCase {
  path: string;
  name: string;
  validInput: Record<string, unknown>;
  update: Record<string, unknown>;
  requiredField: string;
}

const resources: ResourceCase[] = [
  {
    path: '/experiences',
    name: 'Experience',
    validInput: { company: 'Acme', role: 'Backend Engineer', startDate: '2022-01', endDate: null, techStack: ['Node.js'] },
    update: { role: 'Senior Backend Engineer' },
    requiredField: 'company',
  },
  {
    path: '/projects',
    name: 'Project',
    validInput: { title: 'Portfolio CMS', summary: 'Manages my portfolio', repoUrl: 'https://github.com/example/cms' },
    update: { isFeatured: true },
    requiredField: 'title',
  },
  {
    path: '/skill-groups',
    name: 'Skill group',
    validInput: { name: 'Backend', skills: [{ name: 'Node.js', icon: 'nodedotjs' }, { name: 'Go' }] },
    update: { name: 'Server side' },
    requiredField: 'name',
  },
  {
    path: '/education',
    name: 'Education entry',
    validInput: { institution: 'State University', degree: 'BSc', field: 'Computer Science', startDate: '2016-08', endDate: '2020-06' },
    update: { grade: 'First class' },
    requiredField: 'institution',
  },
  {
    path: '/certifications',
    name: 'Certification',
    validInput: { name: 'AWS Solutions Architect', issuer: 'Amazon', issueDate: '2023-05', credentialUrl: 'https://aws.example.com/c/1' },
    update: { credentialId: 'ABC-123' },
    requiredField: 'name',
  },
];

describe('admin content routes require authentication', () => {
  it.each(['/profile', '/settings', '/sections', ...resources.map((resource) => resource.path)])(
    'GET %s returns 401 without a token',
    async (path) => {
      const response = await unauthenticatedGet(path);

      expect(response.status).toBe(401);
    },
  );
});

describe.each(resources)('$path', ({ path, name, validInput, update, requiredField }) => {
  async function createItem(overrides: Record<string, unknown> = {}): Promise<{ id: string } & Record<string, unknown>> {
    const response = await client.post(path, { ...validInput, ...overrides });
    expect(response.status).toBe(201);
    return dataOf(response);
  }

  it('creates an item with an id, visibility and timestamps', async () => {
    const item = await createItem();

    expect(item).toMatchObject({ ...validInput, isVisible: true });
    expect(item.id).toMatch(/^[a-f\d]{24}$/);
    expect(item).toHaveProperty('createdAt');
    expect(item).not.toHaveProperty('_id');
    expect(item).not.toHaveProperty('__v');
  });

  it('gets an item by id', async () => {
    const item = await createItem();

    const response = await client.get(`${path}/${item.id}`);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual(item);
  });

  it('updates only the fields that are sent', async () => {
    const item = await createItem();

    const response = await client.patch(`${path}/${item.id}`, update);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject({ ...validInput, ...update, id: item.id });
  });

  it('accepts an empty update and changes nothing', async () => {
    const item = await createItem();

    const response = await client.patch(`${path}/${item.id}`, {});

    expect(response.status).toBe(200);
    expect(dataOf(response)).toMatchObject(validInput);
  });

  it('hides and shows an item', async () => {
    const item = await createItem();

    const response = await client.patch(`${path}/${item.id}`, { isVisible: false });

    expect(dataOf(response)).toMatchObject({ isVisible: false });
  });

  it('deletes an item', async () => {
    const item = await createItem();

    const deleteResponse = await client.delete(`${path}/${item.id}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ success: true, data: null, message: `${name} deleted` });
    expect((await client.get(`${path}/${item.id}`)).status).toBe(404);
  });

  it('lists items with pagination metadata', async () => {
    await createItem();
    await createItem();
    await createItem();

    const response = await client.get(`${path}?page=2&pageSize=2`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
  });

  it('rejects a page size above 100', async () => {
    const response = await client.get(`${path}?pageSize=101`);

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('pageSize');
  });

  it('rejects a missing required field', async () => {
    const response = await client.post(path, { ...validInput, [requiredField]: '   ' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toContainEqual({ field: requiredField, message: 'Required' });
  });

  it('ignores fields that are not part of the resource', async () => {
    const item = await createItem({ isAdmin: true, _id: UNKNOWN_ID, order: 99 });

    expect(item).not.toHaveProperty('isAdmin');
    expect(item.id).not.toBe(UNKNOWN_ID);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await client.get(`${path}/${UNKNOWN_ID}`);

    expect(response.status).toBe(404);
  });

  it('returns 422 for a malformed id', async () => {
    const response = await client.delete(`${path}/not-an-id`);

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field: 'id', message: 'Must be a valid ID' }]);
  });
});
