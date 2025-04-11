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