import { Router } from 'express';

import { getSettingsHandler, replaceSettingsHandler } from '../controllers/settings.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { settingsSchema } from '../validators/settings.validator.js';

export const settingsRouter = Router();

settingsRouter.get('/', getSettingsHandler);
settingsRouter.put('/', validateBody(settingsSchema), replaceSettingsHandler);
