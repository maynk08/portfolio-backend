import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv } from '../../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/portfolio',
  LOG_LEVEL: 'debug',
  JWT_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('returns typed config for valid values', () => {
    expect(parseEnv(validEnv)).toEqual({
      nodeEnv: 'development',
      port: 4000,
      mongodbUri: 'mongodb://localhost:27017/portfolio',
      logLevel: 'debug',
      jwtSecret: 'x'.repeat(32),
      storage: null,
    });
  });

  it('defaults LOG_LEVEL to info', () => {
    expect(parseEnv({ ...validEnv, LOG_LEVEL: undefined }).logLevel).toBe('info');
  });

  it('accepts mongodb+srv connection strings', () => {
    expect(parseEnv({ ...validEnv, MONGODB_URI: 'mongodb+srv://cluster.example.net/portfolio' }).mongodbUri).toBe(
      'mongodb+srv://cluster.example.net/portfolio',
    );
  });

  it.each([
    ['NODE_ENV is not an allowed value', { NODE_ENV: 'staging' }],
    ['PORT is not a number', { PORT: 'abc' }],
    ['PORT is out of range', { PORT: '70000' }],
    ['MONGODB_URI is not a MongoDB URI', { MONGODB_URI: 'http://localhost:27017' }],
    ['LOG_LEVEL is not an allowed value', { LOG_LEVEL: 'verbose' }],
    ['JWT_SECRET is shorter than 32 characters', { JWT_SECRET: 'x'.repeat(31) }],
  ])('rejects the config when %s', (_description, override) => {
    expect(() => parseEnv({ ...validEnv, ...override })).toThrow(EnvValidationError);
  });

  it('lists every missing variable', () => {
    expect(() => parseEnv({})).toThrow(/NODE_ENV[\s\S]*PORT[\s\S]*MONGODB_URI/);
  });

  it('does not include variable values in the error message', () => {
    let message = '';
    try {
      parseEnv({ ...validEnv, MONGODB_URI: 'postgres://admin:super-secret@localhost' });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toContain('MONGODB_URI');
    expect(message).not.toContain('super-secret');
  });

  describe('storage', () => {
    const storageEnv = {
      AWS_REGION: 'eu-central-1',
      S3_BUCKET: 'portfolio-media',
      AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'secret',
    };

    it('is disabled when every storage variable is empty', () => {
      const emptyStorageEnv = {
        AWS_REGION: '',
        S3_BUCKET: '',
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
        MEDIA_PUBLIC_BASE_URL: '',
      };

      expect(parseEnv({ ...validEnv, ...emptyStorageEnv }).storage).toBeNull();
    });

    it('defaults the public URL to the bucket', () => {
      expect(parseEnv({ ...validEnv, ...storageEnv }).storage).toEqual({
        region: 'eu-central-1',
        bucket: 'portfolio-media',
        accessKeyId: 'AKIAEXAMPLE',
        secretAccessKey: 'secret',
        publicBaseUrl: 'https://portfolio-media.s3.eu-central-1.amazonaws.com',
      });
    });

    it('uses a custom public URL without its trailing slash', () => {
      const storage = parseEnv({ ...validEnv, ...storageEnv, MEDIA_PUBLIC_BASE_URL: 'https://cdn.example.com/' }).storage;

      expect(storage?.publicBaseUrl).toBe('https://cdn.example.com');
    });

    it('rejects a partial setup and names the missing variables', () => {
      expect(() => parseEnv({ ...validEnv, S3_BUCKET: 'portfolio-media' })).toThrow(
        /AWS_REGION[\s\S]*AWS_ACCESS_KEY_ID[\s\S]*AWS_SECRET_ACCESS_KEY/,
      );
    });

    it('rejects an invalid region', () => {
      expect(() => parseEnv({ ...validEnv, ...storageEnv, AWS_REGION: 'Frankfurt' })).toThrow(EnvValidationError);
    });
  });
});
