import { rateLimit } from 'express-rate-limit';

import { TooManyRequestsError } from '../errors/app-error.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS_PER_WINDOW = 5;

// Keyed by `req.ip`, which is the visitor's IP forwarded by the CMS server (see `trust proxy` in the Express loader).
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
