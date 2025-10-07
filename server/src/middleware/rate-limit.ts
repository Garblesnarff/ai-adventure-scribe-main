import { Request, Response, NextFunction } from 'express';

type RateBucket = {
  count: number;
  windowStart: number; // epoch ms
};

// In-memory sliding window rate limiter (per IP + route key)
export function createRateLimiter(options: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key } = options;
  const buckets = new Map<string, RateBucket>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
      const routeKey = key || req.baseUrl || 'global';
      const bucketKey = `${routeKey}:${ip}`;
      const now = Date.now();

      let bucket = buckets.get(bucketKey);
      if (!bucket || now - bucket.windowStart >= windowMs) {
        bucket = { count: 0, windowStart: now };
        buckets.set(bucketKey, bucket);
      }

      bucket.count += 1;

      if (bucket.count > max) {
        const retryAfterSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
        res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
        return res.status(429).json({ error: 'Too many requests', retryAfter: retryAfterSec });
      }

      return next();
    } catch (e) {
      // Fail-open on limiter errors
      return next();
    }
  };
}
