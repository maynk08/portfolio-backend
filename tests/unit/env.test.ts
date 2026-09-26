import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv } from '../../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/portfolio',
  LOG_LEVEL: 'debug',
};

describe('parseEnv', () => {
  it('returns typed config for valid values', () => {
    expect(parseEnv(validEnv)).toEqual({
      nodeEnv: 'development',
      port: 4000,
      mongodbUri: 'mongodb://localhost:27017/portfolio',
      logLevel: 'debug',
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
});
