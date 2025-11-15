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

// Helper to get environment variable with fallback
function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

// Build limits from environment variables with fallback to hardcoded defaults
function buildLimits(): Record<string, PlanRateConfig> {
  return {
    llm: {
      key: 'llm',
      perIp: {
        windowMs: getEnvInt('RATE_LIMIT_LLM_IP_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_LLM_IP_FREE', 20),
          pro: getEnvInt('RATE_LIMIT_LLM_IP_PRO', 120),
          enterprise: getEnvInt('RATE_LIMIT_LLM_IP_ENTERPRISE', 600),
        },
      },
      perUser: {
        windowMs: getEnvInt('RATE_LIMIT_LLM_USER_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_LLM_USER_FREE', 10),
          pro: getEnvInt('RATE_LIMIT_LLM_USER_PRO', 60),
          enterprise: getEnvInt('RATE_LIMIT_LLM_USER_ENTERPRISE', 300),
        },
      },
    },
    images: {
      key: 'images',
      perIp: {
        windowMs: getEnvInt('RATE_LIMIT_IMAGES_IP_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_IMAGES_IP_FREE', 10),
          pro: getEnvInt('RATE_LIMIT_IMAGES_IP_PRO', 60),
          enterprise: getEnvInt('RATE_LIMIT_IMAGES_IP_ENTERPRISE', 300),
        },
      },
      perUser: {
        windowMs: getEnvInt('RATE_LIMIT_IMAGES_USER_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_IMAGES_USER_FREE', 5),
          pro: getEnvInt('RATE_LIMIT_IMAGES_USER_PRO', 30),
          enterprise: getEnvInt('RATE_LIMIT_IMAGES_USER_ENTERPRISE', 150),
        },
      },
    },
    default: {
      key: 'global',
      perIp: {
        windowMs: getEnvInt('RATE_LIMIT_DEFAULT_IP_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_DEFAULT_IP_FREE', 60),
          pro: getEnvInt('RATE_LIMIT_DEFAULT_IP_PRO', 600),
          enterprise: getEnvInt('RATE_LIMIT_DEFAULT_IP_ENTERPRISE', 2000),
        },
      },
      perUser: {
        windowMs: getEnvInt('RATE_LIMIT_DEFAULT_USER_WINDOW', 60_000),
        maxByPlan: {
          free: getEnvInt('RATE_LIMIT_DEFAULT_USER_FREE', 60),
          pro: getEnvInt('RATE_LIMIT_DEFAULT_USER_PRO', 600),
          enterprise: getEnvInt('RATE_LIMIT_DEFAULT_USER_ENTERPRISE', 2000),
        },
      },
    },
  };
}

// Default limits used by planRateLimit if caller doesn't pass a config
// Now built from environment variables with fallbacks to hardcoded defaults
const DEFAULT_LIMITS: Record<string, PlanRateConfig> = buildLimits();

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
  // Allow overriding via header for tests and easy configuration
  const hdr = (req.headers['x-plan'] as string | undefined)?.toLowerCase();
  if (hdr) return hdr;
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
  const defaultCfg = DEFAULT_LIMITS.default!;

  if (!configOrKey) {
    cfg = defaultCfg;
  } else if (typeof configOrKey === 'string') {
    const found = DEFAULT_LIMITS[configOrKey];
    cfg = found || { ...defaultCfg, key: configOrKey };
  } else {
    const baseKey = configOrKey.key || 'default';
    const base = (DEFAULT_LIMITS[baseKey] || defaultCfg)!;
    cfg = {
      key: configOrKey.key || base.key,
      perIp: configOrKey.perIp || base.perIp,
      perUser: configOrKey.perUser !== undefined ? configOrKey.perUser : base.perUser,
    };
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
        return res.status(429).json({
          error: {
            name: 'RateLimitError',
            message: 'Too many requests from this IP, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            details: {
              scope: 'ip',
              limit: ipMax,
              window: cfg.perIp.windowMs / 1000,
              retryAfter: Math.max(retryAfterSec, 1),
            }
          }
        });
      }

      // Per-user (if available)
      if (cfg.perUser && userId) {
        const userKey = `${cfg.key}:user:${userId}`;
        const uRes = memoryStore.incr(userKey, cfg.perUser.windowMs);
        const uMax = computeMax(cfg.perUser, plan);
        if (uRes.count > uMax) {
          const retryAfterSec = Math.ceil(uRes.resetMs / 1000);
          res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
          return res.status(429).json({
            error: {
              name: 'RateLimitError',
              message: 'Too many requests from this user, please try again later',
              code: 'RATE_LIMIT_EXCEEDED',
              statusCode: 429,
              details: {
                scope: 'user',
                limit: uMax,
                window: cfg.perUser.windowMs / 1000,
                retryAfter: Math.max(retryAfterSec, 1),
              }
            }
          });
        }
      }

      return next();
    } catch {
      // Fail-open on limiter errors
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
        return res.status(429).json({
          error: {
            name: 'RateLimitError',
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            details: {
              scope: 'ip',
              limit: max,
              window: windowMs / 1000,
              retryAfter: Math.max(retryAfterSec, 1),
            }
          }
        });
      }
      return next();
    } catch {
      return next();
    }
  };
}
