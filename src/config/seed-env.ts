import { z } from 'zod';

import { EnvValidationError, formatIssues } from './env.js';
import { emailSchema, newPasswordSchema } from '../validators/auth.validator.js';

const seedEnvSchema = z.object({
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: newPasswordSchema,
});

export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
}

// Read only by the admin seed script, so the server does not need the admin password in its environment.
export function parseSeedEnv(env: NodeJS.ProcessEnv): SeedConfig {
  const result = seedEnvSchema.safeParse(env);
  if (!result.success) {
    throw new EnvValidationError(formatIssues(result.error.issues));
  }
  return { adminEmail: result.data.ADMIN_EMAIL, adminPassword: result.data.ADMIN_PASSWORD };
}
