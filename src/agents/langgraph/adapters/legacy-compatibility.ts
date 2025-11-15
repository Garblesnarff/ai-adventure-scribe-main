/**
 * Legacy Compatibility Adapter
 *
 * Makes LangGraph DMService drop-in compatible with the existing AIService interface.
 * This adapter allows gradual migration without breaking existing code.
 *
 * Key responsibilities:
 * - Convert between LangGraph and AIService response formats
 * - Preserve all features expected by existing code
 * - Handle edge cases and fallbacks
 * - Provide monitoring hooks for migration tracking
 *
 * @module langgraph/adapters/legacy-compatibility
 */

import { getDMService, type WorldContext, type DMResponse } from '../dm-service';
import { detectCombatFromText, type CombatDetectionResult } from '@/utils/combatDetection';
import logger from '@/lib/logger';
import type { RollRequest } from '@/components/game/DiceRollRequest';
import migrationMonitoringService from '@/services/migration-monitoring';

/**
 * Game context in legacy AIService format
 */
export interface LegacyGameContext {
  campaignId: string;
  characterId: string;
  sessionId?: string;
  campaignDetails?: Record<string, unknown>;
  characterDetails?: Record<string, unknown>;
}

/**
 * Chat message in legacy format
 */
export interface LegacyChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  narrationSegments?: Array<{
    type: 'dm' | 'character' | 'transition';
    text: string;
    character?: string;
    voice_category?: string;
  }>;
}

/**
 * Narration segment for multi-voice support
 */
type NarrationSegment = {
  type: 'dm' | 'character' | 'transition';
  text: string;
  character?: string;
  voice_category?: string;
};

/**
 * Legacy AIService response format
 */
export interface LegacyAIResponse {
  text: string;
  narrationSegments?: NarrationSegment[];
  roll_requests?: RollRequest[];
  dice_rolls?: unknown[];
  combatDetection?: CombatDetectionResult;
}

/**
 * Parameters for legacy chatWithDM call
 */
export interface LegacyChatParams {
  message: string;
  context: LegacyGameContext;
  conversationHistory?: LegacyChatMessage[];
  onStream?: (chunk: string) => void;
  userPlan?: 'free' | 'pro' | 'enterprise';
  turnCount?: number;
}

/**
 * Legacy Compatibility Adapter
 *
 * Wraps LangGraph DMService to provide the same interface as AIService.chatWithDM
 */
export class LegacyCompatibilityAdapter {
  private dmService = getDMService();

