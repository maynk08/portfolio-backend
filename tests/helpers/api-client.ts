import request from 'supertest';

import { createAdminToken } from './auth.js';
import { createApp } from '../../src/loaders/express.js';

const app = createApp();

export interface ApiResponse {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    message?: string;
    errors?: { field: string; message: string }[];
    pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number };
  };
}

export interface AdminClient {
  get(path: string): Promise<ApiResponse>;
  post(path: string, body: object): Promise<ApiResponse>;
  put(path: string, body: object): Promise<ApiResponse>;
  patch(path: string, body: object): Promise<ApiResponse>;
  delete(path: string): Promise<ApiResponse>;
}

// Sends authenticated requests to /api/admin; call it after the test database has been reset.
export async function createAdminClient(): Promise<AdminClient> {
  const authorization = `Bearer ${await createAdminToken()}`;
  const url = (path: string): string => `/api/admin${path}`;
  const toResponse = async (test: request.Test): Promise<ApiResponse> => {
    const response = await test;
    return { status: response.status, body: response.body as ApiResponse['body'] };
  };

  return {
    get: (path) => toResponse(request(app).get(url(path)).set('Authorization', authorization)),
    post: (path, body) => toResponse(request(app).post(url(path)).set('Authorization', authorization).send(body)),
    put: (path, body) => toResponse(request(app).put(url(path)).set('Authorization', authorization).send(body)),
    patch: (path, body) => toResponse(request(app).patch(url(path)).set('Authorization', authorization).send(body)),
    delete: (path) => toResponse(request(app).delete(url(path)).set('Authorization', authorization)),
  };
}

export function unauthenticatedGet(path: string): request.Test {
  return request(app).get(`/api/admin${path}`);
}

export function dataOf<T = Record<string, unknown>>(response: ApiResponse): T {
  return response.body.data as T;
}
