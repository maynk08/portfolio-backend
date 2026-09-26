import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.utils.js';

import type { CrudService } from '../services/shared/crud-service.types.js';
import type { IdParams, OrderInput, PaginationQuery } from '../validators/common.validator.js';
import type { Request, Response } from 'express';

type TypedRequest<Params, Body> = Request<Params, unknown, Body>;

// Thin handlers shared by every list-type resource; the validators on each route guarantee the request types.
export function createCrudController<CreateInput, UpdateInput>(service: CrudService<CreateInput, UpdateInput>, resourceName: string) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      // Express cannot carry the query type through the middleware chain; `validateQuery` has already replaced it.
      const query = req.query as unknown as PaginationQuery;
      const { items, pagination } = await service.list(query);
      sendPaginated(res, items, pagination);
    },

    getById: async (req: TypedRequest<IdParams, unknown>, res: Response): Promise<void> => {
      sendSuccess(res, await service.getById(req.params.id));
    },

    create: async (req: TypedRequest<unknown, CreateInput>, res: Response): Promise<void> => {
      sendCreated(res, await service.create(req.body));
    },

    update: async (req: TypedRequest<IdParams, UpdateInput>, res: Response): Promise<void> => {
      sendSuccess(res, await service.update(req.params.id, req.body));
    },

    remove: async (req: TypedRequest<IdParams, unknown>, res: Response): Promise<void> => {
      await service.remove(req.params.id);
      sendSuccess(res, null, { message: `${resourceName} deleted` });
    },

    reorder: async (req: TypedRequest<unknown, OrderInput>, res: Response): Promise<void> => {
      if (service.reorder === undefined) {
        throw new Error(`${resourceName} does not support manual ordering`);
      }
      await service.reorder(req.body.ids);
      sendSuccess(res, null, { message: 'Order updated' });
    },
  };
}
