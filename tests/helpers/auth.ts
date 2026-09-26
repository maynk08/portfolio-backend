import request from 'supertest';

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
