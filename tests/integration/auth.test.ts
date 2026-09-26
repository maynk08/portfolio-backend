import { SignJWT } from 'jose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { config } from '../../src/config/index.js';
import { createApp } from '../../src/loaders/express.js';
import { AdminModel } from '../../src/models/admin.model.js';
import { setAdminCredentials } from '../../src/services/admin.service.js';
import { nextTestIp, postLogin } from '../helpers/auth.js';
import { useTestDatabase } from '../helpers/database.js';

const app = createApp();
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a much better passphrase';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

useTestDatabase();

beforeEach(async () => {
  await setAdminCredentials(ADMIN_EMAIL, ADMIN_PASSWORD);
});

async function loginAndGetToken(password = ADMIN_PASSWORD): Promise<string> {
  const response = await postLogin(app, { email: ADMIN_EMAIL, password });
  expect(response.status).toBe(200);
  const body = response.body as { data: { token: string } };
  return body.data.token;
}

function getMe(token: string): request.Test {
  return request(app).get('/api/admin/auth/me').set('Authorization', `Bearer ${token}`);
}

describe('POST /api/admin/auth/login', () => {
  it('returns a token, its expiry and the admin profile', async () => {
    const response = await postLogin(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { token: expect.any(String) as unknown, admin: { email: ADMIN_EMAIL, lastLoginAt: expect.any(String) as unknown } },
    });
    const { expiresAt } = (response.body as { data: { expiresAt: string } }).data;
    expect(new Date(expiresAt).getTime() - Date.now()).toBeGreaterThan(SEVEN_DAYS_MS - 60_000);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('records the login time', async () => {
    await loginAndGetToken();

    const admin = await AdminModel.findOne({ email: ADMIN_EMAIL }).lean();
    expect(admin?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('ignores case and surrounding spaces in the email', async () => {
    const response = await postLogin(app, { email: '  Admin@Example.COM ', password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
  });

  it.each([
    ['a wrong password', { email: ADMIN_EMAIL, password: 'wrong password here' }],
    ['an unknown email', { email: 'someone@example.com', password: ADMIN_PASSWORD }],
  ])('rejects %s with the same generic message', async (_description, body) => {
    const response = await postLogin(app, body);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'Invalid email or password' });
  });

  it('returns field errors for invalid input', async () => {
    const response = await postLogin(app, { email: 'not-an-email' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [
        { field: 'email', message: 'Enter a valid email address' },
        { field: 'password', message: 'Password is required' },
      ],
    });
  });

  it('rejects a login attempt that tries to inject a query operator', async () => {
    const response = await postLogin(app, { email: { $ne: null }, password: ADMIN_PASSWORD });

    expect(response.status).toBe(422);
  });
});

describe('login rate limit', () => {
  it('blocks an IP after 5 failed attempts', async () => {
    const ip = nextTestIp();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await postLogin(app, { email: ADMIN_EMAIL, password: 'wrong password here' }, ip);
      expect(response.status).toBe(401);
    }

    const blockedResponse = await postLogin(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, ip);

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({ success: false, message: 'Too many failed login attempts, please try again later' });
  });

  it('does not count successful logins', async () => {
    const ip = nextTestIp();
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await postLogin(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, ip);
      expect(response.status).toBe(200);
    }
  });

  it('counts each forwarded IP separately', async () => {
    const blockedIp = nextTestIp();
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await postLogin(app, { email: ADMIN_EMAIL, password: 'wrong password here' }, blockedIp);
    }

    const response = await postLogin(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, nextTestIp());

    expect(response.status).toBe(200);
  });
});

describe('GET /api/admin/auth/me', () => {
  it('returns the admin for a valid token', async () => {
    const token = await loginAndGetToken();

    const response = await getMe(token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { id: expect.any(String) as unknown, email: ADMIN_EMAIL } });
  });

  it('rejects a request without a bearer token', async () => {
    const response = await request(app).get('/api/admin/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'Authentication required' });
  });

  it('rejects a malformed token', async () => {
    const response = await getMe('not-a-jwt');

    expect(response.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const admin = await AdminModel.findOne({ email: ADMIN_EMAIL }).lean();
    const forgedToken = await new SignJWT({ sv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(admin?._id))
      .setIssuer('portfolio-backend')
      .setAudience('portfolio-cms')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-different-secret-that-is-also-long-enough'));

    const response = await getMe(forgedToken);

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const admin = await AdminModel.findOne({ email: ADMIN_EMAIL }).lean();
    const expiredToken = await new SignJWT({ sv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(admin?._id))
      .setIssuer('portfolio-backend')
      .setAudience('portfolio-cms')
      .setIssuedAt('2 hours ago')
      .setExpirationTime('1 hour ago')
      .sign(new TextEncoder().encode(config.jwtSecret));

    const response = await getMe(expiredToken);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'Session has ended, please log in again' });
  });
});

describe('POST /api/admin/auth/logout', () => {
  it('ends the session so the token no longer works', async () => {
    const token = await loginAndGetToken();

    const logoutResponse = await request(app).post('/api/admin/auth/logout').set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({ success: true, data: null, message: 'Logged out' });
    expect((await getMe(token)).status).toBe(401);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/admin/auth/logout');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/admin/auth/password', () => {
  function patchPassword(token: string, body: object): request.Test {
    return request(app).patch('/api/admin/auth/password').set('Authorization', `Bearer ${token}`).send(body);
  }

  it('changes the password, ends other sessions and returns a new token', async () => {
    const oldToken = await loginAndGetToken();

    const response = await patchPassword(oldToken, { currentPassword: ADMIN_PASSWORD, newPassword: NEW_PASSWORD });

    expect(response.status).toBe(200);
    const newToken = (response.body as { data: { token: string } }).data.token;
    expect((await getMe(oldToken)).status).toBe(401);
    expect((await getMe(newToken)).status).toBe(200);
    expect((await postLogin(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).status).toBe(401);
    expect((await postLogin(app, { email: ADMIN_EMAIL, password: NEW_PASSWORD })).status).toBe(200);
  });

  it('rejects a wrong current password as a field error, not as a 401', async () => {
    const token = await loginAndGetToken();

    const response = await patchPassword(token, { currentPassword: 'not my password', newPassword: NEW_PASSWORD });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
    });
    expect((await getMe(token)).status).toBe(200);
  });

  it.each([
    ['too short', 'short', 'Password must be at least 12 characters'],
    ['the same as the current one', ADMIN_PASSWORD, 'New password must be different from the current password'],
  ])('rejects a new password that is %s', async (_description, newPassword, message) => {
    const token = await loginAndGetToken();

    const response = await patchPassword(token, { currentPassword: ADMIN_PASSWORD, newPassword });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ errors: [{ field: 'newPassword', message }] });
  });
});
