import { Router } from 'express';

import { listSectionsHandler, reorderSectionsHandler, updateSectionHandler } from '../controllers/section.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { sectionOrderSchema, sectionParamsSchema, updateSectionSchema } from '../validators/section.validator.js';

export const sectionRouter = Router();

sectionRouter.get('/', listSectionsHandler);
// Registered before `/:key` so "order" is not mistaken for a section key.
sectionRouter.patch('/order', validateBody(sectionOrderSchema), reorderSectionsHandler);
sectionRouter.patch('/:key', validateParams(sectionParamsSchema), validateBody(updateSectionSchema), updateSectionHandler);
