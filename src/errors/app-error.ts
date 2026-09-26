export interface FieldError {
  field: string;
  message: string;
}

/**
 * Base class for errors that are safe to show to API clients.
 * The error handler sends `message` (and `errors`, if any) with `statusCode`; anything else becomes a generic 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly errors: FieldError[] | undefined;
  // Extra structured data the client needs to act on the error, such as what blocks a delete.
  readonly details: unknown;

  constructor(statusCode: number, message: string, options?: { errors?: FieldError[]; details?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errors = options?.errors;
    this.details = options?.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', options?: { cause?: unknown }) {
    super(400, message, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not allowed') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: { details?: unknown }) {
    super(409, message, options);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request body is too large') {
    super(413, message);
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldError[], message = 'Validation failed') {
    super(422, message, { errors });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(503, message);
  }
}
