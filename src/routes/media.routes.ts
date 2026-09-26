import { Router } from 'express';

import {
  completeUploadHandler,
  createUploadHandler,
  deleteMediaHandler,
  getMediaHandler,
  getMediaUsagesHandler,
  listMediaHandler,
  updateMediaHandler,
} from '../controllers/media.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamsSchema } from '../validators/common.validator.js';
import { deleteMediaQuerySchema, listMediaQuerySchema, updateMediaSchema, uploadUrlSchema } from '../validators/media.validator.js';

export const mediaRouter = Router();

const validateId = validateParams(idParamsSchema);

mediaRouter.post('/upload-url', validateBody(uploadUrlSchema), createUploadHandler);
mediaRouter.get('/', validateQuery(listMediaQuerySchema), listMediaHandler);
mediaRouter.get('/:id', validateId, getMediaHandler);
mediaRouter.patch('/:id', validateId, validateBody(updateMediaSchema), updateMediaHandler);
mediaRouter.post('/:id/complete', validateId, completeUploadHandler);
mediaRouter.get('/:id/usages', validateId, getMediaUsagesHandler);
mediaRouter.delete('/:id', validateId, validateQuery(deleteMediaQuerySchema), deleteMediaHandler);
