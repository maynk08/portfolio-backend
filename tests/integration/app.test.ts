import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/loaders/express.js';

const app = createApp();

describe('GET /health', () => {
  it('returns ok in the response envelope', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('sets security headers and hides the framework', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('request IDs', () => {
  it('generates a request ID when none is sent', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a well-formed incoming request ID', async () => {
    const response = await request(app).get('/health').set('X-Request-Id', 'cms-request-42');

    expect(response.headers['x-request-id']).toBe('cms-request-42');
  });

  it('replaces a malformed incoming request ID', async () => {
    const response = await request(app).get('/health').set('X-Request-Id', 'bad id\twith spaces');

    expect(response.headers['x-request-id']).not.toBe('bad id\twith spaces');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('error responses', () => {
  it('returns 404 in the error envelope for unknown routes', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Route GET /does-not-exist not found' });
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(app).post('/health').set('Content-Type', 'application/json').send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Request body is not valid JSON' });
  });

  it('returns 413 when the body exceeds the size limit', async () => {
    const oversizedBody = { text: 'x'.repeat(200 * 1024) };
    const response = await request(app).post('/health').send(oversizedBody);

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ success: false, message: 'Request body is too large' });
  });
});
