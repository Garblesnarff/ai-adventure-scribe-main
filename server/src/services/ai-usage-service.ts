import { createPgClient } from '../../../src/infrastructure/database/index.js';

export type UsageType = 'llm' | 'image' | 'voice';

export type QuotaConfig = {
  daily: Record<UsageType, number>;
};

const DEFAULT_QUOTAS: Record<string, QuotaConfig> = {
  free: {
    daily: { llm: 3, image: 2, voice: 5 },
  },
  pro: {
    daily: { llm: 100, image: 50, voice: 200 },
  },
  enterprise: {
    daily: { llm: 1000, image: 500, voice: 2000 },
  },
};

function getPlanQuota(plan: string): QuotaConfig {
  const p = (plan || 'free').toLowerCase();
  const quota = DEFAULT_QUOTAS[p];
  return quota || DEFAULT_QUOTAS['free']!;
}

// In-memory fallback store for development/tests
const memTotals = new Map<string, { units: number; period: string }>();

function periodKey(now = new Date()): string {
  // YYYY-MM-DD UTC
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function checkQuotaAndConsume(opts: {
  orgId?: string | null;
  userId: string;
  plan: string;
  type: UsageType;
  units?: number;
}): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const { userId, orgId, plan, type } = opts;
  const units = Math.max(1, Math.floor(opts.units ?? 1));
  const quota = getPlanQuota(plan);
  const limit = quota.daily[type];
  const pkey = periodKey();
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
  const cur = memTotals.get(key);
  const used = cur && cur.period === pkey ? cur.units : 0;
  if (used + units > limit) {
    const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
    return { allowed: false, remaining: Math.max(0, limit - used), resetAt };
  }
  memTotals.set(key, { units: used + units, period: pkey });
  const remaining = Math.max(0, limit - (used + units));
  const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
  return { allowed: true, remaining, resetAt };
}
