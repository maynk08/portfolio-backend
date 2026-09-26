import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

type Env = z.infer<typeof envSchema>;

export interface Config {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  mongodbUri: string;
  logLevel: Env['LOG_LEVEL'];
}

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

export function parseEnv(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Only variable names and rule messages are reported, never the values, so secrets cannot leak into logs.
    throw new EnvValidationError(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }

  const { NODE_ENV, PORT, MONGODB_URI, LOG_LEVEL } = result.data;
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    mongodbUri: MONGODB_URI,
    logLevel: LOG_LEVEL,
  };
}
