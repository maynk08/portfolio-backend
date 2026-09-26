import { z } from 'zod';

const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 12;
// bcrypt ignores everything after the first 72 bytes, so longer passwords would give a false sense of strength.
const MAX_PASSWORD_BYTES = 72;

export const emailSchema = z
  .string('Email is required')
  .trim()
  .toLowerCase()
  .max(MAX_EMAIL_LENGTH)
  .pipe(z.email('Enter a valid email address'));

const passwordBytesSchema = z
  .string('Password is required')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES, `Password must be at most ${MAX_PASSWORD_BYTES} bytes`);

// Rules for setting a password. Checking an existing one only needs it to be present and within bcrypt's limit.
export const newPasswordSchema = passwordBytesSchema.check(
  z.minLength(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
);

const existingPasswordSchema = passwordBytesSchema.check(z.minLength(1, 'Password is required'));

export const loginSchema = z.object({
  email: emailSchema,
  password: existingPasswordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: existingPasswordSchema,
    newPassword: newPasswordSchema,
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
