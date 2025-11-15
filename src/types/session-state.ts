// Session state types for gameplay and orchestration

import type { DialogueHistory } from '@/types/dialogue';

export interface CombatantState {
  id: string;
  name: string;
  hp: number;
  ac: number;
  conditions: string[];
  initiative?: number;
}

export interface QuestState {
  id: string;
  summary: string;
  status: 'active' | 'completed' | 'failed';
}

export interface SessionCombatState {
  round: number;
  order: CombatantState[];
  active: boolean;
}

export interface SessionStatePayload {
  sessionId: string;
  scene: string;
  combat?: SessionCombatState;
  quests: QuestState[];
  lastUpdate: string; // ISO string
  // Optional free-form logs to aid debugging/analysis
  combatLog?: Array<{ timestamp: string; entry: string }>;
  conversation?: ConversationSnapshot;
}

export interface ConversationSnapshot {
  currentNPC: string | null;
  dialogueHistory: DialogueHistory[];
  playerChoices: string[];
  lastResponse: any | null;
}

export const createDefaultSessionState = (sessionId: string): SessionStatePayload => ({
  sessionId,
  scene: 'The adventure begins...',
  combat: { round: 0, order: [], active: false },
  quests: [],
  lastUpdate: new Date().toISOString(),
  combatLog: [],
  conversation: {
    currentNPC: null,
    dialogueHistory: [],
    playerChoices: [],
    lastResponse: null,
  },
});
