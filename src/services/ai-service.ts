import { supabase } from '@/integrations/supabase/client';
import { GEMINI_TEXT_MODEL } from '@/config/ai';
import { getGeminiApiManager } from './gemini-api-manager-singleton';
import type { GeminiApiManager } from './gemini-api-manager';
import { MemoryManager, MemoryContext } from './memory-manager';
import type { Memory } from './memory-manager';
import { WorldBuilderService } from './world-builders/world-builder-service';
import { voiceConsistencyService } from './voice-consistency-service';
import type { SessionVoiceContext } from './voice-consistency-service';
import { detectCombatFromText, type CombatDetectionResult, type DetectedEnemy, type DetectedCombatAction } from '@/utils/combatDetection';
import logger from '@/lib/logger';
import { SessionStateService } from './session-state-service';
import { AgentOrchestrator } from './crewai/agent-orchestrator';
import type { RollRequest } from '@/components/game/DiceRollRequest';

// In-flight request deduplication with 2s TTL
const inFlight = new Map<string, { ts: number; promise: Promise<any> }>();
const DEDUPE_MS = 2000;

const PAYMENT_REQUIRED_PATTERN = /402|payment required/i;

type FallbackRollRequest = RollRequest & {
  skill?: string;
  ability?: string;
};

const ROLL_KEYWORDS: Array<{
  keywords: string[];
  build: () => FallbackRollRequest;
}> = [
  {
    keywords: ['attack', 'strike', 'swing', 'slash', 'stab', 'shoot', 'fire', 'charge', 'snipe'],
    build: () => ({
      type: 'attack',
      formula: '1d20+attack_bonus',
      purpose: 'Attack roll to resolve your strike',
      ac: 13
    })
  },
  {
    keywords: ['stealth', 'sneak', 'hide', 'creep', 'quiet'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+dexterity_mod',
      purpose: 'Stealth check to stay hidden',
      dc: 14,
      skill: 'stealth',
      ability: 'dexterity'
    })
  },
  {
    keywords: ['persuade', 'convince', 'charm', 'negotiate', 'diplomacy', 'talk'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+charisma_mod',
      purpose: 'Persuasion check to influence the NPC',
      dc: 15,
      skill: 'persuasion',
      ability: 'charisma'
    })
  },
  {
    keywords: ['intimidate', 'threaten', 'menace', 'coerce'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+charisma_mod',
      purpose: 'Intimidation check to cow your target',
      dc: 15,
      skill: 'intimidation',
      ability: 'charisma'
    })
  },
  {
    keywords: ['investigate', 'inspect', 'search', 'study', 'analyze'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+intelligence_mod',
      purpose: 'Investigation check to uncover details',
      dc: 14,
      skill: 'investigation',
      ability: 'intelligence'
    })
  },
  {
    keywords: ['acrobatic', 'flip', 'tumble', 'dodge', 'leap'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+dexterity_mod',
      purpose: 'Acrobatics check to keep your footing',
      dc: 13,
      skill: 'acrobatics',
      ability: 'dexterity'
    })
  },
  {
    keywords: ['climb', 'heave', 'lift', 'push', 'force', 'shove', 'grapple'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+strength_mod',
      purpose: 'Athletics check to power through the challenge',
      dc: 15,
      skill: 'athletics',
      ability: 'strength'
    })
  },
  {
    keywords: ['perceive', 'spot', 'notice', 'scan', 'watch', 'listen', 'hear'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+wisdom_mod',
      purpose: 'Perception check to notice hidden details',
      dc: 13,
      skill: 'perception',
      ability: 'wisdom'
    })
  },
  {
    keywords: ['insight', 'sense motive', 'judge', 'read'],
    build: () => ({
      type: 'skill_check',
      formula: '1d20+wisdom_mod',
      purpose: 'Insight check to read intentions',
      dc: 13,
      skill: 'insight',
      ability: 'wisdom'
    })
  }
];

function isPaymentRequiredError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if (status === 402) {
    return true;
  }

  const message = (error as any)?.message ?? (error as any)?.response?.data?.error ?? '';
  return typeof message === 'string' && PAYMENT_REQUIRED_PATTERN.test(message);
}

function determineFallbackRoll(playerText: string, combatDetection: CombatDetectionResult): FallbackRollRequest | null {
  if (!playerText) {
    return combatDetection.isCombat
      ? {
          type: 'attack',
          formula: '1d20+attack_bonus',
          purpose: 'Attack roll as combat breaks out',
          ac: 13
        }
      : null;
  }

  const lower = playerText.toLowerCase();
  for (const mapping of ROLL_KEYWORDS) {
    if (mapping.keywords.some(keyword => lower.includes(keyword))) {
      return mapping.build();
    }
  }

  if (combatDetection.isCombat) {
    return {
      type: 'attack',
      formula: '1d20+attack_bonus',
      purpose: 'Attack roll to press the fight',
      ac: 13
    };
  }

  return null;
}

function formatRollInstruction(roll: FallbackRollRequest): string {
  const base = `Please roll ${roll.formula} for ${roll.purpose}`;
  const target = roll.dc ? ` (DC ${roll.dc})` : roll.ac ? ` (AC ${roll.ac})` : '';
  const adv = roll.advantage ? ' with advantage' : roll.disadvantage ? ' with disadvantage' : '';
  return `${base}${target}${adv}.`;
}

function serializeRollForBlock(roll: FallbackRollRequest) {
  const payload: Record<string, unknown> = {
    type: roll.type,
    formula: roll.formula,
    purpose: roll.purpose
  };

  if (roll.dc !== undefined) payload.dc = roll.dc;
  if (roll.ac !== undefined) payload.ac = roll.ac;
  if (roll.advantage !== undefined) payload.advantage = roll.advantage;
  if (roll.disadvantage !== undefined) payload.disadvantage = roll.disadvantage;
  if (roll.skill) payload.skill = roll.skill;
  if (roll.ability) payload.ability = roll.ability;

  return payload;
}

