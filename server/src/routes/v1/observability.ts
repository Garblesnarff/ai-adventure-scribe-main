import { Router } from 'express';
import { createRateLimiter } from '../../middleware/rate-limit.js';

function observabilityRouter() {
  const r = Router();

  // SECURITY: Aggressive rate limiting to prevent log poisoning attacks
  // Frontend error/metric endpoints don't require auth (for guest users reporting errors)
  // but must be heavily rate limited per IP
  const errorRateLimit = createRateLimiter({
    windowMs: 60_000, // 1 minute
    max: 20, // Max 20 errors per minute per IP
    key: 'observability:error'
  });

  const metricRateLimit = createRateLimiter({
    windowMs: 60_000, // 1 minute
    max: 50, // Max 50 metrics per minute per IP
    key: 'observability:metric'
  });

  r.post('/error', errorRateLimit, (req, res) => {
    const rid = res.locals.requestId || (req as any).requestId;
    const { message, stack, extra } = req.body || {};

    // SECURITY: Sanitize and truncate error messages to prevent abuse
    const sanitizedMessage = typeof message === 'string' ? message.slice(0, 500) : 'No message';
    const sanitizedStack = typeof stack === 'string' ? stack.slice(0, 2000) : undefined;

    const payload = {
      level: 'error',
      msg: 'frontend.error',
      requestId: rid,
      error: { message: sanitizedMessage, stack: sanitizedStack },
      extra: extra && typeof extra === 'object' ? JSON.stringify(extra).slice(0, 500) : undefined,
    };
    console.error(JSON.stringify(payload));
    res.status(204).end();
  });

  r.post('/metric', metricRateLimit, (req, res) => {
    const rid = res.locals.requestId || (req as any).requestId;
    const { name, value, tags } = req.body || {};

    // SECURITY: Validate metric data
    if (typeof name !== 'string' || name.length > 100) {
      res.status(400).json({ error: 'Invalid metric name' });
      return;
    }

    const payload = {
      level: 'info',
      msg: 'frontend.metric',
      requestId: rid,
      metric: {
        name: name.slice(0, 100),
        value: typeof value === 'number' ? value : 0,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : undefined
      },
    };
    console.log(JSON.stringify(payload));
    res.status(204).end();
  });

  return r;
}

export default observabilityRouter;
