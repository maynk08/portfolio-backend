import { getPublicHome, getPublicProject, getPublicSite, listPublicProjects } from '../services/public-content.service.js';
import { sendSuccess } from '../utils/response.utils.js';

import type { Request, Response } from 'express';

export async function getSiteHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getPublicSite());
}

export async function getHomeHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getPublicHome());
}

export async function listProjectsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await listPublicProjects());
}

export async function getProjectHandler(req: Request<{ slug: string }>, res: Response): Promise<void> {
  sendSuccess(res, await getPublicProject(req.params.slug));
}
