import { z } from 'zod';

// HS256 needs a key of at least 256 bits; 32 random characters is the practical floor.
const MIN_JWT_SECRET_LENGTH = 32;

// `.env.example` lists optional variables with empty values; an empty value means "not set".
function optionalValue<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH, `must be at least ${MIN_JWT_SECRET_LENGTH} characters`),
  AWS_REGION: optionalValue(z.string().regex(/^[a-z]{2}(-[a-z]+)+-\d$/, 'must be an AWS region such as eu-central-1')),
  S3_BUCKET: optionalValue(z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, 'must be a valid S3 bucket name')),
  AWS_ACCESS_KEY_ID: optionalValue(z.string()),
  AWS_SECRET_ACCESS_KEY: optionalValue(z.string()),
  MEDIA_PUBLIC_BASE_URL: optionalValue(z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, ''))),
});

const STORAGE_VARIABLES = ['AWS_REGION', 'S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const;

type Env = z.infer<typeof envSchema>;

export interface Config {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  mongodbUri: string;
  logLevel: Env['LOG_LEVEL'];
  jwtSecret: string;
  // null until AWS is set up; media uploads are unavailable until then.
  storage: StorageConfig | null;
}

export interface StorageConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  // Where uploaded files are served from: the bucket itself by default, or a CDN in front of it.
  publicBaseUrl: string;
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
  const storage = parseStorageConfig(result.data);
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    mongodbUri: MONGODB_URI,
    logLevel: LOG_LEVEL,
    jwtSecret: JWT_SECRET,
    storage,
  };
}

// Storage is all or nothing: a partial setup is almost certainly a mistake, so it fails at startup.
function parseStorageConfig(env: Env): StorageConfig | null {
  const { AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL } = env;
  if (AWS_REGION === undefined || S3_BUCKET === undefined || AWS_ACCESS_KEY_ID === undefined || AWS_SECRET_ACCESS_KEY === undefined) {
    const setVariables = STORAGE_VARIABLES.filter((name) => env[name] !== undefined);
    if (setVariables.length > 0) {
      const missingVariables = STORAGE_VARIABLES.filter((name) => env[name] === undefined);
      throw new EnvValidationError(missingVariables.map((name) => `${name}: required when any of ${STORAGE_VARIABLES.join(', ')} is set`));
    }
    return null;
  }

  return {
    region: AWS_REGION,
    bucket: S3_BUCKET,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    publicBaseUrl: MEDIA_PUBLIC_BASE_URL ?? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`,
  };
}
