import type { FieldError } from '../errors/app-error.js';

// Dates are `YYYY-MM` strings, which compare correctly as plain strings.
export function checkDateRange(startDate: string, endDate: string | null | undefined, endField: string): FieldError[] {
  if (endDate === null || endDate === undefined || endDate >= startDate) {
    return [];
  }
  return [{ field: endField, message: 'Must not be before the start date' }];
}
