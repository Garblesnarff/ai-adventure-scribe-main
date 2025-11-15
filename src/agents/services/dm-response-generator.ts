/**
 * Dungeon Master Response Generator
 *
 * Generates AI Dungeon Master responses based on campaign context, player input, and game state.
 * Loads campaign data, recent memories, character details, and generates environment, character interactions, opportunities, and mechanics.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - DMResponse and CampaignContext types (src/types/dm.ts)
 * - Memory type (src/components/game/memory/types.ts)
 * - CampaignContextLoader (src/agents/services/campaign/CampaignContextLoader.ts)
 * - MemoryManager (src/agents/services/memory/MemoryManager.ts)
 * - EnvironmentGenerator (src/agents/services/response/EnvironmentGenerator.ts)
 * - CharacterInteractionGenerator (src/agents/services/response/CharacterInteractionGenerator.ts)
 * - OpportunityGenerator (src/agents/services/response/OpportunityGenerator.ts)
 * - MechanicsGenerator (src/agents/services/response/MechanicsGenerator.ts)
 * - Character types (src/types/character.ts)
 *
 * @author AI Dungeon Master Team
 */

// ============================
// External Integrations
// ============================
import { supabase } from '@/integrations/supabase/client';

// ============================
// Project Services & Generators (assuming kebab-case filenames)
// ============================
import { CampaignContextLoader } from './campaign/campaign-context-loader';
import { CharacterInteractionGenerator } from './response/CharacterInteractionGenerator';
import { EnvironmentGenerator } from './response/environment-generator';
import { MechanicsGenerator } from './response/mechanics-generator';
import { MemoryManager } from './memory/MemoryManager';
import { OpportunityGenerator } from './response/opportunity-generator';

// ============================
// Project Types
// ============================
import { Memory } from '@/components/game/memory/types';
import { Character, CharacterBackground, CharacterClass, CharacterRace } from '@/types/character';
import { CampaignContext, DMResponse } from '@/types/dm';

interface ConversationState {
  currentNPC: string | null;
  dialogueHistory: Array<{ speaker: string; text: string }>;
  playerChoices: string[];
  lastResponse: string | null;
}

interface ResponseContext {
  playerIntent: 'dialogue' | 'exploration' | 'other';
  conversationState: ConversationState;
  campaignContext: any;
}

export class DMResponseGenerator {
  private campaignId: string;
  private sessionId: string;
  private context?: CampaignContext;
  private recentMemories: Memory[] = [];
  private character?: Character;

  private campaignLoader: CampaignContextLoader;
  private memoryManager: MemoryManager;
  private environmentGenerator: EnvironmentGenerator;
  private characterGenerator: CharacterInteractionGenerator;
  private opportunityGenerator: OpportunityGenerator;
  private mechanicsGenerator: MechanicsGenerator;

  /**
   * Creates a new DMResponseGenerator instance.
   *
   * @param {string} campaignId - The campaign ID
   * @param {string} sessionId - The session ID
   */
  constructor(campaignId: string, sessionId: string) {
    this.campaignId = campaignId;
    this.sessionId = sessionId;

    this.campaignLoader = new CampaignContextLoader();
    this.memoryManager = new MemoryManager();
    this.environmentGenerator = new EnvironmentGenerator();
    this.characterGenerator = new CharacterInteractionGenerator();
    this.opportunityGenerator = new OpportunityGenerator();
    this.mechanicsGenerator = new MechanicsGenerator();
  }

