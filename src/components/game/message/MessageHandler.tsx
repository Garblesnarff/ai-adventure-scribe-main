import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { useAIResponse } from '@/hooks/use-ai-response';
import { useSessionValidator } from '../session/SessionValidator';
import { parseDiceCommand } from '@/utils/diceCommandParser';
import { rollDice } from '@/utils/diceUtils';

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
  // Assuming validateSession is still relevant or adapted
  const validateSession = useSessionValidator({ sessionId, campaignId, characterId }); 

  const handleSendMessage = async (playerInput: string) => {
    if (queueStatus === 'processing') return; // Or if isProcessing from its own state

    try {
      console.log('[Memory Flow] Starting message handling for:', playerInput);

      // Validate session before proceeding (if still needed)
      const isValid = await validateSession();
      if (!isValid) return;

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
              console.error('Error processing AI response for combat after dice roll:', combatError);
            }
          }

          return; // Exit early for dice commands
        } catch (rollError) {
          console.error('Error executing dice roll:', rollError);
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
        context: {
          intent: isFirstMessage ? 'first_action' : 'query',
          isFirstMessage
        },
      };
      await sendMessage(playerMessage); // This adds to UI and saves to dialogue_history

      // Update turn count immediately after player message is sent
      await updateGameSessionState({ turn_count: newTurnCount });

      console.log('[Memory Flow] Extracting memories from player input');
      await extractMemories(playerInput); // Assuming this is non-critical path for state update
      
      // Optional: System acknowledgment (can be removed if AI response is fast)
      // const systemMessage: ChatMessage = { text: "Processing...", sender: 'system', context: { intent: 'acknowledgment' } };
      // await sendMessage(systemMessage);
      
      console.log('[Memory Flow] Getting AI response for session:', sessionId);
      // Pass necessary context to getAIResponse. It fetches its own campaign/char details if needed.
      const aiResponseMessage = await getAIResponse([...messages, playerMessage], sessionId); 
      
      await sendMessage(aiResponseMessage); // Adds AI message to UI and dialogue_history
      
      // Process AI response for combat detection and other features
      if (onAIResponse) {
        try {
          console.log('[Combat Flow] Processing AI response for combat detection');
          await onAIResponse(aiResponseMessage);
        } catch (combatError) {
          console.error('Error processing AI response for combat:', combatError);
          // Don't throw here - combat processing should not break the message flow
        }
      }
      
      // Check if we have narration segments for voice synthesis
      if (aiResponseMessage.narrationSegments && aiResponseMessage.narrationSegments.length > 0) {
        console.log('[Voice Flow] AI response contains', aiResponseMessage.narrationSegments.length, 'narration segments');
        // Note: Voice playback will be handled by MultiVoicePlayer component
        // when it detects the narrationSegments in the message
      }
      
      // Update current_scene_description with AI response
      if (aiResponseMessage.text) {
        await updateGameSessionState({ current_scene_description: aiResponseMessage.text });
        console.log('[Memory Flow] Extracting memories from AI response:', aiResponseMessage.text);
        await extractMemories(aiResponseMessage.text); // Non-critical path
      }

    } catch (error) {
      console.error('Error in message flow:', error);

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
        console.error('Failed to send system error message:', systemMessageError);
      }

      // Revert turn count if AI response failed
      try {
        await updateGameSessionState({ turn_count: turnCount });
      } catch (revertError) {
        console.error('Failed to revert turn count:', revertError);
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
