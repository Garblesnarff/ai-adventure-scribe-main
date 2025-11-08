/**
 * tRPC Instance and Procedures
 *
 * Defines the core tRPC instance and reusable procedures:
 * - publicProcedure: No authentication required
 * - protectedProcedure: Requires authenticated user
 * - adminProcedure: Requires admin role
 *
 * Also includes middleware for logging, error handling, and performance tracking.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

/**
 * Initialize tRPC with context type
 * Using default JSON transformer (can be upgraded to superjson if needed)
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include additional error context in development
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };
  },
});

/**
 * Base router constructor
 */
export const router = t.router;

/**
 * Middleware factory
 */
export const middleware = t.middleware;

/**
 * Logging middleware - logs all tRPC requests
 */
const loggingMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();

  const result = await next();

  const durationMs = Date.now() - start;
  const userId = ctx.user?.userId ?? 'anonymous';

  // Log request details
  console.log(
    `[tRPC] ${type} ${path} - ${userId} - ${durationMs}ms - ${result.ok ? 'OK' : 'ERROR'}`
  );

  return result;
});

/**
 * Public procedure - no authentication required
 * Includes logging middleware
 */
export const publicProcedure = t.procedure.use(loggingMiddleware);

/**
 * Authentication middleware - ensures user is authenticated
 */
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed to be non-null
    },
  });
});

/**
 * Protected procedure - requires authentication
 * User is guaranteed to be present in context
 */
export const protectedProcedure = t.procedure.use(loggingMiddleware).use(isAuthed);

/**
 * Admin authorization middleware - ensures user has admin role
 */
const isAdmin = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Check if user has admin plan/role
  if (ctx.user.plan !== 'admin' && ctx.user.plan !== 'enterprise') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Admin procedure - requires admin role
 * User with admin privileges is guaranteed to be present
 */
export const adminProcedure = t.procedure.use(loggingMiddleware).use(isAdmin);

/**
 * Export middleware for custom use cases
 */
export { loggingMiddleware, isAuthed, isAdmin };
