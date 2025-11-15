import type { SessionStatePayload } from '@/types/session-state';

import { supabase } from '@/integrations/supabase/client';
import { createDefaultSessionState } from '@/types/session-state';

/**
 * SessionStateService
 * Minimal persistence layer for session state backed by Supabase `game_sessions.session_state` JSONB.
 * Fails safe: returns defaults when the column/table isn't present yet.
 */
export class SessionStateService {
  /** Load state snapshot for a session. */
  static async getState(sessionId: string): Promise<SessionStatePayload> {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, session_state')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        // Column may not exist yet or row missing; return default
        return createDefaultSessionState(sessionId);
      }

      const payload: SessionStatePayload | null = (data as any).session_state || null;
      if (!payload) return createDefaultSessionState(sessionId);

      return payload;
    } catch {
      return createDefaultSessionState(sessionId);
    }
  }

  /** Merge-update the session state JSON and persist. */
  static async updateState(
    sessionId: string,
    partial: Partial<SessionStatePayload>,
  ): Promise<SessionStatePayload> {
    try {
      const current = await this.getState(sessionId);
      const next: SessionStatePayload = {
        ...current,
        ...partial,
        lastUpdate: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('game_sessions')
        .update({ session_state: next })
        .eq('id', sessionId);

      if (error) {
        // If update fails (e.g., column absent), just return the merged snapshot
        return next;
      }
      return next;
    } catch {
      const current = await this.getState(sessionId);
      return {
        ...current,
        ...partial,
        lastUpdate: new Date().toISOString(),
      } as SessionStatePayload;
    }
  }

  /** Append a combat log entry into the state JSON with retention cap. */
  static async appendCombatLog(
    sessionId: string,
    entry: any,
    maxEntries: number = 500,
  ): Promise<void> {
    const current = await this.getState(sessionId);
    const newEntry = { timestamp: new Date().toISOString(), entry };
    const existing = current.combatLog || [];
    const merged = [...existing, newEntry];
    const trimmed = merged.length > maxEntries ? merged.slice(merged.length - maxEntries) : merged;

    const updated: SessionStatePayload = {
      ...current,
      combatLog: trimmed,
      lastUpdate: new Date().toISOString(),
    };

    try {
      await supabase.from('game_sessions').update({ session_state: updated }).eq('id', sessionId);
    } catch {
      // safe failure
    }
  }

  /** Convenience: append a structured dice/roll event to the combat log. */
  static async appendRollEvent(
    sessionId: string,
    event: { kind: string; payload: any },
  ): Promise<void> {
    await this.appendCombatLog(sessionId, { kind: event.kind, payload: event.payload });
  }
}

export const sessionStateService = SessionStateService;
