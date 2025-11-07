import { createClient } from '../lib/db.js';

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
  return DEFAULT_QUOTAS[p] || DEFAULT_QUOTAS['free'];
}

// In-memory fallback store for development/tests
const memTotals = new Map<string, { units: number; period: string }>();

// Flag to ensure table creation runs only once
let tableChecked = false;

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
}): Promise<{ allowed: boolean; remaining: number; resetAt: string } | { allowed: false; remaining: 0; resetAt: string }> {
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
      const db = createClient();
      const client = await db.connect();
      try {
        // IMPROVED: Only check/create table once per process lifecycle
        if (!tableChecked) {
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
          tableChecked = true;
        }
        // Count used units in current period
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(units), 0) AS total FROM ai_usage WHERE (org_id = $1 OR user_id = $2) AND type = $3 AND period_start = $4`,
          [orgId || null, userId, type, pkey]
        );
        const used = Number(rows?.[0]?.total || 0);
        if (used + units > limit) {
          const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
          client.release();
          // Don't call db.end() - using singleton pool
          return { allowed: false, remaining: Math.max(0, limit - used), resetAt } as any;
        }
        // Consume
        await client.query(
          `INSERT INTO ai_usage (org_id, user_id, plan, type, units, period_start) VALUES ($1, $2, $3, $4, $5, $6)`,
          [orgId || null, userId, plan, type, units, pkey]
        );
        const remaining = Math.max(0, limit - (used + units));
        const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
        client.release();
        // Don't call db.end() - using singleton pool
        return { allowed: true, remaining, resetAt };
      } catch (e) {
        try { client.release(); } catch {}
        // Don't call db.end() - using singleton pool
        console.error('Error checking AI usage quota:', e);
        // Fall through to memory
      }
    } catch (err) {
      console.error('Error connecting to database for AI usage:', err);
      // Fall through to memory
    }
  }

  // Memory fallback
  const cur = memTotals.get(key);
  const used = cur && cur.period === pkey ? cur.units : 0;
  if (used + units > limit) {
    const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
    return { allowed: false, remaining: Math.max(0, limit - used), resetAt } as any;
  }
  memTotals.set(key, { units: used + units, period: pkey });
  const remaining = Math.max(0, limit - (used + units));
  const resetAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 0, 0, 0)).toISOString();
  return { allowed: true, remaining, resetAt };
}