  /**
   * Loads campaign context, recent memories, and character details in parallel.
   *
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadCampaignContext(),
      this.loadRecentMemories(),
      this.loadCharacterDetails(),
    ]);
  }

  /**
   * Loads campaign context from the database.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async loadCampaignContext(): Promise<void> {
    this.context = await this.campaignLoader.loadCampaignContext(this.campaignId);
  }

  /**
   * Loads recent memories for the session.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async loadRecentMemories(): Promise<void> {
    this.recentMemories = await this.memoryManager.loadRecentMemories(this.sessionId);
  }

  /**
   * Loads character details for the session.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async loadCharacterDetails(): Promise<void> {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('character_id')
      .eq('id', this.sessionId)
      .single();

    if (session?.character_id) {
      const { data: characterData } = await supabase
        .from('characters')
        .select(
          `
          *,
          character_stats (*),
          character_equipment (*)
        `,
        )
        .eq('id', session.character_id)
        .single();

      if (characterData) {
        this.character = {
          id: characterData.id,
          user_id: characterData.user_id,
          name: characterData.name,
          race: characterData.race as unknown as CharacterRace,
          class: characterData.class as unknown as CharacterClass,
          level: characterData.level,
          background: characterData.background
            ? (characterData.background as unknown as CharacterBackground)
            : null,
          description: characterData.description,
          abilityScores: characterData.character_stats?.[0]
            ? {
                strength: {
                  score: characterData.character_stats[0].strength,
                  modifier: Math.floor((characterData.character_stats[0].strength - 10) / 2),
                  savingThrow: false,
                },
                dexterity: {
                  score: characterData.character_stats[0].dexterity,
                  modifier: Math.floor((characterData.character_stats[0].dexterity - 10) / 2),
                  savingThrow: false,
                },
                constitution: {
                  score: characterData.character_stats[0].constitution,
                  modifier: Math.floor((characterData.character_stats[0].constitution - 10) / 2),
                  savingThrow: false,
                },
                intelligence: {
                  score: characterData.character_stats[0].intelligence,
                  modifier: Math.floor((characterData.character_stats[0].intelligence - 10) / 2),
                  savingThrow: false,
                },
                wisdom: {
                  score: characterData.character_stats[0].wisdom,
                  modifier: Math.floor((characterData.character_stats[0].wisdom - 10) / 2),
                  savingThrow: false,
                },
                charisma: {
                  score: characterData.character_stats[0].charisma,
                  modifier: Math.floor((characterData.character_stats[0].charisma - 10) / 2),
                  savingThrow: false,
                },
              }
            : undefined,
          experience: characterData.experience_points || 0,
          alignment: characterData.alignment || '',
          personalityTraits: [],
          ideals: [],
          bonds: [],
          flaws: [],
          equipment: characterData.character_equipment?.map((item) => item.item_name) || [],
        };
      }
    }
  }

  /**
   * Retrieves the world ID associated with the campaign.
   *
   * @private
   * @returns {Promise<string>} The world ID
   */
  private async getWorldId(): Promise<string> {
    const { data } = await supabase
      .from('worlds')
      .select('id')
      .eq('campaign_id', this.campaignId)
      .single();

    return data?.id;
  }

  /**
   * Generates a Dungeon Master response based on player input and context.
   *
   * @param {string} playerMessage - The player's message or action
   * @param {ResponseContext} responseContext - Context including player intent and conversation state
   * @returns {Promise<DMResponse>} The generated DM response
   * @throws {Error} If context or character details fail to load
   */
  async generateResponse(
    playerMessage: string,
    responseContext: ResponseContext,
  ): Promise<DMResponse> {
    if (!this.context || !this.character) {
      await this.initialize();
    }

    if (!this.context || !this.character) {
      throw new Error('Failed to initialize context or character details');
    }

    const worldId = await this.getWorldId();
    const { playerIntent, conversationState } = responseContext;

    // Generate appropriate response based on player intent
    let environment, characters, opportunities, mechanics;

    if (playerIntent === 'dialogue' && conversationState.currentNPC) {
      // Generate focused NPC interaction
      characters = await this.characterGenerator.generateInteractions(
        worldId,
        this.character,
        conversationState,
      );

      // Minimal environment description for dialogue
      environment = {
        description: 'The conversation continues...',
        atmosphere: this.context.setting?.atmosphere || 'neutral',
        sensoryDetails: [],
      };

      // Generate dialogue-specific opportunities
      opportunities = {
        immediate: [
          'Continue the conversation',
          'Change the subject',
          'End the conversation',
          'Ask about local rumors',
        ],
        nearby: [],
        questHooks: [],
      };
    } else {
      // Generate full scene description
      [environment, characters, opportunities, mechanics] = await Promise.all([
        this.environmentGenerator.generateEnvironment(this.context, this.character),
        this.characterGenerator.generateInteractions(worldId, this.character),
        this.opportunityGenerator.generateOpportunities(this.campaignId, this.context),
        this.mechanicsGenerator.generateMechanics(this.context),
      ]);
    }

    return {
      environment,
      characters,
      mechanics,
      opportunities,
    };
  }
}
