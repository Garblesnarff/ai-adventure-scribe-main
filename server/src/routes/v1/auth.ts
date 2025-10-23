import { Router } from 'express';

export default function authRouter() {
  const router = Router();

  /**
   * ALL /v1/auth/*
   *
   * BUSINESS PURPOSE:
   * - This endpoint is deprecated and should not be used.
   * - All authentication is now handled client-side via the Supabase Auth SDK.
   * - This endpoint remains to provide a clear error message to any old clients that might still be trying to use it.
   *
   * RESPONSE (410 Gone):
   * {
   *   "error": "Deprecated",
   *   "message": "Use Supabase Auth. This endpoint is removed."
   * }
   */
  router.all('*', (_req, res) => {
    return res.status(410).json({ error: 'Deprecated', message: 'Use Supabase Auth. This endpoint is removed.' });
  });

  return router;
}
