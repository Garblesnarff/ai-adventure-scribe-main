/**
 * Combat AI Integration Hook
 *
 * Bridges combat system with AI agents for seamless D&D experience.
 * Handles combat event notifications, AI responses, dice rolls, and rule validations.
 * Now includes combat detection from DM text and automatic dice roll generation.
 */

import { useEffect, useRef, useCallback, useContext } from 'react';

import { logger } from '../lib/logger';

import type { CombatEvent, CombatAction, CombatParticipant, ActionType } from '@/types/combat';
import type { ChatMessage } from '@/types/game';
import type { DetectedCombatAction, PlayerCharacterLike } from '@/utils/combatDetection';
import type { DiceRoll } from '@/utils/diceUtils';

import { useCombat } from '@/contexts/CombatContext';
import { useMessages } from '@/hooks/use-messages';
import {
  detectCombatFromText,
  createCombatParticipantsFromDetection,
} from '@/utils/combatDetection';
import { rollDice } from '@/utils/diceUtils';
import { callEdgeFunction } from '@/utils/edgeFunctionHandler';

// Combat message data interface for dice rolls
export interface CombatMessageData {
  type:
    | 'attack_roll'
    | 'damage_roll'
    | 'saving_throw'
    | 'skill_check'
    | 'initiative'
    | 'death_save'
    | 'concentration_save';
  actor: string;
  target?: string;
  roll: DiceRoll;
  dc?: number;
  success?: boolean;
  critical?: boolean;
  action?: DetectedCombatAction;
  description: string;
}

interface CombatAIIntegrationProps {
  sessionId?: string;
  characterId?: string;
  campaignId?: string;
}

