/**
 * Async Handler Utility
 *
 * Wraps async route handlers to automatically catch and forward errors
 * to the error handling middleware.
 *
 * @module server/lib/async-handler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to the error handling middleware
 *
 * @param fn - Async route handler function
 * @returns Wrapped handler that catches errors
 *
 * @example
 * // Without async handler (manual try-catch)
 * app.get('/api/characters/:id', async (req, res, next) => {
 *   try {
 *     const character = await getCharacter(req.params.id);
 *     res.json(character);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // With async handler (automatic error handling)
 * app.get('/api/characters/:id', asyncHandler(async (req, res) => {
 *   const character = await getCharacter(req.params.id);
 *   res.json(character);
 * }));
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
