import { Router } from 'express';

import { getProfileHandler, replaceProfileHandler } from '../controllers/profile.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { profileSchema } from '../validators/profile.validator.js';

export const profileRouter = Router();

profileRouter.get('/', getProfileHandler);
profileRouter.put('/', validateBody(profileSchema), replaceProfileHandler);
