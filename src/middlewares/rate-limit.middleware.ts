import { rateLimit } from 'express-rate-limit';

import { TooManyRequestsError } from '../errors/app-error.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS_PER_WINDOW = 5;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const MAX_CONTACT_MESSAGES_PER_WINDOW = 5;

// Both limiters key on `req.ip`: the visitor's IP forwarded by the CMS or portfolio server (see `trust proxy` in the Express loader).

// Successful logins are not counted, so only failed attempts use up the allowance.
export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: MAX_FAILED_LOGINS_PER_WINDOW,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many failed login attempts, please try again later'));
  },
});

// Counts every submission, including ones caught by the honeypot, so bots are slowed down too.
export const contactRateLimiter = rateLimit({
  windowMs: CONTACT_WINDOW_MS,
  limit: MAX_CONTACT_MESSAGES_PER_WINDOW,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many messages, please try again later'));
  },
});