  /**
   * Chat with DM using LangGraph (compatible with AIService.chatWithDM)
   *
   * This method provides the exact same interface as AIService.chatWithDM
   * but uses LangGraph under the hood.
   */
  async chatWithDM(params: LegacyChatParams): Promise<LegacyAIResponse> {
    const { message, context, conversationHistory, onStream } = params;

    // Start monitoring timing
    const stopTiming = migrationMonitoringService.startTiming(
      'langgraph',
      message.length,
      context.sessionId,
    );

    try {
      logger.info('[LangGraph] Processing message via compatibility adapter:', {
        sessionId: context.sessionId,
        messageLength: message.length,
      });

      // Detect combat from player message (preserve legacy behavior)
      const combatDetection = detectCombatFromText(message);

      if (combatDetection.isCombat) {
        logger.info('[LangGraph] Combat detected:', {
          type: combatDetection.combatType,
          confidence: combatDetection.confidence,
          shouldStart: combatDetection.shouldStartCombat,
          shouldEnd: combatDetection.shouldEndCombat,
        });
      }

      // Convert legacy context to LangGraph WorldContext
      const worldContext: WorldContext = {
        campaignId: context.campaignId,
        characterId: context.characterId,
        sessionId: context.sessionId || '',
        campaignDetails: context.campaignDetails,
        characterDetails: context.characterDetails,
        recentEvents: conversationHistory?.slice(-5).map((msg) => msg.content) || [],
      };

      // Call LangGraph DMService
      const dmResponse = await this.dmService.sendMessage({
        sessionId: context.sessionId || `temp-${Date.now()}`,
        message,
        context: worldContext,
        onStream,
      });

      // Convert DMResponse to legacy format
      const legacyResponse = this.convertToLegacyFormat(dmResponse, combatDetection);

      logger.info('[LangGraph] Response generated successfully:', {
        sessionId: context.sessionId,
        responseLength: legacyResponse.text.length,
        hasRollRequests: (legacyResponse.roll_requests?.length || 0) > 0,
        isCombat: combatDetection.isCombat,
      });

      // Record success
      stopTiming('success', legacyResponse.text.length);

      return legacyResponse;
    } catch (error) {
      logger.error('[LangGraph] Error in compatibility adapter:', error);

      // Record error
      stopTiming('error', 0, error instanceof Error ? error : undefined);

      throw new Error(
        `LangGraph adapter failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert LangGraph DMResponse to legacy AIService format
   */
  private convertToLegacyFormat(
    dmResponse: DMResponse,
    combatDetection: CombatDetectionResult,
  ): LegacyAIResponse {
    const response: LegacyAIResponse = {
      text: dmResponse.response,
      combatDetection: {
        isCombat: combatDetection.isCombat,
        confidence: combatDetection.confidence,
        combatType: combatDetection.combatType,
        shouldStartCombat: combatDetection.shouldStartCombat,
        shouldEndCombat: combatDetection.shouldEndCombat,
        enemies: combatDetection.enemies || [],
        combatActions: combatDetection.combatActions || [],
      },
    };

    // Convert roll requirement to legacy roll_requests format
    if (dmResponse.requiresDiceRoll) {
      response.roll_requests = this.extractRollRequests(dmResponse.response);
    }

    // Extract narration segments if the response contains dialogue
    response.narrationSegments = this.extractNarrationSegments(dmResponse.response);

    return response;
  }

  /**
   * Extract roll requests from response text
   *
   * Legacy system expects structured roll requests.
   * We parse the response to extract any dice roll mentions.
   */
  private extractRollRequests(responseText: string): RollRequest[] {
    const rollRequests: RollRequest[] = [];

    // Look for ROLL_REQUESTS_V1 code block (if LangGraph includes it)
    const rollBlockMatch = responseText.match(/```ROLL_REQUESTS_V1\n([\s\S]*?)\n```/);
    if (rollBlockMatch) {
      try {
        const rollData = JSON.parse(rollBlockMatch[1]);
        if (rollData.rolls && Array.isArray(rollData.rolls)) {
          return rollData.rolls;
        }
      } catch (e) {
        logger.warn('[LangGraph] Failed to parse ROLL_REQUESTS_V1 block:', e);
      }
    }

    // Fallback: parse common roll patterns from text
    const patterns = [
      {
        // "Make a Perception check (DC 15)"
        regex: /make a (\w+) (?:check|save|saving throw)(?: \(DC (\d+)\))?/gi,
        type: 'skill_check' as const,
      },
      {
        // "Roll initiative"
        regex: /roll initiative/gi,
        type: 'initiative' as const,
      },
      {
        // "Attack roll" or "Make an attack"
        regex: /(?:make an?|roll) attack(?: roll)?/gi,
        type: 'attack' as const,
      },
    ];

    for (const pattern of patterns) {
      const matches = [...responseText.matchAll(pattern.regex)];
      for (const match of matches) {
        const skill = match[1]?.toLowerCase();
        const dc = match[2] ? parseInt(match[2]) : undefined;

        rollRequests.push({
          type: pattern.type,
          formula: this.getFormulaForType(pattern.type, skill),
          purpose: this.getPurposeForType(pattern.type, skill),
          dc,
        });
      }
    }

    return rollRequests;
  }

  /**
   * Get dice formula for a roll type
   */
  private getFormulaForType(type: string, skill?: string): string {
    switch (type) {
      case 'initiative':
        return '1d20+dex';
      case 'attack':
        return '1d20+attack_bonus';
      case 'skill_check':
        return `1d20+${this.getAbilityForSkill(skill || '')}`;
      default:
        return '1d20';
    }
  }

  /**
   * Get ability modifier for a skill
   */
  private getAbilityForSkill(skill: string): string {
    const skillMap: Record<string, string> = {
      perception: 'wis',
      insight: 'wis',
      survival: 'wis',
      investigation: 'int',
      arcana: 'int',
      history: 'int',
      stealth: 'dex',
      acrobatics: 'dex',
      athletics: 'str',
      persuasion: 'cha',
      deception: 'cha',
      intimidation: 'cha',
    };
    return skillMap[skill.toLowerCase()] || 'modifier';
  }

  /**
   * Get purpose text for a roll type
   */
  private getPurposeForType(type: string, skill?: string): string {
    switch (type) {
      case 'initiative':
        return 'Roll initiative to determine turn order';
      case 'attack':
        return 'Attack roll to hit your target';
      case 'skill_check':
        return `${skill || 'Ability'} check`;
      default:
        return 'Dice roll';
    }
  }

  /**
   * Extract narration segments for multi-voice support
   *
   * Parses the response to identify DM narration vs character dialogue
   */
  private extractNarrationSegments(responseText: string): NarrationSegment[] {
    const segments: NarrationSegment[] = [];

    // Split by dialogue quotes to separate narration from speech
    const parts = responseText.split(/(".*?")/);

    let currentNarration = '';

    for (const part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        // This is dialogue - flush any pending narration first
        if (currentNarration.trim()) {
          segments.push({
            type: 'dm',
            text: currentNarration.trim(),
          });
          currentNarration = '';
        }

        // Extract character name if present (e.g., "The guard says, 'Stop!'")
        const dialogue = part.slice(1, -1); // Remove quotes
        const contextBefore = parts[parts.indexOf(part) - 1] || '';
        const characterMatch = contextBefore.match(
          /(\w+)\s+(?:says?|shouts?|whispers?|asks?|replies?)[,:]/i,
        );

        segments.push({
          type: 'character',
          text: dialogue,
          character: characterMatch?.[1] || 'NPC',
          voice_category: this.guessVoiceCategory(characterMatch?.[1] || 'NPC'),
        });
      } else if (part.trim()) {
        // This is narration
        currentNarration += part;
      }
    }

    // Flush any remaining narration
    if (currentNarration.trim()) {
      segments.push({
        type: 'dm',
        text: currentNarration.trim(),
      });
    }

    // If no segments were extracted, treat entire response as DM narration
    if (segments.length === 0) {
      segments.push({
        type: 'dm',
        text: responseText,
      });
    }

    return segments;
  }

  /**
   * Guess voice category from character name
   */
  private guessVoiceCategory(characterName: string): string {
    const name = characterName.toLowerCase();

    // Common archetypes
    if (name.includes('guard') || name.includes('soldier')) return 'guard';
    if (name.includes('merchant') || name.includes('shop')) return 'merchant';
    if (name.includes('elder') || name.includes('old')) return 'elder';
    if (name.includes('child') || name.includes('kid')) return 'child';
    if (name.includes('goblin')) return 'goblin';
    if (name.includes('orc') || name.includes('troll')) return 'monster';
    if (name.includes('priest') || name.includes('cleric')) return 'elder';
    if (name.includes('innkeeper') || name.includes('barkeep')) return 'innkeeper';

    // Gender hints (fallback)
    if (name.includes('lady') || name.includes('woman')) return 'hero_female';
    if (name.includes('lord') || name.includes('man')) return 'hero_male';

    // Default
    return 'hero_male';
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      adapter: 'legacy-compatibility',
      dmServiceStatus: this.dmService.getStatus(),
      compatible: true,
    };
  }
}

/**
 * Singleton instance for easy access
 */
let adapterInstance: LegacyCompatibilityAdapter | null = null;

export function getLegacyCompatibilityAdapter(): LegacyCompatibilityAdapter {
  if (!adapterInstance) {
    adapterInstance = new LegacyCompatibilityAdapter();
  }
  return adapterInstance;
}
