import * as mediaService from '../services/media.service.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.utils.js';

import type { IdParams } from '../validators/common.validator.js';
import type { DeleteMediaQuery, ListMediaQuery, UpdateMediaInput, UploadUrlInput } from '../validators/media.validator.js';
import type { Request, Response } from 'express';

export async function createUploadHandler(req: Request<unknown, unknown, UploadUrlInput>, res: Response): Promise<void> {
  sendCreated(res, await mediaService.createUpload(req.body));
}

export async function completeUploadHandler(req: Request<IdParams>, res: Response): Promise<void> {
  sendSuccess(res, await mediaService.completeUpload(req.params.id));
}

export async function listMediaHandler(req: Request, res: Response): Promise<void> {
  // Express cannot carry the query type through the middleware chain; `validateQuery` has already replaced it.
  const { items, pagination } = await mediaService.listMedia(req.query as unknown as ListMediaQuery);
  sendPaginated(res, items, pagination);
}

export async function getMediaHandler(req: Request<IdParams>, res: Response): Promise<void> {
  sendSuccess(res, await mediaService.getMedia(req.params.id));
}

export async function updateMediaHandler(req: Request<IdParams, unknown, UpdateMediaInput>, res: Response): Promise<void> {
  sendSuccess(res, await mediaService.updateMedia(req.params.id, req.body));
}

export async function getMediaUsagesHandler(req: Request<IdParams>, res: Response): Promise<void> {
  sendSuccess(res, await mediaService.getMediaUsages(req.params.id));
}

export async function deleteMediaHandler(req: Request<IdParams>, res: Response): Promise<void> {
  // Validated and replaced by `validateQuery`, as above.
  const { force } = req.query as unknown as DeleteMediaQuery;
  await mediaService.deleteMedia(req.params.id, { force });
  sendSuccess(res, null, { message: 'File deleted' });
}
