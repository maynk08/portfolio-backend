import { describe, expect, it } from 'vitest';

import { AdminModel } from '../../src/models/admin.model.js';
import { setAdminCredentials } from '../../src/services/admin.service.js';
import { useTestDatabase } from '../helpers/database.js';

useTestDatabase();

describe('setAdminCredentials', () => {
  it('creates the admin with a bcrypt hash, never the plain password', async () => {
    const result = await setAdminCredentials('admin@example.com', 'correct horse battery');

    expect(result).toBe('created');
    const admin = await AdminModel.findOne().select('+passwordHash').lean();
    expect(admin?.email).toBe('admin@example.com');
    expect(admin?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('updates the existing admin and ends its sessions', async () => {
    await setAdminCredentials('admin@example.com', 'correct horse battery');

    const result = await setAdminCredentials('new-admin@example.com', 'a much better passphrase');

    expect(result).toBe('updated');
    const admins = await AdminModel.find().lean();
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({ email: 'new-admin@example.com', sessionVersion: 1 });
  });

  it('refuses to run when more than one admin exists', async () => {
    await AdminModel.create([
      { email: 'one@example.com', passwordHash: 'x' },
      { email: 'two@example.com', passwordHash: 'x' },
    ]);

    await expect(setAdminCredentials('admin@example.com', 'correct horse battery')).rejects.toThrow('More than one admin exists');
  });
});
