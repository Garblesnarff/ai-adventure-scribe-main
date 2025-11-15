/**
 * Standardized Error Handling System
 *
 * Provides a type-safe error hierarchy for consistent error handling
 * across all services and API routes.
 *
 * @module server/lib/errors
 */

/**
 * Base application error class
 * All custom errors extend from this class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      }
    };
  }
}

/**
 * 400 - Validation or input error
 * Use when user provides invalid input or violates validation rules
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 - Authentication required
 * Use when user is not authenticated but needs to be
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * 403 - Insufficient permissions
 * Use when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

/**
 * 404 - Resource not found
 * Use when a requested resource doesn't exist in the database
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(404, message, 'NOT_FOUND', { resource, id });
  }
}

/**
 * 409 - Conflict or duplicate resource
 * Use when an operation conflicts with existing data (e.g., duplicate key)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, message, 'CONFLICT', details);
  }
}

/**
 * 422 - Business logic error
 * Use when the request is valid but violates business rules
 * Example: trying to use more spell slots than available
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * 500 - Internal server error
 * Use when an unexpected error occurs (database errors, third-party API failures, etc.)
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(500, message, 'INTERNAL_ERROR', details);
  }
}
