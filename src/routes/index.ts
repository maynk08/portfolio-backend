import { Router } from 'express';

import { adminRouter } from './admin.routes.js';
import { healthRouter } from './health.routes.js';

export const rootRouter = Router();

rootRouter.use('/health', healthRouter);
rootRouter.use('/api/admin', adminRouter);
