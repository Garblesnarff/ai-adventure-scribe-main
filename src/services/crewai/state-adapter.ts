import { PromptComposer } from './prompt-composer';

import type { ChatMessage, GameContext } from '@/services/ai-service';
import type { SessionStatePayload } from '@/types/session-state';

/**
 * StateAdapter
 * Centralizes translation of app/game state and history into the
 * minimal, AI-ready payloads used by the CrewAI microservice.
 */
export class StateAdapter {
  /** Build a concise state section string from session state (null-safe). */
  static buildStateSection(state: SessionStatePayload | null | undefined): string {
    try {
      return PromptComposer.buildStateSection(state ?? null) || '';
    } catch {
      return '';
    }
  }

  /**
   * Normalize conversation history to the shape expected by the microservice
   * and cap to the most recent N turns (default 10).
   */
  static normalizeHistory(
    history: ChatMessage[] = [],
    cap: number = 10,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const trimmed = history.slice(-cap);
    return trimmed.map((m) => ({ role: m.role, content: m.content ?? '' }));
  }

  /**
   * Build payload for POST /dm/respond
   */
  static buildRespondPayload(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
    sessionState?: SessionStatePayload | null;
  }): Record<string, any> {
    const { message, context, conversationHistory = [], sessionState } = params;
    const state_section = this.buildStateSection(sessionState ?? null);
    const history = this.normalizeHistory(conversationHistory, 10);

    return {
      context: {
        campaignId: context.campaignId,
        characterId: context.characterId,
        sessionId: context.sessionId,
      },
      message,
      state_section,
      history,
    };
  }

  /**
   * Build payload for POST /dm/options (kept here for future reuse by callers)
   */
  static buildOptionsPayload(params: {
    sessionId: string;
    lastDmText?: string;
    playerMessage?: string;
    state: SessionStatePayload | null | undefined;
    history?: ChatMessage[];
    lastRoll?: any;
    campaignId?: string;
    characterId?: string;
  }): Record<string, any> {
    const state_section = this.buildStateSection(params.state ?? null);
    const history = this.normalizeHistory(params.history || [], 8);

    return {
      session_id: params.sessionId,
      last_dm_text: params.lastDmText ?? '',
      player_message: params.playerMessage ?? '',
      state_section,
      history,
      last_roll: params.lastRoll ?? null,
      context: {
        campaignId: params.campaignId ?? '',
        characterId: params.characterId ?? '',
        sessionId: params.sessionId,
      },
    };
  }
}

export const stateAdapter = StateAdapter;
