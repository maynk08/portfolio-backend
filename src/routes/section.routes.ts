import { Router } from 'express';

import { listSectionsHandler, updateSectionHandler } from '../controllers/section.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { sectionParamsSchema, updateSectionSchema } from '../validators/section.validator.js';

export const sectionRouter = Router();

sectionRouter.get('/', listSectionsHandler);
sectionRouter.patch('/:key', validateParams(sectionParamsSchema), validateBody(updateSectionSchema), updateSectionHandler);
