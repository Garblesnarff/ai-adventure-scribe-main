/**
 * Character Interaction Generator
 * 
 * This file defines the CharacterInteractionGenerator class, responsible for
 * generating NPC interactions, dialogue, and reactions based on the game's
 * world, player character, and current conversation state. It utilizes
 * sub-services for dialogue generation, reaction generation, and NPC data fetching.
 * 
 * Main Class:
 * - CharacterInteractionGenerator: Generates character interactions.
 * 
 * Key Dependencies:
 * - DialogueGenerator (./dialogue/dialogue-generator.ts)
 * - ReactionGenerator (./reactions/reaction-generator.ts)
 * - NPCDataService (./npc/npc-data-service.ts)
 * - Character type (`@/types/character`)
 * 
 * @author AI Dungeon Master Team
 */

// Project Services (assuming kebab-case filenames)
import { DialogueGenerator } from './dialogue/dialogue-generator';
import { NPCDataService } from './npc/npc-data-service';
import { ReactionGenerator } from './reactions/reaction-generator';

// Project Types
import { Character } from '@/types/character';


// Interface for ConversationState, should ideally be imported from a shared types file if used elsewhere
interface ConversationState {
  currentNPC: string | null;
  dialogueHistory: Array<{ speaker: string; text: string }>;
  playerChoices: string[]; // Though not used in current methods, part of the defined state
  lastResponse: string | null; // Though not used in current methods, part of the defined state
}

export class CharacterInteractionGenerator {
  private dialogueGenerator: DialogueGenerator;
  private reactionGenerator: ReactionGenerator;
  private npcDataService: NPCDataService;

  constructor() {
    this.dialogueGenerator = new DialogueGenerator();
    this.reactionGenerator = new ReactionGenerator();
    this.npcDataService = new NPCDataService();
  }

  async generateInteractions(
    worldId: string, 
    character: Character,
    conversationState?: ConversationState // Made optional to align with one of its internal calls
  ) {
    // If we're in an active conversation, generate contextual dialogue
    if (conversationState?.currentNPC) {
      return this.generateActiveConversation(worldId, character, conversationState);
    }

    // Otherwise, generate initial NPC reactions
    return this.generateInitialInteractions(worldId, character);
  }

  private async generateActiveConversation(
    worldId: string,
    character: Character,
    // Ensure ConversationState is consistently used or props are passed directly
    conversationState: ConversationState 
  ) {
    const npcData = await this.npcDataService.fetchNPCData(worldId, conversationState.currentNPC!); // Added non-null assertion
    // Ensure dialogueHistory is correctly accessed if it's part of conversationState
    const lastPlayerMessage = conversationState.dialogueHistory && conversationState.dialogueHistory.length > 0 
      ? conversationState.dialogueHistory[conversationState.dialogueHistory.length - 1] 
      : { text: '' }; // Provide a default if history is empty
    
    const dialogue = this.dialogueGenerator.generateContextualDialogue(
      lastPlayerMessage?.text || '',
      npcData?.personality || 'neutral',
      character,
      conversationState.dialogueHistory || [] // Ensure history is passed
    );

    return {
      activeNPCs: [conversationState.currentNPC!], // Added non-null assertion
      reactions: this.reactionGenerator.generateNPCReactions(character, npcData?.personality),
      dialogue
    };
  }

  private async generateInitialInteractions(worldId: string, character: Character) {
    const npcs = await this.npcDataService.fetchAvailableNPCs(worldId);
    const reactions = this.reactionGenerator.generateNPCReactions(character);
    // Consider if initial dialogue should involve a specific NPC or be more general
    const initialDialogueContextNPC = npcs && npcs.length > 0 ? npcs[0] : undefined;
    const dialogue = this.dialogueGenerator.generateInitialDialogue(character, initialDialogueContextNPC);

    return {
      activeNPCs: npcs?.map(npc => npc.name) || [],
      reactions,
      dialogue
    };
  }
}