export const useCombatAIIntegration = ({
  sessionId,
  characterId,
  campaignId,
}: CombatAIIntegrationProps) => {
  const combatContext = useCombat();
  const { addMessage } = useMessages(sessionId);
  const lastProcessedAction = useRef<string | null>(null);
  const lastProcessedRound = useRef<number>(0);
  const isStartingCombatRef = useRef(false);
  const hasInitiativeEmittedRef = useRef(false);
  const seenActionHashesRef = useRef<Set<string>>(new Set());
  const lastCombatEndAtRef = useRef<number>(0);
  const MIN_COMBAT_CONFIDENCE = Number(
    (import.meta as any)?.env?.VITE_MIN_COMBAT_CONFIDENCE ?? '0.55',
  );

  if (!combatContext) {
    throw new Error('useCombatAIIntegration must be used within CombatProvider');
  }

  const { state, startCombat, endCombat, addParticipant } = combatContext;

  const combatState = {
    isInCombat: state.isInCombat,
    activeEncounter: state.activeEncounter,
  };

  // Process DM response for combat content
  const processDMResponse = useCallback(
    async (
      dmMessage: ChatMessage,
      playerCharacter?: PlayerCharacterLike,
    ): Promise<{
      combatDetected: boolean;
      shouldStartCombat: boolean;
      shouldEndCombat: boolean;
      combatMessages: ChatMessage[];
    }> => {
      const detection = detectCombatFromText(dmMessage.text || '');
      const combatMessages: ChatMessage[] = [];

      // Handle combat ending
      if (detection.shouldEndCombat && state.activeEncounter) {
        await endCombat();
        hasInitiativeEmittedRef.current = false;
        seenActionHashesRef.current.clear();
        lastCombatEndAtRef.current = Date.now();
        return {
          combatDetected: true,
          shouldStartCombat: false,
          shouldEndCombat: true,
          combatMessages: [],
        };
      }

      // Handle combat starting with guard to prevent duplicates
      const canStartCombat =
        detection.isCombat &&
        detection.confidence >= MIN_COMBAT_CONFIDENCE &&
        !!(detection.enemies && detection.enemies.length > 0) &&
        !state.isInCombat;

      if (canStartCombat && !isStartingCombatRef.current) {
        isStartingCombatRef.current = true;

        try {
          const participants = createCombatParticipantsFromDetection(
            detection.enemies,
            playerCharacter,
          );

          // Start combat with detected participants (CombatProvider rolls initiative)
          if (sessionId) {
            await startCombat(sessionId, participants as Partial<CombatParticipant>[]);

            // Create enhanced combat start message for UI log
            // Note: After startCombat() completes, the actual initiative rolls are in the encounter state
            const initiativeText =
              participants.length > 1
                ? `${participants.length} combatants roll for initiative!`
                : `${participants[0]?.name || 'Fighter'} prepares for combat!`;

            const combatStartMessage: ChatMessage = {
              text: `⚔️ Combat has begun! ${initiativeText}\n\nInitiative order will be determined by d20 + DEX modifier.\nThe combat tracker will show turn order.`,
              sender: 'system',
              context: {
                combatData: {
                  type: 'initiative',
                  participants: participants.map((p) => ({
                    name: p.name || 'Unknown',
                    initiativeModifier: p.initiative || 0,
                  })),
                },
              },
              timestamp: new Date().toISOString(),
            };

            combatMessages.push(combatStartMessage);
            hasInitiativeEmittedRef.current = true;
            seenActionHashesRef.current.clear();
          }
        } finally {
          isStartingCombatRef.current = false;
        }
      }

      // Process detected combat actions for dice rolls
      if (detection.combatActions && detection.combatActions.length > 0) {
        let emitted = 0;
        for (const action of detection.combatActions) {
          // Skip low-value or unknown actor actions to reduce spam
          const actorName = (action.actor || '').trim();
          if (!actorName || actorName.toLowerCase() === 'unknown') {
            continue;
          }

          // De-duplicate similar actions within this encounter
          const hash = `${action.rollType}|${actorName}|${action.target || ''}|${action.weapon || ''}`;
          if (seenActionHashesRef.current.has(hash)) {
            continue;
          }

          const rollResult = await createCombatActionRoll(action);
          if (rollResult) {
            const combatMessage: ChatMessage = {
              text: rollResult.description,
              sender: 'system',
              context: {
                combatData: rollResult,
              },
              timestamp: new Date().toISOString(),
            };

            combatMessages.push(combatMessage);
            seenActionHashesRef.current.add(hash);
            emitted++;
            // Throttle per-response emissions
            if (emitted >= 2) break;
          }
        }
      }

      // Enforce mutual exclusivity between start/end hints to avoid contradictory logs
      let start = !!detection.shouldStartCombat;
      let end = !!detection.shouldEndCombat;
      if (start && end) {
        if (state.isInCombat)
          start = false; // already in combat, prefer end
        else end = false; // out of combat, prefer start
      }

      return {
        combatDetected: detection.isCombat,
        shouldStartCombat: start,
        shouldEndCombat: end,
        combatMessages,
      };
    },
    [state.activeEncounter, startCombat, endCombat, addParticipant],
  );

  // Create dice roll for a detected combat action
  const createCombatActionRoll = useCallback(
    async (action: DetectedCombatAction): Promise<CombatMessageData | null> => {
      let roll: DiceRoll;
      let dc: number | undefined;
      let success: boolean | undefined;
      let critical: boolean = false;

      switch (action.rollType) {
        case 'attack':
          // Attack roll (d20 + modifiers)
          roll = rollDice(20, 1, 5); // Base +5 attack bonus
          critical = roll.results[0] === 20;
          success = roll.total >= 15; // Assume AC 15 target
          dc = 15;
          break;

        case 'damage': {
          // Damage roll (weapon dependent)
          const damageRoll = action.weapon
            ? getDamageRollForWeapon(action.weapon)
            : { dice: 8, count: 1, modifier: 3 };
          roll = rollDice(damageRoll.dice, damageRoll.count, damageRoll.modifier);
          break;
        }

        case 'save':
          // Saving throw
          roll = rollDice(20, 1, 2); // Base +2 save bonus
          dc = 13; // Common save DC
          success = roll.total >= dc;
          break;

        case 'skill':
          // Skill check
          roll = rollDice(20, 1, 1); // Base +1 skill bonus
          dc = 12; // Common skill DC
          success = roll.total >= dc;
          break;

        default:
          return null;
      }

      const messageType =
        action.rollType === 'attack'
          ? 'attack_roll'
          : action.rollType === 'damage'
            ? 'damage_roll'
            : action.rollType === 'save'
              ? 'saving_throw'
              : 'skill_check';

      return {
        type: messageType,
        actor: action.actor,
        target: action.target,
        roll,
        dc,
        success,
        critical,
        action,
        description: createActionDescription(action, roll, success, critical),
      };
    },
    [],
  );

  // Get damage roll parameters for a weapon
  const getDamageRollForWeapon = (
    weapon: string,
  ): { dice: number; count: number; modifier: number } => {
    const weaponMap: Record<string, { dice: number; count: number; modifier: number }> = {
      sword: { dice: 8, count: 1, modifier: 3 },
      crossbow: { dice: 8, count: 1, modifier: 3 },
      bow: { dice: 6, count: 1, modifier: 3 },
      dagger: { dice: 4, count: 1, modifier: 3 },
      mace: { dice: 6, count: 1, modifier: 3 },
      claw: { dice: 4, count: 1, modifier: 2 },
      bite: { dice: 6, count: 1, modifier: 2 },
    };

    return weaponMap[weapon.toLowerCase()] || { dice: 6, count: 1, modifier: 2 };
  };

  // Create descriptive text for combat actions
  const createActionDescription = (
    action: DetectedCombatAction,
    roll: DiceRoll,
    success?: boolean,
    critical?: boolean,
  ): string => {
    const actor = action.actor;
    const target = action.target ? ` against ${action.target}` : '';
    const weapon = action.weapon ? ` with ${action.weapon}` : '';

    switch (action.rollType) {
      case 'attack':
        if (critical) {
          return `${actor} scores a critical hit${target}${weapon}!`;
        }
        return `${actor} ${success ? 'hits' : 'misses'}${target}${weapon}`;

      case 'damage':
        return `${actor} deals damage${target}${weapon}`;

      case 'save':
        return `${actor} makes a saving throw`;

      case 'skill':
        return `${actor} attempts a skill check`;

      default:
        return `${actor} performs ${action.action}${target}`;
    }
  };

  // Process combat events and trigger AI responses (legacy functionality)
  const processCombatEvent = useCallback(
    async (event: CombatEvent) => {
      if (!sessionId) return;

      try {
        // Limit DM narration to ROUND_START events only to reduce AI call frequency
        const shouldNarrate =
          shouldTriggerDMNarration(event, combatState.activeEncounter) &&
          event.type === 'ROUND_START';

        if (shouldNarrate) {
          // Format the message for DM agent
          const eventMessage = formatCombatEventForDM(event);

          // Send combat context to DM agent via updated edge function handler
          // This will automatically use local AIService if available
          const dmResponse = await callEdgeFunction('dm-agent-execute', {
            task: {
              id: `combat_event_${Date.now()}`,
              description: eventMessage,
              expectedOutput: 'Combat narrative response',
              context: {
                messageHistory: [], // Previous messages would go here
                playerIntent: 'combat',
                playerEmotion: 'focused',
              },
            },
            agentContext: {
              role: 'Dungeon Master',
              goal: 'Narrate combat events dramatically',
              backstory: 'An experienced DM with vast knowledge of combat storytelling',
              campaignDetails: null, // Would be populated from session context
              characterDetails: null, // Would be populated from session context
              memories: [],
            },
            combatContext: {
              detection: {
                isCombat: combatState.isInCombat,
                combatType: 'active',
                confidence: 1.0,
                shouldStartCombat: false,
                shouldEndCombat: event.type === 'COMBAT_END',
                enemies: [],
                combatActions: [],
              },
              encounter: combatState.activeEncounter,
            },
            isFirstMessage: false,
          });

          // Add DM response to messages (ChatMessage expects `text`)
          if (dmResponse?.response) {
            await addMessage({
              text: dmResponse.response,
              sender: 'dm',
              context: {
                combatData: {
                  type: 'combat_narration',
                  description: `Narration for ${event.type}`,
                },
              },
              narrationSegments: dmResponse.narrationSegments,
            });
          }
        }
      } catch (error) {
        logger.error('Error processing combat event:', error);
      }
    },
    [sessionId, characterId, campaignId, combatState, addMessage],
  );

  // Validate combat action with rules interpreter
  const validateCombatAction = useCallback(
    async (
      action: Partial<CombatAction>,
      participant: CombatParticipant,
    ): Promise<{ isValid: boolean; suggestions: string[]; errors: string[] }> => {
      try {
        const validation = await callEdgeFunction('rules-interpreter-execute', {
          task: {
            id: `combat_validation_${Date.now()}`,
            description: `Validate ${action.actionType} action for ${participant.name}`,
            expectedOutput: 'Combat action validation result',
            context: {
              ruleType: 'combat',
              data: {
                action,
                participant,
                encounter: state.activeEncounter,
              },
            },
          },
          agentContext: {
            role: 'Rules Interpreter',
            goal: 'Validate combat action according to D&D 5e rules',
            backstory: 'Expert in D&D 5e combat mechanics',
          },
        });

        return {
          isValid: validation?.isValid ?? true,
          suggestions: validation?.suggestions ?? [],
          errors: validation?.errors ?? [],
        };
      } catch (error) {
        logger.error('Error validating combat action:', error);
        return { isValid: true, suggestions: [], errors: [] };
      }
    },
    [state.activeEncounter],
  );

  // Monitor combat state changes
  useEffect(() => {
    if (!state.activeEncounter) return;

    const encounter = state.activeEncounter;

    // Check for new rounds
    if (encounter.currentRound > lastProcessedRound.current) {
      lastProcessedRound.current = encounter.currentRound;

      const roundEvent: CombatEvent = {
        type: 'ROUND_START',
        roundNumber: encounter.currentRound,
      };

      processCombatEvent(roundEvent);
    }

    // Check for new actions
    if (encounter.actions.length > 0) {
      const latestAction = encounter.actions[encounter.actions.length - 1];

      if (latestAction.id !== lastProcessedAction.current) {
        lastProcessedAction.current = latestAction.id;

        const actionEvent: CombatEvent = {
          type: 'ACTION_TAKEN',
          action: latestAction,
        };

        processCombatEvent(actionEvent);
      }
    }

    // Check for unconscious/dead participants
    encounter.participants.forEach((participant) => {
      if (participant.currentHitPoints === 0) {
        const unconsciousEvent: CombatEvent = {
          type: 'PARTICIPANT_UNCONSCIOUS',
          participantId: participant.id,
        };

        processCombatEvent(unconsciousEvent);
      }

      if (participant.deathSaves.failures >= 3) {
        const deadEvent: CombatEvent = {
          type: 'PARTICIPANT_DEAD',
          participantId: participant.id,
        };

        processCombatEvent(deadEvent);
      }
    });
  }, [state.activeEncounter, processCombatEvent]);

  return {
    validateCombatAction,
    processCombatEvent,
    processDMResponse,
    createCombatActionRoll,
    isInCombat: state.isInCombat,
    encounter: state.activeEncounter,
  };
};