function buildPaymentRequiredFallback(playerText: string, combatDetection: CombatDetectionResult) {
  const roll = determineFallbackRoll(playerText, combatDetection);
  const narration = `The Dungeon Master pauses for a heartbeat, collecting their thoughts before continuing the scene.`;
  const tension = combatDetection.isCombat
    ? `Steel clashes in your imagination as the unresolved action hangs in the air.`
    : `The world around you seems to hold its breath, waiting for your next move.`;
  const rollLine = roll ? formatRollInstruction(roll) : `No roll is required yet—choose your approach.`;

  const options = [
    'A. **Stay the course**, following through exactly as you intended.',
    'B. **Adjust your tactics**, taking a more cautious, observant approach.',
    'C. **Try something unexpected**, improvising a bold alternative.'
  ];

  const rollsBlock = `\n\n\`\`\`ROLL_REQUESTS_V1\n${JSON.stringify({ rolls: roll ? [serializeRollForBlock(roll)] : [] }, null, 2)}\n\`\`\`\n`;

  const normalizedRoll: RollRequest | null = roll
    ? {
        type: roll.type,
        formula: roll.formula,
        purpose: roll.purpose,
        dc: roll.dc,
        ac: roll.ac,
        advantage: roll.advantage,
        disadvantage: roll.disadvantage
      }
    : null;

  return {
    text: `${narration}\n\n${tension}\n${rollLine}\n\n${options.join('\n')}${rollsBlock}`,
    roll_requests: normalizedRoll ? [normalizedRoll] : []
  };
}

function keyFor(sessionId: string | undefined, message: string, historyLen: number) {
  return `${sessionId || 'nosession'}|${message.slice(0, 256)}|${historyLen}`;
}

export interface ChatMessage {
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

type NarrationSegment = {
  type: 'dm' | 'character' | 'transition';
  text: string;
  character?: string;
  voice_category?: string;
};

export interface GameContext {
  campaignId: string;
  characterId: string;
  sessionId?: string;
  campaignDetails?: Record<string, unknown>;
  characterDetails?: Record<string, unknown>;
}

export class AIService {
  /**
   * Get the shared Gemini API manager instance
   */
  private static getGeminiManager(): GeminiApiManager {
    return getGeminiApiManager();
  }
  
  /** Feature flag to enable CrewAI orchestrator integration. */
  private static useCrewAI(): boolean {
    try {
      const raw = String((import.meta as any).env?.VITE_USE_CREWAI_DM ?? '').toLowerCase().trim();
      return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
    } catch {
      return false;
    }
  }
  /**
   * Generate a campaign description using AI with fallback
   */
  static async generateCampaignDescription(params: {
    genre: string;
    difficulty: string;
    length: string;
    tone: string;
  }): Promise<string> {
    // Skip Edge Function - use local Gemini API directly
    logger.info('Using local Gemini API for campaign description...');
    
    try {
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
        
        const prompt = `Create an engaging D&D 5e campaign description that hooks players immediately and sets up an epic adventure.

**Campaign Parameters:**
- Genre: ${params.genre}
- Difficulty: ${params.difficulty}
- Expected Length: ${params.length}
- Tone: ${params.tone}

**Requirements:**
1. **Hook**: Start with a compelling central mystery, threat, or opportunity that demands heroes
2. **Stakes**: Make it clear what happens if the heroes don't act (people die, world ends, etc.)
3. **Unique Elements**: Include distinctive locations, NPCs, or plot devices that make this campaign memorable
4. **Player Agency**: Hint at meaningful choices and multiple approaches to challenges
5. **World Integration**: Suggest how character backgrounds might connect to the plot
6. **Adventure Potential**: Indicate specific types of encounters (exploration, political intrigue, combat, puzzles)

**Tone Guidelines:**
- ${params.tone === 'dark' ? 'Emphasize moral dilemmas, harsh consequences, and atmospheric dread. Heroes face difficult choices with no clear "right" answer.' : ''}
- ${params.tone === 'heroic' ? 'Focus on noble quests, clear good vs evil, and inspiring moments. Heroes are destined for greatness and legendary deeds.' : ''}
- ${params.tone === 'comedic' ? 'Include absurd situations, witty NPCs, and opportunities for humor. Serious threats exist but approached with levity.' : ''}
- ${params.tone === 'mysterious' ? 'Layer in secrets, hidden agendas, and puzzles to solve. Nothing is quite what it seems on the surface.' : ''}
- ${params.tone === 'gritty' ? 'Realistic consequences, resource management, and survival elements. Combat is dangerous and magic is rare.' : ''}

**Structure:**
- **Paragraph 1**: The central hook and immediate threat/opportunity
- **Paragraph 2**: The unique world elements, key NPCs, and what makes this adventure special
- **Paragraph 3**: What players can expect - types of challenges, character integration, and why this matters

Create a campaign description that makes players say "I want to play in this world right now!"`;  
        
        const response = await model.generateContent(prompt);
        const result = await response.response;
        return result.text();
      });
      
