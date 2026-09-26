import { z } from 'zod';

// HS256 needs a key of at least 256 bits; 32 random characters is the practical floor.
const MIN_JWT_SECRET_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH, `must be at least ${MIN_JWT_SECRET_LENGTH} characters`),
});

type Env = z.infer<typeof envSchema>;

export interface Config {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  mongodbUri: string;
  logLevel: Env['LOG_LEVEL'];
  jwtSecret: string;
}

export function formatIssues(issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
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
    throw new EnvValidationError(formatIssues(result.error.issues));
  }

  const { NODE_ENV, PORT, MONGODB_URI, LOG_LEVEL, JWT_SECRET } = result.data;
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    mongodbUri: MONGODB_URI,
    logLevel: LOG_LEVEL,
    jwtSecret: JWT_SECRET,
  };
}
