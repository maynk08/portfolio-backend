import { listSections, reorderSections, updateSection } from '../services/section.service.js';
import { sendSuccess } from '../utils/response.utils.js';

import type { SectionOrderInput, SectionParams, UpdateSectionInput } from '../validators/section.validator.js';
import type { Request, Response } from 'express';

export async function listSectionsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await listSections());
}

export async function reorderSectionsHandler(req: Request<unknown, unknown, SectionOrderInput>, res: Response): Promise<void> {
  await reorderSections(req.body.keys);
  sendSuccess(res, null, { message: 'Order updated' });
}

export async function updateSectionHandler(req: Request<SectionParams, unknown, UpdateSectionInput>, res: Response): Promise<void> {
  sendSuccess(res, await updateSection(req.params.key, req.body));
}