      logger.info('Successfully generated campaign description using local Gemini API');
      return result;
      
    } catch (geminiError) {
      logger.error('Local Gemini API failed:', geminiError);
      throw new Error('Failed to generate campaign description - AI service unavailable');
    }
  }

  /**
   * Format combat detection context for the prompt
   */
  private static formatCombatContext(combatDetection: CombatDetectionResult): string {
    if (!combatDetection.isCombat) return '';

    let combatText = `\n\nCOMBAT CONTEXT DETECTED:
Combat Type: ${combatDetection.combatType}
Confidence: ${Math.round(combatDetection.confidence * 100)}%
Should Start Combat: ${combatDetection.shouldStartCombat ? 'YES' : 'NO'}
Should End Combat: ${combatDetection.shouldEndCombat ? 'YES' : 'NO'}`;

    // Add detected enemies
    if (combatDetection.enemies && combatDetection.enemies.length > 0) {
      combatText += `\n\nDETECTED ENEMIES:`;
      combatDetection.enemies.forEach((enemy: DetectedEnemy) => {
        combatText += `\n- ${enemy.name} (${enemy.type}, CR ${enemy.estimatedCR})
  HP: ${enemy.suggestedHP}, AC: ${enemy.suggestedAC}
  Description: ${enemy.description}`;
      });
    }

    // Add detected combat actions
    if (combatDetection.combatActions && combatDetection.combatActions.length > 0) {
      combatText += `\n\nDETECTED COMBAT ACTIONS:`;
      combatDetection.combatActions.forEach((action: DetectedCombatAction) => {
        combatText += `\n- ${action.actor} performs ${action.action}${action.target ? ` against ${action.target}` : ''}${action.weapon ? ` with ${action.weapon}` : ''}
  Roll Type: ${action.rollType}, Needs Roll: ${action.rollNeeded ? 'YES' : 'NO'}`;
      });
    }

    combatText += `\n\n**COMBAT RESPONSE REQUIREMENTS:**
When combat is detected, you MUST:
1. Generate appropriate dice rolls for actions (attack rolls, damage rolls, saving throws)
2. Apply combat results immediately (reduce HP, apply conditions, etc.)
3. Describe combat actions cinematically but maintain mechanical accuracy
4. Show dice results: "The orc swings (rolls 16, hits AC 13) for 8 slashing damage"
5. Make tactical decisions for NPCs based on their intelligence and experience
6. Consider environmental factors and positioning
7. Narrate the consequences of each action dramatically`;

    return combatText;
  }

  /**
   * Simplified chat with AI DM for MVP with fallback and streaming support
   * Uses a single AI call instead of complex agent system
   * Now includes voice segmentation for multi-voice narration
   */
  static async chatWithDM(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
    onStream?: (chunk: string) => void;
  }): Promise<{ text: string; narrationSegments?: NarrationSegment[]; roll_requests?: import('@/components/game/DiceRollRequest').RollRequest[]; dice_rolls?: unknown[]; combatDetection?: CombatDetectionResult }> {
    // Decision about path (CrewAI vs Gemini) happens below

    // Dedupe in-flight chat calls (2s TTL)
    const key = keyFor(params.context?.sessionId, params.message, (params.conversationHistory || []).length);
    const now = Date.now();
    for (const [k, v] of inFlight) if (now - v.ts > DEDUPE_MS) inFlight.delete(k);
    if (inFlight.has(key)) {
      logger.debug('[AIService] Deduping in-flight chat call:', key);
      return inFlight.get(key)!.promise;
    }

    const p = (async () => {
    
    try {
      // Retrieve relevant memories to enhance context
      let relevantMemories: Memory[] = [];
      if (params.context.sessionId) {
        try {
          relevantMemories = await MemoryManager.getRelevantMemories(
            params.context.sessionId,
            params.message,
            8 // Get top 8 relevant memories
          );
          logger.info(`📚 Retrieved ${relevantMemories.length} relevant memories`);
        } catch (memoryError) {
          logger.warn('Failed to retrieve memories:', memoryError);
        }
      }

      // Get voice context for multi-voice narration
      // TEMPORARILY DISABLED for option button testing
      const voiceContext: SessionVoiceContext | null = null;
      // if (params.context.sessionId) {
      //   try {
      //     voiceContext = await voiceConsistencyService.getSessionVoiceContext(params.context.sessionId);
      //     logger.info(`🎭 Retrieved voice context for ${Object.keys(voiceContext.knownCharacters).length} known characters`);
      //   } catch (voiceError) {
      //     logger.warn('Failed to retrieve voice context:', voiceError);
      //   }
      // }

      // Detect combat from player message
      const combatDetection = detectCombatFromText(params.message);
      logger.info(`⚔️ Combat detection: ${combatDetection.isCombat ? 'YES' : 'NO'} (confidence: ${Math.round(combatDetection.confidence * 100)}%)`);
      
      if (combatDetection.isCombat) {
        logger.info(`🎯 Combat details:`, {
          type: combatDetection.combatType,
          shouldStart: combatDetection.shouldStartCombat,
          shouldEnd: combatDetection.shouldEndCombat,
          enemies: combatDetection.enemies?.length || 0,
          actions: combatDetection.combatActions?.length || 0
        });
      }
      
      // Optional path: delegate to CrewAI orchestrator behind feature flag
      if (this.useCrewAI() && params.context.sessionId) {
        try {
          logger.info('Using CrewAI microservice for chat...');
          const sessionState = await SessionStateService.getState(params.context.sessionId);
          const crewResult = await AgentOrchestrator.generateResponse({
            message: params.message,
            context: params.context,
            conversationHistory: params.conversationHistory || [],
            sessionState
          });

          // If CrewAI returned placeholder text, generate final prose via Gemini but keep CrewAI roll_requests
          let finalText = crewResult.text || '';
          const isPlaceholder = finalText.trim().startsWith('[CrewAI placeholder]');
          const rollRequests = (crewResult as any).roll_requests || [];
          if (isPlaceholder) {
            // If a roll is requested, prompt the user to roll first instead of narrating outcomes
            if (Array.isArray(rollRequests) && rollRequests.length > 0) {
              const rr = rollRequests[0];
              const typeLabel = rr.type === 'check' ? 'Check' : rr.type === 'save' ? 'Saving Throw' : rr.type === 'attack' ? 'Attack' : rr.type === 'damage' ? 'Damage' : 'Initiative';
              const purpose = rr.purpose || (rr.type === 'check' ? 'Ability/Skill Check' : typeLabel);
              const target = rr.dc ? ` (DC ${rr.dc})` : rr.ac ? ` (AC ${rr.ac})` : '';
              const advantage = rr.advantage ? ' with advantage' : rr.disadvantage ? ' with disadvantage' : '';
              finalText = `Please roll ${purpose}${target}${advantage}.`;
            } else {
              logger.info('CrewAI returned placeholder text; generating narration via local Gemini.');
              try {
                const geminiManager = this.getGeminiManager();
                const genAIResult = await geminiManager.executeWithRotation(async (genAI) => {
                  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
                  const prompt = `Respond to the player succinctly (2-3 short paragraphs) and end with 2-3 lettered options. Player said: "${params.message}"`;
                  const response = await model.generateContent(prompt);
                  const res = await response.response;
                  return res.text();
                });
                finalText = genAIResult || finalText;
              } catch (e) {
                logger.warn('Gemini fallback for placeholder failed, using placeholder text:', e);
              }
            }
          }

          // Post-processing parity: memory extraction and world expansion
          if (params.context.sessionId) {
            try {
              const memoryContext = {
                sessionId: params.context.sessionId,
                campaignId: params.context.campaignId,
                characterId: params.context.characterId,
                currentMessage: params.message,
                recentMessages: params.conversationHistory?.slice(-5).map(msg => msg.content) || [],
              };
              const extractionResult = await MemoryManager.extractMemories(
                memoryContext,
                params.message,
                finalText
              );
              if (extractionResult.memories.length > 0) {
                await MemoryManager.saveMemories(extractionResult.memories);
                logger.info(`🧠 Extracted and saved ${extractionResult.memories.length} memories (CrewAI path)`);
              }
            } catch (memoryError) {
              logger.warn('Memory extraction (CrewAI path) failed (non-fatal):', memoryError);
            }

            try {
              const worldExpansion = await WorldBuilderService.respondToPlayerAction(
                params.context.campaignId,
                params.context.sessionId!,
                params.context.characterId,
                params.message,
                finalText
              );
              if (worldExpansion && worldExpansion.locations.length + worldExpansion.npcs.length + worldExpansion.quests.length > 0) {
                logger.info(`🌍 World expanded (CrewAI): +${worldExpansion.locations.length} locations, +${worldExpansion.npcs.length} NPCs, +${worldExpansion.quests.length} quests`);
              }
            } catch (worldError) {
              logger.warn('World building (CrewAI path) failed (non-fatal):', worldError);
            }
          }

          const enhancedCrewResult = {
            ...crewResult,
            text: finalText,
            combatDetection: {
              isCombat: combatDetection.isCombat,
              confidence: combatDetection.confidence,
              combatType: combatDetection.combatType,
              shouldStartCombat: combatDetection.shouldStartCombat,
              shouldEndCombat: combatDetection.shouldEndCombat,
              enemies: combatDetection.enemies || [],
              combatActions: combatDetection.combatActions || []
            }
          } as any;

          return enhancedCrewResult;
        } catch (crewError) {
          logger.warn('CrewAI orchestrator failed, falling back to Gemini:', crewError);
          // Continue to legacy path below
        }
      }
      
      // Use local Gemini API
      logger.info('Using local Gemini API for chat...');
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
          
          // Build enhanced context for DM interactions with voice segmentation
          let contextPrompt = `<persona>
You are a skilled D&D 5e Dungeon Master who creates immersive, mechanically-sound adventures. You balance compelling narrative with proper game mechanics, always giving players meaningful choices with clear consequences.
</persona>`;

          contextPrompt += `<rules_of_play>
<dice_rolling>
<title>CRITICAL: ALWAYS REQUEST DICE ROLLS FROM PLAYERS</title>
You MUST request dice rolls from players for uncertain outcomes. This maintains player agency and engagement.

<request_types>
- Combat actions: Request attack rolls, damage rolls (using character's specific weapon dice), saving throws
- Skill checks: Ask for Investigation, Perception, Persuasion, etc. rolls
- Random events: Player rolls for random outcomes when they're the cause
</request_types>

<formatting>
- Use CHARACTER'S ACTUAL MODIFIERS in your requests.
- Format: "Please roll [dice with actual modifier] for [purpose] (target DC [number])"
</formatting>

<examples>
✅ "The orc attacks you! Please roll an attack roll with your weapon"
✅ "Please make a Perception check" (system will auto-calculate WIS modifier + proficiency)
✅ "Roll initiative!" (system will auto-calculate DEX modifier)
✅ "Make a Dexterity saving throw (DC 15) to avoid the fireball"
✅ "Roll for a Stealth check to sneak past the guard"
</examples>

<simple_requests>
For simplicity, you can use these commands and the system will calculate modifiers automatically:
✅ "Make an attack roll"
✅ "Roll initiative"
✅ "Make a Dexterity saving throw"
✅ "Make a Perception check"
✅ "Roll for Stealth"
</simple_requests>

<npc_and_environment_rolls>
You handle rolls for NPCs and the environment "behind the screen".
✅ "The orc attacks (rolling behind screen... hits AC 13) dealing 6 slashing damage"
✅ "A mysterious sound echoes from the shadows (rolled for random encounter)"
</npc_and_environment_rolls>

<never_do_this>
❌ "You rolled 16 and succeeded" (Player hasn't rolled yet!)
❌ "Rolling 1d20+3 = 14 for your Perception" (Player should roll!)
❌ "The result is 18" (without player action)
</never_do_this>
</dice_rolling>

<dialogue>
<title>CRITICAL: NPC DIALOGUE REQUIREMENTS</title>
- ALL significant NPC interactions MUST use direct quoted speech. Examples: "What brings you to these dark woods?" or "I've been expecting you, adventurer."
- NEVER describe speech indirectly (e.g., "He greets you warmly" or "She asks about your quest"). Every meaningful NPC response should contain actual spoken words in quotes.
- This applies to shopkeepers, guards, villagers, enemies, allies - ALL speaking NPCs.
- Give each NPC a unique voice, vocabulary, and speech pattern.
- Include body language and emotional cues: The merchant nervously fidgets with his coin purse before saying, "Perhaps we can strike a bargain?"
- Match dialogue to character: A gruff dwarf might say "Bah! What's a human doing in these tunnels?" while an elegant elf says "How... unexpected to encounter your kind here."

<dialogue_examples>
✅ CORRECT: The tavern keeper looks up from cleaning glasses. "Rough night out there, eh? What can I get you?"
❌ INCORRECT: The tavern keeper greets you and asks what you want to drink.

✅ CORRECT: The guard steps forward, hand on sword hilt. "State your business, stranger. The city's been on edge lately."
❌ INCORRECT: The guard approaches and questions your presence suspiciously.
</dialogue_examples>
</dialogue>

<combat>
<title>COMBAT GUIDELINES</title>
- **REQUEST INITIATIVE FROM PLAYERS**: "Roll initiative! (1d20+dex modifier)"
- **REQUEST PLAYER ATTACK ROLLS**: "Make an attack roll with your [weapon] (1d20+attack bonus)"
- **REQUEST SAVING THROWS**: "Make a [ability] saving throw (1d20+modifier, DC [number])"
- **REQUEST DAMAGE ROLLS**: "Roll damage for your [weapon/spell] ([exact dice from character equipment])" - USE SPECIFIC WEAPON DICE (1d8 for longsword, 1d6 for shortsword, etc.)
- **NPC ACTIONS**: Handle behind screen: "The orc attacks (rolled behind screen, hits AC 14)"
- Apply D&D 5e rules: advantage/disadvantage, resistance, spell components, concentration.
- Describe hits/misses cinematically with mechanical accuracy.
- Track position, conditions, and tactical elements.
- Include battle cries and combat dialogue in direct quotes.
- Consider environmental factors (cover, difficult terrain, lighting).
- NPCs should use tactics appropriate to their intelligence and experience.
</combat>
</rules_of_play>`;
          
          contextPrompt += `<game_context>`
          if (params.context.campaignDetails) {
            contextPrompt += `<campaign_details>
CAMPAIGN: "${params.context.campaignDetails.name}"
DESCRIPTION: ${params.context.campaignDetails.description}
</campaign_details>`;
          }
          
          if (params.context.characterDetails) {
            const char = params.context.characterDetails;
            contextPrompt += `<character_details>
PLAYER CHARACTER: ${char.name}, a level ${char.level} ${char.race || 'Unknown Race'} ${char.class || 'Unknown Class'}`;
            if (char.background) {
              contextPrompt += ` (${char.background} background)`;
            }

            // Add character stats for roll calculations
            if (char.character_stats && char.character_stats.length > 0) {
              const stats = char.character_stats[0];
              contextPrompt += `
<ability_scores>
STR ${stats.strength}(${Math.floor((stats.strength - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.strength - 10) / 2)}), DEX ${stats.dexterity}(${Math.floor((stats.dexterity - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.dexterity - 10) / 2)}), CON ${stats.constitution}(${Math.floor((stats.constitution - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.constitution - 10) / 2)}), INT ${stats.intelligence}(${Math.floor((stats.intelligence - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.intelligence - 10) / 2)}), WIS ${stats.wisdom}(${Math.floor((stats.wisdom - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.wisdom - 10) / 2)}), CHA ${stats.charisma}(${Math.floor((stats.charisma - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.charisma - 10) / 2)})
</ability_scores>`;

              // Calculate and include proficiency bonus
              const profBonus = char.level >= 17 ? 6 : char.level >= 13 ? 5 : char.level >= 9 ? 4 : char.level >= 5 ? 3 : 2;
              contextPrompt += `
<proficiency_bonus>+${profBonus}</proficiency_bonus>`;
            }

            // Add default equipment for class-based damage rolls
            const classEquipment = this.getClassEquipment(char.class?.name || char.class || 'Fighter');
            contextPrompt += `
<equipment>
${classEquipment.weapons.join(', ')} | ${classEquipment.armor}
**CRITICAL: USE EXACT WEAPON DICE from equipment list above for damage roll requests!**
</equipment>`;

            contextPrompt += `
</character_details>`;
          }
          
          // Add relevant memories to context
          if (relevantMemories.length > 0) {
            contextPrompt += `
<story_memories>
<title>IMPORTANT STORY MEMORIES</title>
Reference these memories naturally to maintain story continuity.`;
            relevantMemories.forEach((memory, index) => {
              contextPrompt += `
<memory index="${index + 1}" type="${memory.type.toUpperCase()}">${memory.content}</memory>`;
            });
            contextPrompt += `
</story_memories>`;
          }
          contextPrompt += `</game_context>`

          // Detect if this is a campaign opening (first message)
          const isFirstMessage = (!params.conversationHistory || params.conversationHistory.length === 0) && (!params.message || params.message.trim() === '');
          
          if (isFirstMessage) {
            contextPrompt += `<opening_scene_requirements>
<title>CAMPAIGN OPENING - FIRST MESSAGE REQUIREMENTS</title>
This is the campaign's opening scene. Create an engaging D&D adventure start that hooks the player immediately.

<structure>
1. **Scene Setting**: Establish location, atmosphere, and immediate situation using rich sensory details.
2. **Character Integration**: Connect the character's background and skills to the opening scenario.
3. **Active NPC**: Include at least one speaking NPC with quoted dialogue and clear personality.
4. **Immediate Hook**: Present a compelling problem, opportunity, or mystery requiring action.
5. **Clear Choices**: End with 2-3 specific action options with different approaches and consequences.
</structure>

<mechanics>
- If uncertain outcomes occur, specify needed dice rolls: "Make a Perception check (d20 + Wisdom modifier)".
- Reference character abilities that might be relevant: "Your training might help here".
- Include environmental details that suggest skill applications or tactical options.
- Set up potential ability checks, combat, or social interactions.
</mechanics>

<elements>
- Use appropriate atmosphere and tone throughout.
- Make the character feel central to unfolding events.
- Create both immediate and long-term stakes.
- Include sensory details (sights, sounds, smells, textures).
- Show why this character is the right person for this adventure.
- End with a clear "What do you do?" moment.
</elements>
</opening_scene_requirements>`;
          }

          // Add combat context if detected
          contextPrompt += this.formatCombatContext(combatDetection);
          
          // Add specific dice roll requirements for combat
          if (combatDetection.isCombat) {
            contextPrompt += `<combat_roll_requirements>
<title>IMMEDIATE DICE ROLL REQUIREMENTS</title>
Based on the detected combat scenario, you MUST include these dice rolls in your response:
- Initiative rolls for any new combat participants.
- Attack rolls for any offensive actions.
- Damage rolls following successful attacks.
- Saving throws for any effects or spells.
- Any ability checks mentioned by the player.

**CRITICAL**: Include actual dice roll results in your "dice_rolls" array AND display them in the narrative text.
</combat_roll_requirements>`;
          }

          // Add voice context for multi-voice narration
          if (voiceContext) {
            contextPrompt += `<voice_optimization_format>
<title>CRITICAL: VOICE-OPTIMIZED RESPONSE FORMAT</title>
You MUST respond with JSON containing both display text AND pre-segmented narration for multi-voice synthesis.
**IMPORTANT: Return ONLY pure JSON - no markdown, no code blocks, no extra text!**

<segmentation_rules>
1. **Fewer, Better Segments**: Create 2-5 segments maximum per response.
2. **One Speaker Per Segment**: Each segment = one speaker (DM or specific character).
3. **Complete Thoughts**: Each segment should be a complete thought or dialogue turn.
4. **Speaker Turns**: Split only when the speaker changes (DM -> Character or Character A -> Character B).
</segmentation_rules>

<json_format>
{
  "text": "Your full response with proper quoted dialogue and dice roll results for display",
  "narration_segments": [
    { "type": "dm", "text": "Complete scene description and DM narration", "character": null, "voice_category": null },
    { "type": "character", "text": "Complete character dialogue without quotes", "character": "simple character name", "voice_category": "hero_male|villain_female|merchant|guard|elder|creature|etc" }
  ],
  "roll_requests": [
    { "type": "check|save|attack|damage|initiative", "formula": "1d20+5", "purpose": "Arcana check to understand the magical mechanism", "dc": 15, "advantage": false, "disadvantage": false }
  ]
}
</json_format>

<roll_request_requirements>
- ALWAYS include "roll_requests" array when requesting dice rolls from players.
- Include roll_requests for: player combat actions, skill checks, saving throws, initiative.
- Each roll_request must have: type, formula, purpose, and target (DC/AC) if applicable.
- Show roll requests in the "text" field: "Please roll 1d20+5 for your Arcana check (DC 15)"
</roll_request_requirements>

<voice_categories>hero_male, hero_female, villain_male, villain_female, merchant, guard, innkeeper, elder, child, creature, goblin, monster</voice_categories>
</voice_optimization_format>`;

          } else {
            contextPrompt += `<roll_metadata_format>
<title>CRITICAL: STRUCTURED ROLL METADATA</title>
Whenever you request the PLAYER to roll dice, append your narrative with a fenced code block using this EXACT format:
\`\`\`ROLL_REQUESTS_V1
{
  "rolls": [
    {
      "type": "check|save|attack|damage|initiative|skill_check",
      "formula": "1d20+modifier",
      "purpose": "Reason for the roll",
      "dc": 12,
      "ac": 15,
      "advantage": false,
      "disadvantage": false
    }
  ]
}
\`\`\`

<rules>
- The code fence label MUST be ROLL_REQUESTS_V1.
- Include every player-facing roll request in the "rolls" array; exclude NPC or behind-the-screen rolls.
- Use lower-case type keywords exactly as shown above.
- Include DC or AC when relevant; omit properties that do not apply rather than writing descriptive text.
- Keep the JSON strict: double quotes, no trailing commas.
- If no player roll is required, output {"rolls": []} in the block.
</rules>
</roll_metadata_format>`;
          }
          
          contextPrompt += `<response_structure>
<title>DM RESPONSE GUIDELINES</title>
<core_principles>
- Respond to the player's action with clear consequences and vivid descriptions.
- Use D&D 5e mechanics when appropriate (ask for ability checks, saving throws, attacks).
- Include sensory details and environmental context.
- Track narrative threads and callback to previous events from memories.
- Give NPCs distinct voices and personalities.
</core_principles>

<structure>
1. **Consequences**: Describe what happens as a result of their action.
2. **New Information**: Reveal new details, clues, or developments.
3. **NPC Interaction**: Include direct quoted dialogue for ALL speaking NPCs.
4. **Environmental Details**: Paint the scene with sensory information.
5. **Choice Point**: End with 2-3 clear options or ask what they want to do next.
</structure>

<visual_prompt_rule>
**OPTIONAL VISUAL PROMPT (for image generation):**
At the very end of the response, if the scene would benefit from an illustration, include a single concise line starting with:
VISUAL PROMPT: <short art prompt focusing on key visual elements>
Examples:
- VISUAL PROMPT: Moonlit forest clearing with ancient standing stones and swirling mist
- VISUAL PROMPT: Crumbling obsidian keep under stormy skies with lightning forks
Keep this to a single line; do not include quotes or extra commentary.
</visual_prompt_rule>

<player_choice_generation>
<title>CRITICAL: ACTION OPTIONS FORMATTING</title>

<verbalized_sampling_technique>
To ensure creative and diverse choices, first internally brainstorm 4-5 potential actions for the player. One of these must be an unconventional "wild card" option. Then, select the best 2-3 options from your brainstormed list to present to the player.
</verbalized_sampling_technique>

<formatting_rules>
You MUST format the final choices as lettered options with bold action names. This formatting is REQUIRED for the options to appear as clickable buttons in the game interface. Always include 2-3 options formatted this way at the end of your responses unless the situation clearly calls for a single specific action (like combat resolution).

Format: A. **Action Name**, brief description of what this choice involves

Examples:
- A. **Approach cautiously**, moving carefully to avoid detection while gathering information.
- B. **Charge forward boldly**, relying on speed and surprise to overcome obstacles.
- C. **Attempt to negotiate**, using your diplomatic skills to find a peaceful solution.
- D. **(Wild Card) Examine the strange runes,** trying to decipher their meaning even if it seems unrelated to the immediate threat.
</formatting_rules>
</player_choice_generation>

<final_prompt>
Keep responses engaging, 1-3 paragraphs, and always end with a clear prompt for player action or decision.
</final_prompt>
</response_structure>`;

          // TODO: Implement Passive Skills. When a character enters a new scene, check their passive skills (e.g., Perception, Insight).
          // If a skill is high enough to notice something hidden, proactively provide a small piece of information.
          // For example: "As you enter the chamber, your keen eyes (Passive Perception) notice subtle scuff marks near the base of the statue."
          // This will require adding passive skill calculation to the character details and modifying the prompt to use it.

          if (voiceContext) {
              contextPrompt += `\n**REMEMBER: Always respond in the JSON format with narration_segments for voice synthesis!**`;
          }
          
          // Build conversation history
          const messages = [
            { role: 'user', parts: [{ text: contextPrompt }] },
            { role: 'model', parts: [{ text: 'Understood! I\'m ready to be your Dungeon Master.' }] }
          ];
          
          // Add conversation history
          if (params.conversationHistory) {
            params.conversationHistory.forEach(msg => {
              messages.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              });
            });
          }
          
          const chat = model.startChat({
            history: messages,
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048, // Increased from 1024 to prevent truncation
            },
          });
          
          // Use streaming if callback provided (note: streaming won't work with JSON parsing)
          if (params.onStream && !voiceContext) {
            const response = await chat.sendMessageStream(params.message);
            let fullResponse = '';
            
            for await (const chunk of response.stream) {
              const chunkText = chunk.text();
              fullResponse += chunkText;
              params.onStream(chunkText);
            }
            
            return { text: fullResponse };
          } else {
            const response = await chat.sendMessage(params.message);
            const result = await response.response;
            const rawResponse = result.text();

            // Try to parse structured response if voice context is available
            if (voiceContext) {
              try {
                // Clean the response by removing markdown code blocks first
                let cleanedResponse = rawResponse.trim();
                
                // Remove markdown code blocks (```json ... ```)
                cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
                
                // Try to find JSON content if the response has extra text
                const jsonStart = cleanedResponse.indexOf('{');
                const jsonEnd = cleanedResponse.lastIndexOf('}');
                
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                  cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
                }
                
                // Additional cleanup for common JSON formatting issues
                cleanedResponse = cleanedResponse
                  .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                  .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
                  .replace(/}\s*{/g, '},{') // Fix missing commas between objects
                  .replace(/"\s*:\s*"([^"]*?)"\s*([,}])/g, '":"$1"$2'); // Fix spacing issues
                
                // Parse the cleaned JSON
                const structuredResponse = JSON.parse(cleanedResponse);
                logger.debug('🎭 Successfully parsed structured voice response');
                
                // 🔍 DEBUG: Log the raw AI response structure
                logger.debug('📥 RAW AI RESPONSE:', JSON.stringify(structuredResponse, null, 2));
                
                if (structuredResponse.narration_segments) {
                  logger.debug('📊 AI SEGMENTS ANALYSIS:');
                  structuredResponse.narration_segments.forEach((segment: NarrationSegment, idx: number) => {
                    logger.debug(`  Segment ${idx + 1}:`, {
                      type: segment.type,
                      character: segment.character,
                      voice_category: segment.voice_category,
                      text_length: segment.text?.length || 0,
                      text_preview: segment.text?.substring(0, 50) + '...'
                    });
                  });
                }
                
                return structuredResponse;
              } catch (parseError) {
                logger.warn('Failed to parse structured response, attempting to extract text:', parseError);
                
                // Try to extract text from malformed JSON
                try {
                  // Look for text field in the response even if JSON is malformed
                  const textMatch = rawResponse.match(/"text"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
                  if (textMatch) {
                    const extractedText = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                    logger.debug('🔧 Extracted text from malformed JSON');
                    return { text: extractedText };
                  }
                } catch (extractError) {
                  logger.warn('Could not extract text from malformed JSON:', extractError);
                }
                
                // Final fallback - return raw response with minimal cleaning
                // Only remove obvious JSON structure markers if they exist
                let cleanText = rawResponse;
                if (cleanText.trim().startsWith('{') && cleanText.includes('"text"')) {
                  // Try to find where the actual text content starts and ends
                  const startMatch = cleanText.match(/"text"\s*:\s*"/);
                  if (startMatch) {
                    const startIndex = startMatch.index! + startMatch[0].length;
                    let textContent = cleanText.substring(startIndex);
                    
                    // Find the end of the text content (look for quote followed by comma or closing brace)
                    const endMatch = textContent.match(/"\s*[,}]/);
                    if (endMatch) {
                      textContent = textContent.substring(0, endMatch.index);
                    } else {
                      // If no clear end found, look for the last quote
                      const lastQuoteIndex = textContent.lastIndexOf('"');
                      if (lastQuoteIndex > 0) {
                        textContent = textContent.substring(0, lastQuoteIndex);
                      }
                    }
                    
                    // Unescape the content
                    cleanText = textContent.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                  }
                }
                return { text: cleanText || rawResponse };
              }
            }
            
            return { text: rawResponse };
          }
        });
        
        logger.info('Successfully generated DM response using local Gemini API');

        // Process voice assignments if we have structured data
        if (result.narration_segments && params.context.sessionId && voiceContext) {
          try {
            // Normalize segment types for compatibility
            type VoiceSegment = { type: string; text: string; character?: string; voice_category?: string };
            const normalizedSegments: VoiceSegment[] = result.narration_segments.map((segment: NarrationSegment) => ({
              ...segment,
              type: segment.type === 'dm' ? 'narration' : segment.type === 'character' ? 'dialogue' : (segment.type as string)
            }));
            
            await voiceConsistencyService.processVoiceAssignments(
              params.context.sessionId,
              normalizedSegments
            );
            logger.info('🎪 Processed voice assignments for character consistency');
          } catch (voiceError) {
            logger.warn('Voice assignment processing failed (non-fatal):', voiceError);
          }
        }
        
        // Extract memories from this conversation exchange
        if (params.context.sessionId) {
          try {
            const memoryContext: MemoryContext = {
              sessionId: params.context.sessionId,
              campaignId: params.context.campaignId,
              characterId: params.context.characterId,
              currentMessage: params.message,
              recentMessages: params.conversationHistory?.slice(-5).map(msg => msg.content) || [],
            };
            
            const extractionResult = await MemoryManager.extractMemories(
              memoryContext,
              params.message,
              result.text
            );
            
            if (extractionResult.memories.length > 0) {
              await MemoryManager.saveMemories(extractionResult.memories);
              logger.info(`🧠 Extracted and saved ${extractionResult.memories.length} memories`);
            }
          } catch (memoryError) {
            logger.warn('Memory extraction failed (non-fatal):', memoryError);
          }
          
          // Expand world based on player action and AI response
          try {
            const worldExpansion = await WorldBuilderService.respondToPlayerAction(
              params.context.campaignId,
              params.context.sessionId!,
              params.context.characterId,
              params.message,
              result.text
            );
            
            if (worldExpansion && worldExpansion.locations.length + worldExpansion.npcs.length + worldExpansion.quests.length > 0) {
              logger.info(`🌍 World expanded: +${worldExpansion.locations.length} locations, +${worldExpansion.npcs.length} NPCs, +${worldExpansion.quests.length} quests`);
            }
          } catch (worldError) {
            logger.warn('World building failed (non-fatal):', worldError);
          }
        }
        
        // Add combat detection data to the result
        const enhancedResult = {
          ...result,
          combatDetection: {
            isCombat: combatDetection.isCombat,
            confidence: combatDetection.confidence,
            combatType: combatDetection.combatType,
            shouldStartCombat: combatDetection.shouldStartCombat,
            shouldEndCombat: combatDetection.shouldEndCombat,
            enemies: combatDetection.enemies || [],
            combatActions: combatDetection.combatActions || []
          }
        };
        
        return enhancedResult;
        
    } catch (geminiError) {
      logger.error('Local Gemini API failed:', geminiError);
      if (isPaymentRequiredError(geminiError)) {
        logger.warn('Local Gemini API returned 402 Payment Required. Using fallback DM response.');
        const fallback = buildPaymentRequiredFallback(params.message, combatDetection);
        return {
          ...fallback,
          combatDetection: {
            isCombat: combatDetection.isCombat,
            confidence: combatDetection.confidence,
            combatType: combatDetection.combatType,
            shouldStartCombat: combatDetection.shouldStartCombat,
            shouldEndCombat: combatDetection.shouldEndCombat,
            enemies: combatDetection.enemies || [],
            combatActions: combatDetection.combatActions || []
          }
        } as any;
      }
      throw new Error('Failed to get DM response - AI service unavailable');
    }
    })(); // End of the async promise wrapper

    // Store promise in in-flight map and return it
    inFlight.set(key, { ts: now, promise: p });
    return p;
  }

  /**
   * Save a chat message to the database
   */
  static async saveChatMessage(params: {
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    speakerId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('dialogue_history')
        .insert({
          session_id: params.sessionId,
          speaker_type: params.role,
          speaker_id: params.speakerId,
          message: params.content,
        });

      if (error) {
        logger.error('Error saving chat message:', error);
        throw new Error('Failed to save chat message');
      }
    } catch (error) {
      logger.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  static async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('dialogue_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (error) {
        logger.error('Error getting conversation history:', error);
        throw new Error('Failed to get conversation history');
      }

      return data.map(msg => ({
        id: msg.id,
        role: msg.speaker_type as 'user' | 'assistant',
        content: msg.message,
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
      }));
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Generate an opening message for a new campaign session
   * Creates an engaging introduction based on campaign and character context
   */
  static async generateOpeningMessage(params: {
    context: GameContext;
  }): Promise<string> {
    logger.info('Generating opening message for new session...');
    
    try {
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
        
        // Build enhanced context for opening message
        let contextPrompt = `You are an expert D&D 5e Dungeon Master with years of experience creating memorable adventures. You have a vivid, immersive storytelling style that immediately draws players into the world.`;
        
        // Determine campaign tone and genre for appropriate DM voice
        let campaignTone = 'balanced';
        if (params.context.campaignDetails) {
          const rawDescription = params.context.campaignDetails.description || '';
          const description = rawDescription.toLowerCase();
          if (description.includes('dark') || description.includes('horror') || description.includes('grim')) {
            campaignTone = 'dark';
          } else if (description.includes('light') || description.includes('comedy') || description.includes('fun')) {
            campaignTone = 'lighthearted';
          } else if (description.includes('epic') || description.includes('legendary') || description.includes('heroic')) {
            campaignTone = 'epic';
          }
          
          contextPrompt += `\n\nCAMPAIGN CONTEXT:\nTitle: "${params.context.campaignDetails.name}"\nDescription: ${params.context.campaignDetails.description}`;
        }
        
        if (params.context.characterDetails) {
          const char = params.context.characterDetails;
          contextPrompt += `\n\nPLAYER CHARACTER:\nName: ${char.name}\nRace: ${char.race}\nClass: ${char.class}\nLevel: ${char.level}`;
          if (char.background) {
            contextPrompt += `\nBackground: ${char.background}`;
          }
          if (char.description) {
            contextPrompt += `\nDescription: ${char.description}`;
          }
        }
        
        contextPrompt += `\n\nCampaign Tone: ${campaignTone}\n\nCreate an immersive opening scene that:
1. **Immediate Engagement**: Start in the middle of an intriguing situation, not just "you enter a tavern"
2. **Sensory Rich**: Include what you see, hear, smell, feel, and taste
3. **Character Integration**: Reference their ${params.context.characterDetails?.class || 'character'} abilities, equipment, or background naturally
4. **Decision Point**: End with a compelling choice between 2-3 distinct actions with clear stakes
5. **NPC Interaction**: Include at least one interesting NPC with direct quoted dialogue
6. **World Details**: Add unique elements that make this world feel alive and distinct
7. **Foreshadowing**: Hint at larger mysteries or conflicts without revealing everything
8. **Clear Stakes**: Make it obvious why this moment matters

**CRITICAL: NPC Dialogue Requirements**
- ALL NPC interactions MUST use direct quoted speech
- Examples: "Stranger, you look like you've seen trouble," or "Help me! The bandits took everything!"
- NEVER describe speech indirectly (e.g., "A merchant greets you" or "Someone calls for help")
- Every speaking NPC should have actual quoted words that reveal personality and plot

**CRITICAL: ACTION OPTIONS FORMATTING**
When providing choices to the player, you MUST format them as lettered options with bold action names:

Format: A. **Action Name**, brief description of what this choice involves

Examples:
- A. **Approach cautiously**, moving carefully to avoid detection while gathering information
- B. **Charge forward boldly**, relying on speed and surprise to overcome obstacles
- C. **Attempt to negotiate**, using your diplomatic skills to find a peaceful solution

This formatting is REQUIRED for the options to appear as clickable buttons in the game interface. Always include 2-3 options formatted this way at the end of your response.

TONE GUIDELINES:
- ${campaignTone === 'dark' ? 'Use atmospheric, tension-filled language. Emphasize danger and moral ambiguity.' : ''}
- ${campaignTone === 'lighthearted' ? 'Include moments of humor and whimsy. Keep things optimistic and fun.' : ''}
- ${campaignTone === 'epic' ? 'Use grand, inspiring language. Make the player feel heroic and destined for greatness.' : ''}
- ${campaignTone === 'balanced' ? 'Balance serious moments with lighter touches. Create realistic but hopeful atmosphere.' : ''}

FORMAT: Write 2-3 paragraphs in second person ("you"). End with a specific question about what the player wants to do, offering multiple viable options formatted as described above.

Remember: You're not just describing a scene - you're launching an epic story where the player is the hero. Make them excited to take their first action!`;
        
        const response = await model.generateContent(contextPrompt);
        const result = await response.response;
        return result.text();
      });
      
      logger.info('Successfully generated opening message');
      return result;
      
    } catch (error) {
      logger.error('Failed to generate opening message:', error);
      // Fallback generic opening
      return `Welcome to your adventure! You find yourself at the beginning of an epic journey. Your character stands ready to face whatever challenges lie ahead. What would you like to do?`;
    }
  }

  /**
   * Get default equipment for a character class
   * Used to provide the AI with weapon damage dice information
   */
  private static getClassEquipment(className: string): { weapons: string[]; armor: string } {
    const classLower = className.toLowerCase();

    switch (classLower) {
      case 'fighter':
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Handaxe (1d6)', 'Light Crossbow (1d8)'],
          armor: 'Chain mail (AC 16)'
        };

      case 'rogue':
        return {
          weapons: ['Shortsword (1d6)', 'Dagger (1d4)', 'Shortbow (1d6)', 'Rapier (1d8)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'ranger':
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Longbow (1d8)', 'Handaxe (1d6)'],
          armor: 'Studded leather (AC 12)'
        };

      case 'barbarian':
        return {
          weapons: ['Greataxe (1d12)', 'Handaxe (1d6)', 'Javelin (1d6)'],
          armor: 'Unarmored (AC 10 + Dex + Con)'
        };

      case 'wizard':
        return {
          weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
          armor: 'No armor (AC 10)'
        };

      case 'sorcerer':
        return {
          weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
          armor: 'No armor (AC 10)'
        };

      case 'warlock':
        return {
          weapons: ['Dagger (1d4)', 'Light Crossbow (1d8)', 'Scimitar (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'cleric':
        return {
          weapons: ['Mace (1d6)', 'Warhammer (1d8)', 'Light Crossbow (1d8)', 'Shield'],
          armor: 'Scale mail (AC 14)'
        };

      case 'druid':
        return {
          weapons: ['Scimitar (1d6)', 'Shield', 'Dart (1d4)', 'Javelin (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'paladin':
        return {
          weapons: ['Longsword (1d8)', 'Javelin (1d6)', 'Shield'],
          armor: 'Chain mail (AC 16)'
        };

      case 'bard':
        return {
          weapons: ['Rapier (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)', 'Hand Crossbow (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'monk':
        return {
          weapons: ['Shortsword (1d6)', 'Dart (1d4)', 'Unarmed Strike (1d4)'],
          armor: 'Unarmored (AC 10 + Dex + Wis)'
        };

      default:
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)'],
          armor: 'Leather armor (AC 11)'
        };
    }
  }

  /**
   * Get Gemini API manager statistics (for debugging)
   */
  static getApiStats(): {
    currentKey: ReturnType<GeminiApiManager['getCurrentKeyInfo']>;
    allKeyStats: ReturnType<GeminiApiManager['getStats']>;
    rateLimits: ReturnType<GeminiApiManager['getRateLimitStats']>;
  } {
    try {
      const manager = this.getGeminiManager();
      return {
        currentKey: manager.getCurrentKeyInfo(),
        allKeyStats: manager.getStats(),
        rateLimits: manager.getRateLimitStats(),
      };
    } catch (error) {
      return { error: 'Gemini API manager not available' } as unknown as {
        currentKey: ReturnType<GeminiApiManager['getCurrentKeyInfo']>;
        allKeyStats: ReturnType<GeminiApiManager['getStats']>;
        rateLimits: ReturnType<GeminiApiManager['getRateLimitStats']>;
      };
    }
  }
}