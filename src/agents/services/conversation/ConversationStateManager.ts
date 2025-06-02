/**
 * Conversation State Manager
 * 
 * This file defines the ConversationStateManager class, responsible for managing
 * the state of a conversation within the game. This includes tracking the
 * current NPC involved in a dialogue, the history of the conversation, available
 * player choices, and the last response from the AI/NPC.
 * 
 * Main Class:
 * - ConversationStateManager: Manages and provides access to conversation state.
 * 
 * Key Dependencies:
 * - DialogueHistory type (from `@/types/dialogue`).
 * 
 * @author AI Dungeon Master Team
 */

// Project Types
import { DialogueHistory } from '@/types/dialogue';


export interface ConversationState {
  currentNPC: string | null;
  dialogueHistory: DialogueHistory[];
  playerChoices: string[];
  lastResponse: string | null;
}

export class ConversationStateManager {
  private state: ConversationState;

  constructor() {
    this.state = {
      currentNPC: null,
      dialogueHistory: [],
      playerChoices: [],
      lastResponse: null
    };
  }

  public updateState(playerMessage: string, response: any): void {
    // Update dialogue history
    this.state.dialogueHistory.push({ 
      speaker: 'player', 
      text: playerMessage 
    });

    if (response.characters?.dialogue) {
      this.state.dialogueHistory.push({
        speaker: response.characters.activeNPCs[0] || 'NPC',
        text: response.characters.dialogue
      });
    }

    // Update current NPC if in dialogue
    if (response.characters?.activeNPCs?.length > 0) {
      this.state.currentNPC = response.characters.activeNPCs[0];
    }

    // Store available choices for the player
    this.state.playerChoices = response.opportunities?.immediate || [];
    this.state.lastResponse = response;
  }

  public getState(): ConversationState {
    return { ...this.state };
  }

  public getCurrentNPC(): string | null {
    return this.state.currentNPC;
  }

  public getDialogueHistory(): DialogueHistory[] {
    return [...this.state.dialogueHistory];
  }
}