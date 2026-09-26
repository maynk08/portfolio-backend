import { Router } from 'express';

import { createCrudController } from '../controllers/crud.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamsSchema, orderSchema, paginationQuerySchema } from '../validators/common.validator.js';

import type { CrudService } from '../services/shared/crud-service.types.js';
import type { z } from 'zod';

interface CrudRouterOptions<CreateInput, UpdateInput> {
  service: CrudService<CreateInput, UpdateInput>;
  resourceName: string;
  createSchema: z.ZodType<CreateInput>;
  updateSchema: z.ZodType<UpdateInput>;
}

// GET /, GET /:id, POST /, PATCH /:id, DELETE /:id, plus PATCH /order for manually ordered resources.
export function createCrudRouter<CreateInput, UpdateInput>(options: CrudRouterOptions<CreateInput, UpdateInput>): Router {
  const router = Router();
  const controller = createCrudController(options.service, options.resourceName);
  const validateId = validateParams(idParamsSchema);

  router.get('/', validateQuery(paginationQuerySchema), controller.list);
  // Registered before `/:id` so "order" is not mistaken for an ID.
  if (options.service.reorder !== undefined) {
    router.patch('/order', validateBody(orderSchema), controller.reorder);
  }
  router.get('/:id', validateId, controller.getById);
  router.post('/', validateBody(options.createSchema), controller.create);
  router.patch('/:id', validateId, validateBody(options.updateSchema), controller.update);
  router.delete('/:id', validateId, controller.remove);

  return router;
}
