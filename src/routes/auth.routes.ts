import { Router } from 'express';

import { changePassword, getCurrentAdmin, login, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validateBody(loginSchema), login);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, getCurrentAdmin);
authRouter.patch('/password', requireAuth, validateBody(changePasswordSchema), changePassword);
