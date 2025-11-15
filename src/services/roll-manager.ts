import { logger } from '../lib/logger';

import { supabase } from '@/integrations/supabase/client';

export type RollKind = 'check' | 'save' | 'attack' | 'initiative' | 'damage';

export interface RollRequestEntry {
  sessionId: string;
  kind: RollKind;
  purpose?: string;
  formula?: string;
  dc?: number;
  ac?: number;
  advantage?: boolean;
  disadvantage?: boolean;
  meta?: any;
}

export interface RollResultEntry {
  sessionId: string;
  kind: RollKind;
  resultTotal: number;
  resultNatural?: number;
  dc?: number;
  ac?: number;
  success?: boolean;
  meta?: any;
}

function flagEnabled(): boolean {
  try {
    const v = String((import.meta as any)?.env?.VITE_ENABLE_ROLL_HISTORY ?? 'false').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(v);
  } catch {
    return false;
  }
}

async function safePrune(sessionId: string, cap = 500) {
  try {
    const { data: ids } = await supabase
      .from('roll_history')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .range(cap, 100000);

    const toDelete = (ids || []).map((r: any) => r.id);
    if (toDelete.length > 0) {
      await supabase.from('roll_history').delete().in('id', toDelete);
    }
  } catch (e) {
    // Fail-safe: table may not exist or permission error; ignore
    logger.warn('[RollManager] prune skipped:', e);
  }
}

export const RollManager = {
  async recordRollRequest(e: RollRequestEntry) {
    if (!flagEnabled()) return;
    try {
      const payload: any = {
        session_id: e.sessionId,
        kind: e.kind,
        purpose: e.purpose ?? null,
        formula: e.formula ?? null,
        dc: e.dc ?? null,
        ac: e.ac ?? null,
        advantage: e.advantage ?? null,
        disadvantage: e.disadvantage ?? null,
        meta: e.meta ?? {},
      };
      await supabase.from('roll_history').insert(payload);
      await safePrune(e.sessionId);
    } catch (err) {
      logger.warn('[RollManager] recordRollRequest failed (non-fatal):', err);
    }
  },

  async recordRollResult(e: RollResultEntry) {
    if (!flagEnabled()) return;
    try {
      let success: boolean | null = null;
      if (typeof e.dc === 'number') success = e.resultTotal >= e.dc;
      if (typeof e.ac === 'number') success = e.resultTotal >= e.ac;

      const payload: any = {
        session_id: e.sessionId,
        kind: e.kind,
        result_total: e.resultTotal,
        result_natural: e.resultNatural ?? null,
        dc: e.dc ?? null,
        ac: e.ac ?? null,
        success,
        meta: e.meta ?? {},
      };
      await supabase.from('roll_history').insert(payload);
      await safePrune(e.sessionId);
    } catch (err) {
      logger.warn('[RollManager] recordRollResult failed (non-fatal):', err);
    }
  },

  async getRecentRolls(sessionId: string, limit = 50) {
    if (!flagEnabled()) return [] as any[];
    try {
      const { data, error } = await supabase
        .from('roll_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.warn('[RollManager] getRecentRolls failed (non-fatal):', err);
      return [] as any[];
    }
  },
};
