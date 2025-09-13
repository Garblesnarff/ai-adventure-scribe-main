/**
 * RESTful API Error Handling
 * 
 * Comprehensive error classes following RFC 7807 Problem Details for HTTP APIs
 * and proper HTTP status code semantics.
 */

export class RestError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly title: string;
  public readonly detail: string;
  public readonly instance?: string;
  public readonly extensions?: Record<string, any>;

  constructor(
    statusCode: number,
    type: string,
    title: string,
    detail: string,
    instance?: string,
    extensions?: Record<string, any>
  ) {
    super(detail);
    this.name = 'RestError';
    this.statusCode = statusCode;
    this.type = type;
    this.title = title;
    this.detail = detail;
    this.instance = instance;
    this.extensions = extensions;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      detail: this.detail,
      status: this.statusCode,
      ...(this.instance && { instance: this.instance }),
      ...(this.extensions && { ...this.extensions })
    };
  }
}

/**
 * 400 Bad Request - The request could not be understood by the server
 */
export class BadRequestError extends RestError {
  constructor(detail: string, instance?: string, extensions?: Record<string, any>) {
    super(
      400,
      'https://httpstatuses.com/400',
      'Bad Request',
      detail,
      instance,
      extensions
    );
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized - Authentication is required
 */
export class UnauthorizedError extends RestError {
  constructor(detail: string = 'Authentication required', instance?: string) {
    super(
      401,
      'https://httpstatuses.com/401',
      'Unauthorized',
      detail,
      instance,
      {
        'WWW-Authenticate': 'Bearer'
      }
    );
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden - The server understood but refuses to authorize
 */
export class ForbiddenError extends RestError {
  constructor(detail: string = 'Access denied', instance?: string) {
    super(
      403,
      'https://httpstatuses.com/403',
      'Forbidden',
      detail,
      instance
    );
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found - The requested resource could not be found
 */
export class NotFoundError extends RestError {
  constructor(detail: string = 'Resource not found', instance?: string) {
    super(
      404,
      'https://httpstatuses.com/404',
      'Not Found',
      detail,
      instance
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 405 Method Not Allowed - The method is not allowed for this resource
 */
export class MethodNotAllowedError extends RestError {
  constructor(allowedMethods: string[], instance?: string) {
    super(
      405,
      'https://httpstatuses.com/405',
      'Method Not Allowed',
      `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      instance,
      {
        'Allow': allowedMethods.join(', ')
      }
    );
    this.name = 'MethodNotAllowedError';
  }
}

/**
 * 406 Not Acceptable - The server cannot produce content matching the Accept headers
 */
export class NotAcceptableError extends RestError {
  constructor(acceptedTypes: string[], instance?: string) {
    super(
      406,
      'https://httpstatuses.com/406',
      'Not Acceptable',
      `Server cannot produce content matching Accept header. Supported types: ${acceptedTypes.join(', ')}`,
      instance
    );
    this.name = 'NotAcceptableError';
  }
}

/**
 * 409 Conflict - The request conflicts with current state
 */
export class ConflictError extends RestError {
  constructor(detail: string, instance?: string, extensions?: Record<string, any>) {
    super(
      409,
      'https://httpstatuses.com/409',
      'Conflict',
      detail,
      instance,
      extensions
    );
    this.name = 'ConflictError';
  }
}

/**
 * 410 Gone - The resource is no longer available
 */
export class GoneError extends RestError {
  constructor(detail: string = 'Resource is no longer available', instance?: string) {
    super(
      410,
      'https://httpstatuses.com/410',
      'Gone',
      detail,
      instance
    );
    this.name = 'GoneError';
  }
}

/**
 * 412 Precondition Failed - One or more conditions were not met
 */
export class PreconditionFailedError extends RestError {
  constructor(detail: string, instance?: string) {
    super(
      412,
      'https://httpstatuses.com/412',
      'Precondition Failed',
      detail,
      instance
    );
    this.name = 'PreconditionFailedError';
  }
}

/**
 * 413 Payload Too Large - The request payload is larger than allowed
 */
export class PayloadTooLargeError extends RestError {
  constructor(maxSize: string, instance?: string) {
    super(
      413,
      'https://httpstatuses.com/413',
      'Payload Too Large',
      `Request payload exceeds maximum allowed size of ${maxSize}`,
      instance
    );
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * 415 Unsupported Media Type - The media type is not supported
 */
export class UnsupportedMediaTypeError extends RestError {
  constructor(supportedTypes: string[], instance?: string) {
    super(
      415,
      'https://httpstatuses.com/415',
      'Unsupported Media Type',
      `Unsupported media type. Supported types: ${supportedTypes.join(', ')}`,
      instance
    );
    this.name = 'UnsupportedMediaTypeError';
  }
}

/**
 * 422 Unprocessable Entity - The request was well-formed but contains semantic errors
 */
export class ValidationError extends RestError {
  constructor(
    detail: string,
    validationErrors?: Array<{field: string, message: string}>,
    instance?: string
  ) {
    super(
      422,
      'https://httpstatuses.com/422',
      'Unprocessable Entity',
      detail,
      instance,
      validationErrors ? { validationErrors } : undefined
    );
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitExceededError extends RestError {
  constructor(
    retryAfter: number,
    detail: string = 'Rate limit exceeded',
    instance?: string
  ) {
    super(
      429,
      'https://httpstatuses.com/429',
      'Too Many Requests',
      detail,
      instance,
      {
        'Retry-After': retryAfter.toString()
      }
    );
    this.name = 'RateLimitExceededError';
  }
}

/**
 * 500 Internal Server Error - A generic server error
 */
export class InternalServerError extends RestError {
  constructor(detail: string = 'Internal server error', instance?: string) {
    super(
      500,
      'https://httpstatuses.com/500',
      'Internal Server Error',
      detail,
      instance
    );
    this.name = 'InternalServerError';
  }
}

/**
 * 501 Not Implemented - The server does not support the functionality
 */
export class NotImplementedError extends RestError {
  constructor(detail: string = 'Functionality not implemented', instance?: string) {
    super(
      501,
      'https://httpstatuses.com/501',
      'Not Implemented',
      detail,
      instance
    );
    this.name = 'NotImplementedError';
  }
}

/**
 * 503 Service Unavailable - The server is temporarily unable to handle the request
 */
export class ServiceUnavailableError extends RestError {
  constructor(
    retryAfter?: number,
    detail: string = 'Service temporarily unavailable',
    instance?: string
  ) {
    super(
      503,
      'https://httpstatuses.com/503',
      'Service Unavailable',
      detail,
      instance,
      retryAfter ? { 'Retry-After': retryAfter.toString() } : undefined
    );
    this.name = 'ServiceUnavailableError';
  }
}