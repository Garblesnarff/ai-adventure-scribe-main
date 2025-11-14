/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown in the application and returns
 * a consistent JSON response format.
 *
 * MUST be registered LAST in the middleware chain (after all routes)
 *
 * @module server/middleware/error-handler
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';

/**
 * Global error handler middleware
 * Handles both custom AppError instances and unexpected errors
 *
 * @param error - Error object (either AppError or generic Error)
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function (required for error middleware signature)
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error details for debugging
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  // Handle AppError instances (custom errors)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle unexpected errors (500 Internal Server Error)
  return res.status(500).json({
    error: {
      name: 'InternalServerError',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && {
        details: { stack: error.stack }
      }),
    }
  });
}
