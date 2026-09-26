import { Router } from 'express';

import { receiveContactMessageHandler } from '../controllers/message.controller.js';
import { contactRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { contactMessageSchema } from '../validators/message.validator.js';

// Called by the portfolio server; no authentication, and only visible content is ever returned.
export const publicRouter = Router();

publicRouter.post('/messages', contactRateLimiter, validateBody(contactMessageSchema), receiveContactMessageHandler);