// Helper functions
function shouldTriggerDMNarration(event: CombatEvent, encounter: unknown): boolean {
  const narrativeEvents = [
    'COMBAT_START',
    'COMBAT_END',
    'ROUND_START',
    'ACTION_TAKEN',
    'PARTICIPANT_UNCONSCIOUS',
    'PARTICIPANT_DEAD',
  ];

  return narrativeEvents.includes(event.type);
}

function formatCombatEventForDM(event: CombatEvent): string {
  switch (event.type) {
    case 'COMBAT_START':
      return 'Combat has begun! Describe the opening moments of battle.';

    case 'COMBAT_END':
      return 'Combat has ended. Describe the aftermath and any consequences.';

    case 'ROUND_START':
      return `A new round of combat begins (Round ${event.roundNumber}). Describe the ongoing battle.`;

    case 'ACTION_TAKEN':
      if (event.action) {
        return `${event.action.description}. Provide dramatic narration for this combat action.`;
      }
      return 'An action was taken in combat. Provide appropriate narration.';

    case 'PARTICIPANT_UNCONSCIOUS':
      return `A combatant has fallen unconscious! Describe this dramatic moment.`;

    case 'PARTICIPANT_DEAD':
      return `A combatant has died! Describe this pivotal moment in combat.`;

    default:
      return 'Something significant happened in combat. Provide appropriate narration.';
  }
}

