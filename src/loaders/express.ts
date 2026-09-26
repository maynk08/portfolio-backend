import express from 'express';
import helmet from 'helmet';

import { handleError } from '../middlewares/error-handler.middleware.js';
import { handleUnknownRoute } from '../middlewares/not-found.middleware.js';
import { requestLogger } from '../middlewares/request-logger.middleware.js';
import { rootRouter } from '../routes/index.js';

import type { Express } from 'express';

const JSON_BODY_LIMIT = '100kb';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Only the CMS and portfolio servers call this API, and they forward the visitor's IP in X-Forwarded-For.
  // Trusting loopback makes `req.ip` that visitor IP, which rate limiting keys on. Revisit when hosting is decided.
  app.set('trust proxy', 'loopback');
  app.use(requestLogger);
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(rootRouter);

  app.use(handleUnknownRoute);
  app.use(handleError);

  return app;
}
