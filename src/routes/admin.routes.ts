import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import { certificationRouter, educationRouter, experienceRouter, projectRouter, skillGroupRouter } from './content.routes.js';
import { profileRouter } from './profile.routes.js';
import { sectionRouter } from './section.routes.js';
import { settingsRouter } from './settings.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const adminRouter = Router();

// Auth routes decide per route whether a token is needed (login does not).
adminRouter.use('/auth', authRouter);

// Everything below requires a valid admin token.
adminRouter.use(requireAuth);
adminRouter.use('/profile', profileRouter);
adminRouter.use('/settings', settingsRouter);
adminRouter.use('/sections', sectionRouter);
adminRouter.use('/experiences', experienceRouter);
adminRouter.use('/projects', projectRouter);
adminRouter.use('/skill-groups', skillGroupRouter);
adminRouter.use('/education', educationRouter);
adminRouter.use('/certifications', certificationRouter);
