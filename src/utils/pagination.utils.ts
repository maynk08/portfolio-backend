export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function buildPaginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) };
}
