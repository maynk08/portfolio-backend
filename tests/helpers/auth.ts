import request from 'supertest';

import { issueAccessToken } from '../../src/lib/token.js';
import { AdminModel } from '../../src/models/admin.model.js';

import type { Express } from 'express';

let ipCounter = 0;

// Each call gets its own client IP so login rate limiting from one test cannot affect another.
export function nextTestIp(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

export function postLogin(app: Express, body: object, ip = nextTestIp()): request.Test {
  return request(app).post('/api/admin/auth/login').set('X-Forwarded-For', ip).send(body);
}

// Skips bcrypt so content tests stay fast; the auth tests cover the real login flow.
export async function createAdminToken(): Promise<string> {
  const admin = await AdminModel.create({ email: 'admin@example.com', passwordHash: 'not-used-in-content-tests' });
  const { token } = await issueAccessToken({ adminId: admin._id.toString(), sessionVersion: admin.sessionVersion });
  return token;
}
