import { describe, expect, it } from 'vitest';

import { emailSchema, newPasswordSchema } from '../../src/validators/auth.validator.js';

describe('emailSchema', () => {
  it('trims and lowercases the email', () => {
    expect(emailSchema.parse('  Admin@Example.COM ')).toBe('admin@example.com');
  });

  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse('admin@').success).toBe(false);
  });
});

describe('newPasswordSchema', () => {
  it('accepts a password of 12 characters', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(12)).success).toBe(true);
  });

  it('rejects a password shorter than 12 characters', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(11)).success).toBe(false);
  });

  it('accepts exactly 72 bytes', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(72)).success).toBe(true);
  });

  it('counts bytes, not characters, against the 72-byte bcrypt limit', () => {
    // 25 three-byte characters are 75 bytes but only 25 characters.
    expect(newPasswordSchema.safeParse('€'.repeat(25)).success).toBe(false);
  });
});
