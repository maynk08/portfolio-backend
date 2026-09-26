import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { NotFoundError, ValidationError } from '../../src/errors/app-error.js';
import { handleError } from '../../src/middlewares/error-handler.middleware.js';
import { requestLogger } from '../../src/middlewares/request-logger.middleware.js';

function createTestApp(routeError: unknown): express.Express {
  const app = express();
  app.use(requestLogger);
  app.get('/sync', () => {
    throw routeError;
  });
  app.get('/async', async () => {
    await Promise.resolve();
    throw routeError;
  });
  app.use(handleError);
  return app;
}

describe('handleError', () => {
  it('maps an AppError to its status code and message', async () => {
    const response = await request(createTestApp(new NotFoundError('Project not found'))).get('/sync');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Project not found' });
  });

  it('includes field errors for validation failures', async () => {
    const error = new ValidationError([{ field: 'title', message: 'Title is required' }]);
    const response = await request(createTestApp(error)).get('/sync');

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'title', message: 'Title is required' }],
    });
  });

  it('catches errors thrown from async handlers', async () => {
    const response = await request(createTestApp(new NotFoundError())).get('/async');

    expect(response.status).toBe(404);
  });

  it('hides the details of unexpected errors', async () => {
    const response = await request(createTestApp(new Error('connection string mongodb://secret'))).get('/async');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Internal server error' });
  });

  it('handles non-Error values being thrown', async () => {
    const response = await request(createTestApp('plain string')).get('/sync');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Internal server error' });
  });
});
