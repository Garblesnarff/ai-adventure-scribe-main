import { Request, Response, NextFunction } from 'express';

// Plan-aware rate limiting and quotas (equivalent to rate-limiter-flexible but self-contained)
// - Per-IP and per-user sliding window
// - Configurable by plan (free, pro, enterprise)
// - Memory store by default; can be extended to Postgres if desired

export type PlanName = 'free' | 'pro' | 'enterprise' | string;

export type PlanRateConfig = {
  key: string; // logical route key, e.g. 'llm', 'images'
  perIp: { windowMs: number; maxByPlan: Record<PlanName, number> };
  perUser?: { windowMs: number; maxByPlan: Record<PlanName, number> };
};

// Default limits used by planRateLimit if caller doesn't pass a config
const DEFAULT_LIMITS: Record<string, PlanRateConfig> = {
  // Generous defaults; tests can override plan via X-Plan header in test/dev environments only
  llm: {
    key: 'llm',
    perIp: { windowMs: 60_000, maxByPlan: { free: 20, pro: 120, enterprise: 600 } },
    perUser: { windowMs: 60_000, maxByPlan: { free: 10, pro: 60, enterprise: 300 } },
  },
  images: {
    key: 'images',
    perIp: { windowMs: 60_000, maxByPlan: { free: 10, pro: 60, enterprise: 300 } },
    perUser: { windowMs: 60_000, maxByPlan: { free: 5, pro: 30, enterprise: 150 } },
  },
  default: {
    key: 'global',
    perIp: { windowMs: 60_000, maxByPlan: { free: 60, pro: 600, enterprise: 2000 } },
    perUser: { windowMs: 60_000, maxByPlan: { free: 60, pro: 600, enterprise: 2000 } },
  },
};

// Internal bucket structure for sliding window counters
interface RateBucket { count: number; windowStart: number }

class MemoryStore {
  private buckets = new Map<string, RateBucket>();

  incr(key: string, windowMs: number): { count: number; resetMs: number } {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || now - b.windowStart >= windowMs) {
      b = { count: 0, windowStart: now };
      this.buckets.set(key, b);
    }
    b.count += 1;
    const resetMs = b.windowStart + windowMs - now;
    return { count: b.count, resetMs: resetMs > 0 ? resetMs : 0 };
  }
}

const memoryStore = new MemoryStore();

function getClientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || 'unknown').toString();
}

function getUserId(req: Request): string | null {
  // req.user is attached by requireAuth middleware
  // @ts-ignore - Express augmentation may not be visible here
  const user = (req as any).user as { userId?: string } | undefined;
  return user?.userId || null;
}

function getUserPlan(req: Request): PlanName {
  // SECURITY: X-Plan header only allowed in test/development environments
  const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (isTestOrDev) {
    const hdr = (req.headers['x-plan'] as string | undefined)?.toLowerCase();
    if (hdr) return hdr;
  }
  // @ts-ignore
  const plan = (req as any).user?.plan as string | undefined;
  return (plan || 'free').toLowerCase();
}

function computeMax(config: { maxByPlan: Record<PlanName, number> }, plan: PlanName): number {
  if (config.maxByPlan[plan] != null) return config.maxByPlan[plan];
  if (plan !== 'free' && config.maxByPlan['free'] != null) return config.maxByPlan['free'];
  const first = Object.values(config.maxByPlan)[0];
  return typeof first === 'number' ? first : 60;
}

// New: plan-aware rate limiter (per-IP and optionally per-user)
export function planRateLimit(configOrKey?: Partial<PlanRateConfig> | string) {
  let cfg: PlanRateConfig;
  if (!configOrKey) {
    cfg = DEFAULT_LIMITS.default;
  } else if (typeof configOrKey === 'string') {
    cfg = DEFAULT_LIMITS[configOrKey] || { ...DEFAULT_LIMITS.default, key: configOrKey };
  } else {
    const base = DEFAULT_LIMITS[configOrKey.key || 'default'] || DEFAULT_LIMITS.default;
    cfg = {
      key: configOrKey.key || base.key,
      perIp: configOrKey.perIp || base.perIp,
      perUser: configOrKey.perUser || base.perUser,
    } as PlanRateConfig;
  }

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const userId = getUserId(req);
      const plan = getUserPlan(req);

      // Per-IP
      const ipKey = `${cfg.key}:ip:${ip}`;
      const ipRes = memoryStore.incr(ipKey, cfg.perIp.windowMs);
      const ipMax = computeMax(cfg.perIp, plan);
      if (ipRes.count > ipMax) {
        const retryAfterSec = Math.ceil(ipRes.resetMs / 1000);
        res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
        return res.status(429).json({ error: 'Too many requests', scope: 'ip', retryAfter: retryAfterSec });
      }

      // Per-user (if available)
      if (cfg.perUser && userId) {
        const userKey = `${cfg.key}:user:${userId}`;
        const uRes = memoryStore.incr(userKey, cfg.perUser.windowMs);
        const uMax = computeMax(cfg.perUser, plan);
        if (uRes.count > uMax) {
          const retryAfterSec = Math.ceil(uRes.resetMs / 1000);
          res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
          return res.status(429).json({ error: 'Too many requests', scope: 'user', retryAfter: retryAfterSec });
        }
      }

      return next();
    } catch (err) {
      // SECURITY: Log rate limiter errors but still allow request
      // In production, consider failing closed for critical endpoints
      console.error('Rate limiter error:', err);
      return next();
    }
  };
}

// Backward-compatible simple limiter (per-IP only)
export function createRateLimiter(options: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key } = options;
  return function legacyRateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const routeKey = key || req.baseUrl || 'global';
      const bucketKey = `${routeKey}:${ip}`;
      const now = Date.now();
      const resu = memoryStore.incr(bucketKey, windowMs);
      if (resu.count > max) {
        const retryAfterSec = Math.ceil(resu.resetMs / 1000);
        res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
        return res.status(429).json({ error: 'Too many requests', retryAfter: retryAfterSec });
      }
      return next();
    } catch (err) {
      // SECURITY: Log rate limiter errors
      console.error('Legacy rate limiter error:', err);
      return next();
    }
  };
}
