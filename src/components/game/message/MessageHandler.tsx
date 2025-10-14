import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { useAIResponse } from '@/hooks/use-ai-response';
import { useSessionValidator } from '../session/SessionValidator';
import { parseDiceCommand } from '@/utils/diceCommandParser';
import { rollDice } from '@/utils/diceUtils';
import { useCharacter } from '@/contexts/CharacterContext';
import { checkSafetyCommands, processSafetyCommand } from '@/utils/safetyCommands';
import logger from '@/lib/logger';
import { sanitizeDMText } from '@/utils/chatSanitizer';

interface MessageHandlerProps {
  sessionId: string; // Should be non-null if we reach here
  campaignId: string | null;
  characterId: string | null;
  turnCount: number;
  updateGameSessionState: (newState: Partial<any>) => Promise<void>; // Replace 'any' with ExtendedGameSession if possible
  onAIResponse?: (message: ChatMessage) => Promise<void>; // Callback for processing AI responses (e.g., combat detection)
  children: (props: {
    handleSendMessage: (message: string) => Promise<void>;
    isProcessing: boolean;
  }) => React.ReactNode;
}

export const MessageHandler: React.FC<MessageHandlerProps> = ({
  sessionId,
  campaignId,
  characterId,
  turnCount,
  updateGameSessionState,
  onAIResponse,
  children,
}) => {
  const { messages, sendMessage, queueStatus } = useMessageContext();
  const { extractMemories } = useMemoryContext();
  const { getAIResponse } = useAIResponse(); // getAIResponse returns the AI ChatMessage
  const { toast } = useToast();
  const { state: characterState } = useCharacter();
  const character = characterState.character;
  
  // Debug logging
  React.useEffect(() => {
    logger.debug('[MessageHandler] Character data:', {
      name: character?.name,
      avatar_url: character?.avatar_url,
      hasCharacter: !!character
    });
  }, [character]);
  
  // Assuming validateSession is still relevant or adapted
  const validateSession = useSessionValidator({ sessionId, campaignId, characterId }); 

  const handleSendMessage = async (playerInput: string) => {
    if (queueStatus === 'processing') return; // Or if isProcessing from its own state

    try {
      // Check if game is paused and this isn't a resume command
      const trimmedInput = playerInput.trim().toLowerCase();
      const isResumeCommand = trimmedInput === '/resume' || trimmedInput.startsWith('/resume ');
      
      // Note: We'll need to get the current session state to check if paused
      // For now, we'll assume we can check a property on the session
      // This would be enhanced to check actual session_state.is_paused
      logger.info('[Memory Flow] Starting message handling for:', playerInput);

      // Validate session before proceeding (if still needed)
      const isValid = await validateSession();
      if (!isValid) return;

      // Get current session state for context
      const currentSessionState = { is_paused: false, turn_count: turnCount }; // Would get actual session state
      
      // Check if this is a safety command
      const safetyCheck = await checkSafetyCommands(playerInput, sessionId);
      if (safetyCheck.isSafetyCommand && safetyCheck.command) {
        logger.info('🛡️ [Safety] Safety command detected:', safetyCheck.command);
        
        // Send safety command response
        let safetyResponse: ChatMessage;
        if (safetyCheck.response) {
          safetyResponse = safetyCheck.response;
          await sendMessage(safetyResponse);
        } else {
          safetyResponse = await processSafetyCommand(
            safetyCheck.command, 
            sessionId, 
            playerInput,
            undefined,
            currentSessionState
          );
          await sendMessage(safetyResponse);
        }
        
        // Store safety event in memory with high importance
        await extractMemories(`Safety command ${safetyCheck.command.type} activated: ${safetyCheck.command.context}`, {
          importance: 9, // High importance
          tags: ['safety', safetyCheck.command.type, safetyCheck.command.autoTriggered ? 'auto-triggered' : 'manual'],
          type: 'game_event',
          context_id: sessionId
        });
        
        // Handle pause/resume state changes
        if (safetyCheck.shouldPause) {
          await updateGameSessionState({ is_paused: true });
        } else if (safetyCheck.shouldResume) {
          await updateGameSessionState({ is_paused: false });
        }
        
        return; // Exit early for safety commands
      }

      // Check if this is a dice roll command
      const diceCommand = parseDiceCommand(playerInput);
      if (diceCommand) {
        if (!diceCommand.isValid) {
          // Show error for invalid dice command
          const errorMessage: ChatMessage = {
            text: diceCommand.error || 'Invalid dice command',
            sender: 'system',
            context: { intent: 'dice_command_error' }
          };
          await sendMessage(errorMessage);
          return;
        }

        // Execute the dice roll
        try {
          const rollResult = rollDice(
            diceCommand.dieType,
            diceCommand.count,
            diceCommand.modifier,
            {
              advantage: diceCommand.advantage,
              disadvantage: diceCommand.disadvantage
            }
          );

          // Create dice roll message
          const diceRollMessage: ChatMessage = {
            text: `Rolled ${diceCommand.formula}${diceCommand.label ? ` for ${diceCommand.label}` : ''}`,
            sender: 'player',
            characterName: character?.name,
            characterAvatar: character?.avatar_url,
            context: {
              intent: 'dice_roll',
              diceRoll: {
                formula: diceCommand.formula,
                count: diceCommand.count,
                dieType: diceCommand.dieType,
                modifier: diceCommand.modifier,
                advantage: diceCommand.advantage,
                disadvantage: diceCommand.disadvantage,
                results: rollResult.results,
                keptResults: rollResult.keptResults,
                total: rollResult.total,
                naturalRoll: rollResult.naturalRoll,
                critical: rollResult.critical,
                label: diceCommand.label,
                timestamp: new Date().toISOString()
              }
            }
          };

          await sendMessage(diceRollMessage);

          // Also send to AI for context (so DM knows what was rolled)
          const aiContextMessage = `Player rolled ${diceCommand.formula} and got ${rollResult.total}${diceCommand.label ? ` for ${diceCommand.label}` : ''}. ${rollResult.critical ? (rollResult.naturalRoll === 20 ? 'Critical success!' : 'Critical failure!') : ''}`;
          
          const aiResponseMessage = await getAIResponse([...messages, diceRollMessage], sessionId); 
          
          await sendMessage(aiResponseMessage);
          
          // Process AI response for combat detection
          if (onAIResponse) {
            try {
              await onAIResponse(aiResponseMessage);
            } catch (combatError) {
              logger.error('Error processing AI response for combat after dice roll:', combatError);
            }
          }

          return; // Exit early for dice commands
        } catch (rollError) {
          logger.error('Error executing dice roll:', rollError);
          const errorMessage: ChatMessage = {
            text: 'Failed to execute dice roll. Please try again.',
            sender: 'system',
            context: { intent: 'dice_roll_error' }
          };
          await sendMessage(errorMessage);
          return;
        }
      }

      const newTurnCount = turnCount + 1;
      const isFirstMessage = messages.length === 0;

      // Add player message
      const playerMessage: ChatMessage = {
        text: playerInput,
        sender: 'player',
        characterName: character?.name,
        characterAvatar: character?.avatar_url,
        context: {
          intent: isFirstMessage ? 'first_action' : 'query',
          isFirstMessage
        },
      };
      await sendMessage(playerMessage); // This adds to UI and saves to dialogue_history

      // Update turn count immediately after player message is sent
      await updateGameSessionState({ turn_count: newTurnCount });

      logger.info('[Memory Flow] Extracting memories from player input');
      await extractMemories(playerInput); // Assuming this is non-critical path for state update
      
      // Optional: System acknowledgment (can be removed if AI response is fast)
      // const systemMessage: ChatMessage = { text: "Processing...", sender: 'system', context: { intent: 'acknowledgment' } };
      // await sendMessage(systemMessage);
      
      logger.info('[Memory Flow] Getting AI response for session:', sessionId);
      // Pass necessary context to getAIResponse. It fetches its own campaign/char details if needed.
      const aiResponseMessage = await getAIResponse([...messages, playerMessage], sessionId); 
      const sanitizedAiResponseMessage: ChatMessage = {
        ...aiResponseMessage,
        text: sanitizeDMText(aiResponseMessage.text)
      };
      
      // Check for auto-triggered safety commands in AI response
      const autoSafetyCheck = await checkSafetyCommands(playerInput, sessionId, sanitizedAiResponseMessage.text);
      if (autoSafetyCheck.isSafetyCommand && autoSafetyCheck.command) {
        logger.info('🛡️ [Safety] Auto-triggered safety command detected:', autoSafetyCheck.command);
        
        // Send safety command response instead of AI response
        let safetyResponse: ChatMessage;
        if (autoSafetyCheck.response) {
          safetyResponse = autoSafetyCheck.response;
          await sendMessage(safetyResponse);
        } else {
          safetyResponse = await processSafetyCommand(
            autoSafetyCheck.command,
            sessionId,
            playerInput,
            sanitizedAiResponseMessage.text,
            currentSessionState
          );
          await sendMessage(safetyResponse);
        }
        
        // Store safety event in memory with high importance
        await extractMemories(`Auto-triggered safety command ${autoSafetyCheck.command.type}: ${autoSafetyCheck.command.context}`, {
          importance: 8, // High but slightly lower than manual
          tags: ['safety', autoSafetyCheck.command.type, 'auto-triggered', 'ai-response'],
          type: 'game_event',
          context_id: sessionId
        });
        
        // Handle pause state
        if (autoSafetyCheck.shouldPause) {
          await updateGameSessionState({ is_paused: true });
        }
        
        return; // Exit early for auto-triggered safety commands
      }
      
      await sendMessage(sanitizedAiResponseMessage); // Adds AI message to UI and dialogue_history
      
      // Process AI response for combat detection and other features
      if (onAIResponse) {
        try {
          logger.info('[Combat Flow] Processing AI response for combat detection');
          await onAIResponse(sanitizedAiResponseMessage);
        } catch (combatError) {
          logger.error('Error processing AI response for combat:', combatError);
          // Don't throw here - combat processing should not break the message flow
        }
      }
      
      // Check if we have narration segments for voice synthesis
      if (sanitizedAiResponseMessage.narrationSegments && sanitizedAiResponseMessage.narrationSegments.length > 0) {
        logger.info('[Voice Flow] AI response contains', sanitizedAiResponseMessage.narrationSegments.length, 'narration segments');
        // Note: Voice playback will be handled by MultiVoicePlayer component
        // when it detects the narrationSegments in the message
      }
      
      // Update current_scene_description with AI response
      if (sanitizedAiResponseMessage.text) {
        await updateGameSessionState({ current_scene_description: sanitizedAiResponseMessage.text });
        logger.info('[Memory Flow] Extracting memories from AI response:', sanitizedAiResponseMessage.text);
        await extractMemories(sanitizedAiResponseMessage.text); // Non-critical path
      }

    } catch (error) {
      logger.error('Error in message flow:', error);

      // Provide user feedback and recovery options
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Add a system error message to the conversation
      try {
        const systemErrorMessage: ChatMessage = {
          text: "I encountered an issue processing your message. Let me try again, or you can rephrase your action if needed.",
          sender: 'system',
          context: {
            intent: 'error_recovery',
            originalError: errorMessage
          }
        };
        await sendMessage(systemErrorMessage);
      } catch (systemMessageError) {
        logger.error('Failed to send system error message:', systemMessageError);
      }

      // Revert turn count if AI response failed
      try {
        await updateGameSessionState({ turn_count: turnCount });
      } catch (revertError) {
        logger.error('Failed to revert turn count:', revertError);
      }

      toast({
        title: "Processing Error",
        description: "I had trouble responding to your message. The conversation has been restored and you can try again.",
        variant: "destructive",
      });
    }
  };

  return children({
    handleSendMessage,
    isProcessing: queueStatus === 'processing',
  });
};
