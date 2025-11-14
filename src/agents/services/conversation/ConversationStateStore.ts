import { SessionStateService } from '@/services/session-state-service';
import type { ConversationSnapshot, SessionStatePayload } from '@/types/session-state';

import type { ConversationState } from './ConversationStateManager';

interface CacheEntry {
  state: ConversationState;
  expiresAt: number;
}

const DEFAULT_TTL = 30_000; // 30 seconds

export class ConversationStateStore {
  private cache = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl;
  }

  public async load(sessionId: string): Promise<ConversationState | null> {
    const cached = this.cache.get(sessionId);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.state,
        dialogueHistory: [...cached.state.dialogueHistory],
      };
    }

    const payload = await SessionStateService.getState(sessionId);
    const fromStore = payload.conversation ? this.transformSnapshot(payload.conversation) : null;
    if (fromStore) {
      this.cache.set(sessionId, {
        state: fromStore,
        expiresAt: Date.now() + this.ttl,
      });
    }
    return fromStore;
  }

  public async save(sessionId: string, state: ConversationState): Promise<void> {
    const snapshot: ConversationSnapshot = {
      currentNPC: state.currentNPC,
      dialogueHistory: [...state.dialogueHistory],
      playerChoices: [...state.playerChoices],
      lastResponse: state.lastResponse ?? null,
    };

    this.cache.set(sessionId, {
      state: {
        ...state,
        dialogueHistory: [...state.dialogueHistory],
      },
      expiresAt: Date.now() + this.ttl,
    });

    await SessionStateService.updateState(sessionId, {
      conversation: snapshot,
    } as Partial<SessionStatePayload>);
  }

  private transformSnapshot(snapshot: ConversationSnapshot): ConversationState {
    return {
      currentNPC: snapshot.currentNPC,
      dialogueHistory: [...snapshot.dialogueHistory],
      playerChoices: [...snapshot.playerChoices],
      lastResponse: snapshot.lastResponse ?? null,
    };
  }
}
