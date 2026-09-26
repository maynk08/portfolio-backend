import { pino } from 'pino';

import { config } from '../config/index.js';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
];

export const logger = pino({
  level: config.logLevel,
  redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
});
