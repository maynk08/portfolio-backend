import type { PaginationMeta } from '../../utils/pagination.utils.js';
import type { PaginationQuery } from '../../validators/common.validator.js';

// The operations every list-type content resource supports; `reorder` only for manually ordered ones.
export interface CrudService<CreateInput, UpdateInput> {
  list(query: PaginationQuery): Promise<{ items: unknown[]; pagination: PaginationMeta }>;
  getById(id: string): Promise<unknown>;
  create(input: CreateInput): Promise<unknown>;
  update(id: string, input: UpdateInput): Promise<unknown>;
  remove(id: string): Promise<void>;
  reorder?(ids: string[]): Promise<void>;
}
