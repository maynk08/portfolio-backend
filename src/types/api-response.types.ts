import type { FieldError } from '../errors/app-error.js';
import type { PaginationMeta } from '../utils/pagination.utils.js';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}
