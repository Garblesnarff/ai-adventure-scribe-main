/**
 * Combat AI Integration Hook
 * 
 * Bridges combat system with AI agents for seamless D&D experience.
 * Handles combat event notifications, AI responses, and rule validations.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCombat } from '@/contexts/CombatContext';
import { useMessages } from '@/hooks/use-messages';
import { callEdgeFunction } from '@/utils/edgeFunctionHandler';
import { 
  CombatEvent, 
  CombatAction, 
  CombatParticipant,
  ActionType 
} from '@/types/combat';

interface CombatAIIntegrationProps {
  sessionId?: string;
  characterId?: string;
  campaignId?: string;
}

export const useCombatAIIntegration = ({
  sessionId,
  characterId,
  campaignId
}: CombatAIIntegrationProps) => {
  const { state: combatState } = useCombat();
  const { addMessage } = useMessages();
  const lastProcessedAction = useRef<string | null>(null);
  const lastProcessedRound = useRef<number>(0);

  // Process combat events and trigger AI responses
  const processCombatEvent = useCallback(async (event: CombatEvent) => {
    if (!sessionId) return;

    try {
      // Determine if we should trigger DM narration
      const shouldNarrate = shouldTriggerDMNarration(event, combatState.activeEncounter);

      if (shouldNarrate) {
        // Send combat context to DM agent
        const dmResponse = await callEdgeFunction('dm-agent-execute', {
          message: formatCombatEventForDM(event),
          sessionId,
          characterId,
          campaignId,
          gameState: {
            combat: {
              isInCombat: combatState.isInCombat,
              activeEncounter: combatState.activeEncounter
            }
          }
        });

        // Add DM response to messages
        if (dmResponse?.text) {
          await addMessage({
            content: dmResponse.text,
            sender: 'dm',
            type: 'narration',
            sessionId: sessionId,
            metadata: {
              combatEvent: event.type,
              voiceSegments: dmResponse.narration_segments
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing combat event:', error);
    }
  }, [sessionId, characterId, campaignId, combatState, addMessage]);

  // Validate combat action with rules interpreter
  const validateCombatAction = useCallback(async (
    action: Partial<CombatAction>,
    participant: CombatParticipant
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
              encounter: combatState.activeEncounter
            }
          }
        },
        agentContext: {
          role: 'Rules Interpreter',
          goal: 'Validate combat action according to D&D 5e rules',
          backstory: 'Expert in D&D 5e combat mechanics'
        }
      });

      return {
        isValid: validation?.isValid ?? true,
        suggestions: validation?.suggestions ?? [],
        errors: validation?.errors ?? []
      };
    } catch (error) {
      console.error('Error validating combat action:', error);
      return { isValid: true, suggestions: [], errors: [] };
    }
  }, [combatState.activeEncounter]);

  // Monitor combat state changes
  useEffect(() => {
    if (!combatState.activeEncounter) return;

    const encounter = combatState.activeEncounter;

    // Check for new rounds
    if (encounter.currentRound > lastProcessedRound.current) {
      lastProcessedRound.current = encounter.currentRound;
      
      const roundEvent: CombatEvent = {
        type: 'ROUND_START',
        roundNumber: encounter.currentRound
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
          action: latestAction
        };
        
        processCombatEvent(actionEvent);
      }
    }

    // Check for unconscious/dead participants
    encounter.participants.forEach(participant => {
      if (participant.currentHitPoints === 0) {
        const unconsciousEvent: CombatEvent = {
          type: 'PARTICIPANT_UNCONSCIOUS',
          participantId: participant.id
        };
        
        processCombatEvent(unconsciousEvent);
      }
      
      if (participant.deathSaves.failures >= 3) {
        const deadEvent: CombatEvent = {
          type: 'PARTICIPANT_DEAD',
          participantId: participant.id
        };
        
        processCombatEvent(deadEvent);
      }
    });

  }, [combatState.activeEncounter, processCombatEvent]);

  return {
    validateCombatAction,
    processCombatEvent
  };
};

// Helper functions
function shouldTriggerDMNarration(event: CombatEvent, encounter: any): boolean {
  const narrativeEvents = [
    'COMBAT_START',
    'COMBAT_END',
    'ROUND_START',
    'ACTION_TAKEN',
    'PARTICIPANT_UNCONSCIOUS',
    'PARTICIPANT_DEAD'
  ];
  
  return narrativeEvents.includes(event.type);
}

function formatCombatEventForDM(event: CombatEvent): string {
  switch (event.type) {
    case 'COMBAT_START':
      return "Combat has begun! Describe the opening moments of battle.";
    
    case 'COMBAT_END':
      return "Combat has ended. Describe the aftermath and any consequences.";
    
    case 'ROUND_START':
      return `A new round of combat begins (Round ${event.roundNumber}). Describe the ongoing battle.`;
    
    case 'ACTION_TAKEN':
      if (event.action) {
        return `${event.action.description}. Provide dramatic narration for this combat action.`;
      }
      return "An action was taken in combat. Provide appropriate narration.";
    
    case 'PARTICIPANT_UNCONSCIOUS':
      return `A combatant has fallen unconscious! Describe this dramatic moment.`;
    
    case 'PARTICIPANT_DEAD':
      return `A combatant has died! Describe this pivotal moment in combat.`;
    
    default:
      return "Something significant happened in combat. Provide appropriate narration.";
  }
}

// Enhanced combat action types for better AI integration
export const combatActionPrompts: Record<ActionType, string> = {
  attack: "Execute an attack with your weapon or natural ability",
  cast_spell: "Cast a spell, considering components and spell slots",
  dash: "Move additional distance, potentially changing battlefield position",
  dodge: "Focus on avoiding attacks and staying defensive",
  help: "Assist an ally with their next action or ability check",
  hide: "Attempt to conceal yourself from enemies",
  ready: "Prepare an action to trigger on a specific condition",
  search: "Look for hidden enemies, objects, or environmental clues",
  use_object: "Interact with an object or piece of equipment",
  bonus_action: "Use a class feature, spell, or ability that requires a bonus action",
  reaction: "Respond to a trigger with an immediate action"
};