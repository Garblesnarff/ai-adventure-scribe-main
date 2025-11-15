import { createPgClient } from '../../../src/infrastructure/database/index.js';

export type UsageType = 'llm' | 'image' | 'voice';

export type QuotaConfig = {
  daily: Record<UsageType, number>;
};

/**
 * AI Usage Service
 *
 * Manages AI usage quotas and consumption tracking for different plan types.
 * Supports both PostgreSQL and in-memory storage for development/testing.
 *
 * @example
 * ```typescript
 * const result = await AIUsageService.checkQuotaAndConsume({
 *   userId: 'user123',
 *   plan: 'pro',
 *   type: 'llm',
 *   units: 1
 * });
 *
 * if (result.allowed) {
 *   // Process AI request
 * }
 * ```
 */
export class AIUsageService {
  private static readonly DEFAULT_QUOTAS: Record<string, QuotaConfig> = {
    free: {
      daily: { llm: 30, image: 5, voice: 10 },
    },
    pro: {
      daily: { llm: 100, image: 50, voice: 200 },
    },
    enterprise: {
      daily: { llm: 1000, image: 500, voice: 2000 },
    },
  };

  // In-memory fallback store for development/tests
  private static readonly memTotals = new Map<string, { units: number; period: string }>();

  /**
   * Get quota configuration for a plan
   * @param plan - Plan name (free, pro, enterprise)
   * @returns Quota configuration
   */
  private static getPlanQuota(plan: string): QuotaConfig {
    const p = (plan || 'free').toLowerCase();
    const quota = AIUsageService.DEFAULT_QUOTAS[p];
    return quota || AIUsageService.DEFAULT_QUOTAS['free']!;
  }

  /**
   * Generate period key for current UTC date
   * @param now - Date to generate key for (defaults to now)
   * @returns Period key in YYYY-MM-DD format
   */
  private static periodKey(now = new Date()): string {
    // YYYY-MM-DD UTC
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Check quota availability and consume units if allowed
   * @param opts - Options including userId, plan, type, and units
   * @returns Result indicating if allowed, remaining units, and reset time
   */
  static async checkQuotaAndConsume(opts: {
    orgId?: string | null;
    userId: string;
    plan: string;
    type: UsageType;
    units?: number;
  }): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
    const { userId, orgId, plan, type } = opts;
    const units = Math.max(1, Math.floor(opts.units ?? 1));
    const quota = AIUsageService.getPlanQuota(plan);
    const limit = quota.daily[type];
    const pkey = AIUsageService.periodKey();
    const scope = orgId || userId;
    const key = `${scope}:${type}:${pkey}`;

  // Try Postgres if configured
  if (process.env.DATABASE_URL) {
    try {
      const db = createPgClient();
      const client = await db.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ai_usage (
            org_id TEXT,
            user_id TEXT,
            plan TEXT,
            type TEXT,
            units INTEGER NOT NULL,
            period_start DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        // Count used units in current period
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(units), 0) AS total FROM ai_usage WHERE (org_id = $1 OR user_id = $2) AND type = $3 AND period_start = $4`,
          [orgId || null, userId, type, pkey]
        );
        const used = Number(rows?.[0]?.total || 0);
        if (used + units > limit) {
          const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
          client.release();
          await db.end();
          return { allowed: false, remaining: Math.max(0, limit - used), resetAt };
        }
        // Consume
        await client.query(
          `INSERT INTO ai_usage (org_id, user_id, plan, type, units, period_start) VALUES ($1, $2, $3, $4, $5, $6)`,
          [orgId || null, userId, plan, type, units, pkey]
        );
        const remaining = Math.max(0, limit - (used + units));
        const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
        client.release();
        await db.end();
        return { allowed: true, remaining, resetAt };
      } catch (e) {
        try { client.release(); } catch {}
        try { await db.end(); } catch {}
        // Fall through to memory
      }
    } catch {
      // Fall through to memory
    }
  }

    // Memory fallback
    const cur = AIUsageService.memTotals.get(key);
    const used = cur && cur.period === pkey ? cur.units : 0;
    if (used + units > limit) {
      const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
      return { allowed: false, remaining: Math.max(0, limit - used), resetAt };
    }
    AIUsageService.memTotals.set(key, { units: used + units, period: pkey });
    const remaining = Math.max(0, limit - (used + units));
    const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
    return { allowed: true, remaining, resetAt };
  }

  /**
   * Get current quota status without consuming units
   * @param opts - Options including userId, plan, and type
   * @returns Quota status with usage, remaining units, and reset time
   */
  static async getQuotaStatus(opts: {
    orgId?: string | null;
    userId: string;
    plan: string;
    type: UsageType;
  }): Promise<{ plan: string; limits: { daily: Record<UsageType, number> }; usage: number; remaining: number; resetAt: string }> {
    const { userId, orgId, plan, type } = opts;
    const quota = AIUsageService.getPlanQuota(plan);
    const limit = quota.daily[type];
    const pkey = AIUsageService.periodKey();
    const scope = orgId || userId;
    const key = `${scope}:${type}:${pkey}`;

    let used = 0;

  // Try Postgres if configured
  if (process.env.DATABASE_URL) {
    try {
      const db = createPgClient();
      const client = await db.connect();
      try {
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(units), 0) AS total FROM ai_usage WHERE (org_id = $1 OR user_id = $2) AND type = $3 AND period_start = $4`,
          [orgId || null, userId, type, pkey]
        );
        used = Number(rows?.[0]?.total || 0);
        client.release();
        await db.end();
      } catch (e) {
        try { client.release(); } catch {}
        try { await db.end(); } catch {}
        // Fall through to memory
      }
    } catch {
      // Fall through to memory
    }
  }

    // Memory fallback if DB not used or failed
    if (used === 0) {
      const cur = AIUsageService.memTotals.get(key);
      used = cur && cur.period === pkey ? cur.units : 0;
    }

    const remaining = Math.max(0, limit - used);
    const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();

    return {
      plan,
      limits: quota,
      usage: used,
      remaining,
      resetAt
    };
  }
}
