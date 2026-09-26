import type { FieldError } from '../errors/app-error.js';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}
