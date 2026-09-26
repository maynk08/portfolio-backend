import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/loaders/express.js';
import { MessageModel } from '../../src/models/message.model.js';
import { createAdminClient, dataOf, unauthenticatedGet } from '../helpers/api-client.js';
import { nextTestIp } from '../helpers/auth.js';
import { useTestDatabase } from '../helpers/database.js';

import type { AdminClient } from '../helpers/api-client.js';

useTestDatabase();

const app = createApp();
const validMessage = { name: 'Ada', email: 'Ada@Example.com', subject: 'Hello', message: 'I would like to work with you.' };

let client: AdminClient;

beforeEach(async () => {
  client = await createAdminClient();
});

function sendContactMessage(body: object, ip = nextTestIp()): request.Test {
  return request(app).post('/api/public/messages').set('X-Forwarded-For', ip).send(body);
}

async function createMessages(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const message = await MessageModel.create({
      ...validMessage,
      name: `Sender ${index}`,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    });
    ids.push(message._id.toString());
  }
  return ids;
}

describe('POST /api/public/messages', () => {
  it('stores the message as unread without needing a token', async () => {
    const response = await sendContactMessage(validMessage);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: null, message: 'Message sent' });
    const stored = await MessageModel.findOne().lean();
    expect(stored).toMatchObject({ name: 'Ada', email: 'ada@example.com', subject: 'Hello', status: 'unread' });
  });

  it('accepts a message without a subject', async () => {
    const { subject: _omitted, ...withoutSubject } = validMessage;

    const response = await sendContactMessage(withoutSubject);

    expect(response.status).toBe(201);
    expect((await MessageModel.findOne().lean())?.subject).toBeNull();
  });

  it('pretends to accept a message that fills in the honeypot, but drops it', async () => {
    const response = await sendContactMessage({ ...validMessage, website: 'https://spam.example.com' });

    expect(response.status).toBe(201);
    expect(await MessageModel.countDocuments()).toBe(0);
  });

  it('returns field errors for invalid input', async () => {
    const response = await sendContactMessage({ name: '', email: 'nope', message: 'x'.repeat(5001) });

    expect(response.status).toBe(422);
    expect((response.body as { errors: { field: string }[] }).errors.map((error) => error.field)).toEqual(['name', 'email', 'message']);
  });

  it('allows 5 messages per IP per hour, then returns 429', async () => {
    const ip = nextTestIp();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await sendContactMessage(validMessage, ip)).status).toBe(201);
    }

    const blocked = await sendContactMessage(validMessage, ip);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: 'Too many messages, please try again later' });
    expect((await sendContactMessage(validMessage, nextTestIp())).status).toBe(201);
  });
});

describe('admin inbox', () => {
  it('requires authentication', async () => {
    expect((await unauthenticatedGet('/messages')).status).toBe(401);
    expect((await unauthenticatedGet('/messages/counts')).status).toBe(401);
  });

  it('lists messages newest first with pagination', async () => {
    await createMessages(3);

    const response = await client.get('/messages?pageSize=2');

    expect((response.body.data as { name: string }[]).map((message) => message.name)).toEqual(['Sender 2', 'Sender 1']);
    expect(response.body.pagination).toEqual({ page: 1, pageSize: 2, totalItems: 3, totalPages: 2 });
  });

  it('filters by status and counts each status', async () => {
    const [first, second] = await createMessages(3);
    await client.patch(`/messages/${first}`, { status: 'read' });
    await client.patch(`/messages/${second}`, { status: 'archived' });

    const unread = await client.get('/messages?status=unread');
    const counts = await client.get('/messages/counts');

    expect(unread.body.pagination?.totalItems).toBe(1);
    expect(dataOf(counts)).toEqual({ unread: 1, read: 1, archived: 1 });
  });

  it('gets one message without marking it read', async () => {
    const [id] = await createMessages(1);

    const response = await client.get(`/messages/${id}`);

    expect(dataOf(response)).toMatchObject({ id, status: 'unread', email: 'Ada@Example.com' });
  });

  it('rejects an unknown status', async () => {
    const [id] = await createMessages(1);

    expect((await client.patch(`/messages/${id}`, { status: 'spam' })).status).toBe(422);
    expect((await client.get('/messages?status=spam')).status).toBe(422);
  });

  it('deletes one message', async () => {
    const [id] = await createMessages(1);

    expect((await client.delete(`/messages/${id}`)).status).toBe(200);
    expect((await client.get(`/messages/${id}`)).status).toBe(404);
  });

  it('bulk deletes the listed messages and skips unknown IDs', async () => {
    const [first, second, third] = await createMessages(3);

    const response = await client.post('/messages/bulk-delete', { ids: [first, second, '0123456789abcdef01234567'] });

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({ deletedCount: 2 });
    expect(await MessageModel.countDocuments()).toBe(1);
    expect(await MessageModel.exists({ _id: third })).not.toBeNull();
  });

  it('refuses a bulk delete without IDs', async () => {
    await createMessages(2);

    const response = await client.post('/messages/bulk-delete', { ids: [] });

    expect(response.status).toBe(422);
    expect(await MessageModel.countDocuments()).toBe(2);
  });
});