// Enhanced combat action types for better AI integration
export const combatActionPrompts: Record<ActionType, string> = {
  attack: 'Execute an attack with your weapon or natural ability',
  cast_spell: 'Cast a spell, considering components and spell slots',
  dash: 'Move additional distance, potentially changing battlefield position',
  dodge: 'Focus on avoiding attacks and staying defensive',
  help: 'Assist an ally with their next action or ability check',
  hide: 'Attempt to conceal yourself from enemies',
  ready: 'Prepare an action to trigger on a specific condition',
  search: 'Look for hidden enemies, objects, or environmental clues',
  use_object: 'Interact with an object or piece of equipment',
  bonus_action: 'Use a class feature, spell, or ability that requires a bonus action',
  reaction: 'Respond to a trigger with an immediate action',
  death_save: 'Make a death saving throw',
  concentration_save: 'Make a concentration saving throw',
  off_hand_attack: 'Make an off-hand attack',
  grapple: 'Attempt to grapple a target',
  shove: 'Attempt to shove a target',
  short_rest: 'Take a short rest to recover resources',
  long_rest: 'Take a long rest to recover all resources',
  use_racial_trait: 'Use a racial trait ability',
  use_class_feature: 'Use a class feature ability',
  divine_smite: 'Use Divine Smite with a spell slot',
};
