import { beforeEach, describe, expect, it } from 'vitest';

import { createAdminClient, dataOf } from '../helpers/api-client.js';
import { useTestDatabase } from '../helpers/database.js';

import type { AdminClient } from '../helpers/api-client.js';

useTestDatabase();

let client: AdminClient;

beforeEach(async () => {
  client = await createAdminClient();
});

function namesOf(response: { body: { data?: unknown } }, field: string): unknown[] {
  return (response.body.data as Record<string, unknown>[]).map((item) => item[field]);
}

describe('experience sorting and dates', () => {
  async function createExperience(company: string, startDate: string, endDate: string | null): Promise<string> {
    const response = await client.post('/experiences', { company, role: 'Engineer', startDate, endDate });
    expect(response.status).toBe(201);
    return dataOf<{ id: string }>(response).id;
  }

  it('lists current roles first, then newest end date first', async () => {
    await createExperience('Oldest', '2015-01', '2017-12');
    await createExperience('Current earlier start', '2019-01', null);
    await createExperience('Recent', '2018-01', '2021-06');
    await createExperience('Current later start', '2023-03', null);

    const response = await client.get('/experiences');

    expect(namesOf(response, 'company')).toEqual(['Current later start', 'Current earlier start', 'Recent', 'Oldest']);
  });

  it('rejects an end date before the start date', async () => {
    const response = await client.post('/experiences', { company: 'Acme', role: 'Engineer', startDate: '2022-05', endDate: '2022-04' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field: 'endDate', message: 'Must not be before the start date' }]);
  });

  it('checks the date range against the stored dates on a partial update', async () => {
    const id = await createExperience('Acme', '2022-05', null);

    const response = await client.patch(`/experiences/${id}`, { endDate: '2021-01' });

    expect(response.status).toBe(422);
  });

  it('accepts null as "Present" and clears an end date', async () => {
    const id = await createExperience('Acme', '2022-05', '2023-01');

    const response = await client.patch(`/experiences/${id}`, { endDate: null });

    expect(dataOf(response)).toMatchObject({ endDate: null });
  });

  it.each(['2022-13', '2022-1', '22-01', '2022-01-15'])('rejects the date %s', async (startDate) => {
    const response = await client.post('/experiences', { company: 'Acme', role: 'Engineer', startDate });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field: 'startDate', message: 'Must be in YYYY-MM format' }]);
  });

  it('stores empty optional text as null', async () => {
    const response = await client.post('/experiences', { company: 'Acme', role: 'Engineer', startDate: '2022-05', location: '  ' });

    expect(dataOf(response)).toMatchObject({ location: null });
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'not a url'])('rejects the company URL %s', async (companyUrl) => {
    const response = await client.post('/experiences', { company: 'Acme', role: 'Engineer', startDate: '2022-05', companyUrl });

    expect(response.status).toBe(422);
    expect(response.body.errors?.[0]?.field).toBe('companyUrl');
  });
});

describe('education sorting', () => {
  it('lists ongoing studies first, then newest first', async () => {
    for (const [institution, startDate, endDate] of [
      ['School', '2010-09', '2014-06'],
      ['Ongoing', '2024-09', null],
      ['University', '2014-09', '2018-06'],
    ] as const) {
      await client.post('/education', { institution, degree: 'Degree', startDate, endDate });
    }

    const response = await client.get('/education');

    expect(namesOf(response, 'institution')).toEqual(['Ongoing', 'University', 'School']);
  });
});

describe('certification sorting and dates', () => {
  it('lists the most recently issued first', async () => {
    for (const [name, issueDate] of [
      ['Old', '2019-01'],
      ['Newest', '2024-02'],
      ['Middle', '2021-07'],
    ]) {
      await client.post('/certifications', { name, issuer: 'Issuer', issueDate });
    }

    const response = await client.get('/certifications');

    expect(namesOf(response, 'name')).toEqual(['Newest', 'Middle', 'Old']);
  });

  it('rejects an expiry date before the issue date', async () => {
    const response = await client.post('/certifications', { name: 'Cert', issuer: 'Issuer', issueDate: '2024-02', expiryDate: '2023-02' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([{ field: 'expiryDate', message: 'Must not be before the start date' }]);
  });
});
