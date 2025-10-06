import { Router } from 'express';

export default function authRouter() {
  const router = Router();

  // Deprecated: Use Supabase Auth on the client side
  router.all('*', (_req, res) => {
    return res.status(410).json({ error: 'Deprecated', message: 'Use Supabase Auth. This endpoint is removed.' });
  });

  return router;
}

