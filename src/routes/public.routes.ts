import { Router } from 'express';

import { receiveContactMessageHandler } from '../controllers/message.controller.js';
import { getHomeHandler, getProjectHandler, getSiteHandler, listProjectsHandler } from '../controllers/public.controller.js';
import { contactRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { contactMessageSchema } from '../validators/message.validator.js';

// Called by the portfolio server; no authentication, and only visible content is ever returned.
export const publicRouter = Router();

publicRouter.get('/site', getSiteHandler);
publicRouter.get('/home', getHomeHandler);
publicRouter.get('/projects', listProjectsHandler);
// The slug is checked in the service: a malformed one is a 404 like any unknown page, not a validation error.
publicRouter.get('/projects/:slug', getProjectHandler);
publicRouter.post('/messages', contactRateLimiter, validateBody(contactMessageSchema), receiveContactMessageHandler);
