import React from 'react';

import { useSessionValidator } from '../session/SessionValidator';

import type { ChatMessage } from '@/types/game';

import { useCharacter } from '@/contexts/CharacterContext';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { useMessageContext } from '@/contexts/MessageContext';
import { useAIResponse } from '@/hooks/use-ai-response';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { sanitizeDMText } from '@/utils/chatSanitizer';
import { parseDiceCommand } from '@/utils/diceCommandParser';
import { rollDice } from '@/utils/diceUtils';
import { handleAsyncError } from '@/utils/error-handler';
import { checkSafetyCommands, processSafetyCommand } from '@/utils/safetyCommands';

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
  const headerMode = String(
    (import.meta as any)?.env?.VITE_SCENE_SUMMARY_HEADER ?? 'short',
  ).toLowerCase();

  // Refs to track current values for async operations
  const turnCountRef = React.useRef(turnCount);
  const messagesRef = React.useRef(messages);

  // Request queue to prevent concurrent message sends
  const sendQueueRef = React.useRef<
    Array<{
      message: string;
      resolve: (value: void | PromiseLike<void>) => void;
      reject: (error: any) => void;
    }>
  >([]);
  const isSendingRef = React.useRef(false);

  // Update refs when values change
  React.useEffect(() => {
    turnCountRef.current = turnCount;
  }, [turnCount]);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const toHeaderExcerpt = React.useCallback((raw: string, limit = 220) => {
    if (!raw) return '';
    const cleaned = raw
      .replace(/^VISUAL\s+PROMPT:.*$/gim, '')
      .replace(/^\s*[A-F]\.\s.*$/gim, '')
      .replace(/\*\*|__|`/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    let out = sentences.slice(0, 2).join(' ');
    if (out.length > limit) {
      out = out.slice(0, limit).replace(/[ ,;:]+\S*$/, '') + '…';
    }
    return out;
  }, []);

  // Debug logging
  React.useEffect(() => {
    logger.debug('[MessageHandler] Character data:', {
      name: character?.name,
      avatar_url: character?.avatar_url,
      hasCharacter: !!character,
    });
  }, [character]);

  // Assuming validateSession is still relevant or adapted
  const validateSession = useSessionValidator({ sessionId, campaignId, characterId });

  // Process the send queue one message at a time
  const processSendQueue = React.useCallback(async () => {
    // Don't process if already sending or queue is empty
    if (isSendingRef.current || sendQueueRef.current.length === 0) {
      return;
    }

    isSendingRef.current = true;
    const { message: playerInput, resolve, reject } = sendQueueRef.current[0];

    try {
      await actualSendMessage(playerInput);
      resolve();
    } catch (error) {
      reject(error);
    } finally {
      // Remove processed item and continue with next
      sendQueueRef.current.shift();
      isSendingRef.current = false;

      // Process next item if any
      if (sendQueueRef.current.length > 0) {
        // Recursively process next message
        processSendQueue();
      }
    }
  }, []); // actualSendMessage uses refs so no deps needed

  // The actual message sending logic (extracted from handleSendMessage)
  const actualSendMessage = async (playerInput: string) => {
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
            currentSessionState,
          );
          await sendMessage(safetyResponse);
        }

        // Store safety event in memory with high importance
        await extractMemories(
          `Safety command ${safetyCheck.command.type} activated: ${safetyCheck.command.context}`,
          {
            importance: 9, // High importance
            tags: [
              'safety',
              safetyCheck.command.type,
              safetyCheck.command.autoTriggered ? 'auto-triggered' : 'manual',
            ],
            type: 'game_event',
            context_id: sessionId,
          },
        );

        // Handle pause/resume state changes
        if (safetyCheck.shouldPause) {
          await updateGameSessionState((prev) => ({ ...prev, is_paused: true }));
        } else if (safetyCheck.shouldResume) {
          await updateGameSessionState((prev) => ({ ...prev, is_paused: false }));
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
            context: { intent: 'dice_command_error' },
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
              disadvantage: diceCommand.disadvantage,
            },
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
                timestamp: new Date().toISOString(),
              },
            },
          };

          await sendMessage(diceRollMessage);

          // Also send to AI for context (so DM knows what was rolled)
          const aiContextMessage = `Player rolled ${diceCommand.formula} and got ${rollResult.total}${diceCommand.label ? ` for ${diceCommand.label}` : ''}. ${rollResult.critical ? (rollResult.naturalRoll === 20 ? 'Critical success!' : 'Critical failure!') : ''}`;

          const aiResponseMessage = await getAIResponse(
            [...messagesRef.current, diceRollMessage],
            sessionId,
            turnCountRef.current,
          );

          await sendMessage(aiResponseMessage);

          // Process AI response for combat detection
          if (onAIResponse) {
            try {
              await onAIResponse(aiResponseMessage);
            } catch (combatError) {
              handleAsyncError(combatError, {
                userMessage: 'Failed to process combat response after dice roll',
                logLevel: 'warn',
                showToast: false,
                context: { location: 'MessageHandler.diceRoll.combatDetection' },
              });
            }
          }

          return; // Exit early for dice commands
        } catch (rollError) {
          handleAsyncError(rollError, {
            userMessage: 'Failed to execute dice roll',
            context: { location: 'MessageHandler.diceCommand', command: playerInput },
          });
          const errorMessage: ChatMessage = {
            text: 'Failed to execute dice roll. Please try again.',
            sender: 'system',
            context: { intent: 'dice_roll_error' },
          };
          await sendMessage(errorMessage);
          return;
        }
      }

      // Use ref to get current turn count to avoid stale closure
      const currentTurnCount = turnCountRef.current;
      const newTurnCount = currentTurnCount + 1;
      const currentMessages = messagesRef.current;
      const isFirstMessage = currentMessages.length === 0;

      // Add player message
      const playerMessage: ChatMessage = {
        text: playerInput,
        sender: 'player',
        characterName: character?.name,
        characterAvatar: character?.avatar_url,
        context: {
          intent: isFirstMessage ? 'first_action' : 'query',
          isFirstMessage,
        },
      };
      await sendMessage(playerMessage); // This adds to UI and saves to dialogue_history

      // Update turn count immediately after player message is sent using functional form
      await updateGameSessionState((prev) => ({
        ...prev,
        turn_count: (prev.turn_count || 0) + 1,
      }));

      // Update the ref to reflect the new turn count
      turnCountRef.current = newTurnCount;

      logger.info('[Memory Flow] Extracting memories from player input');
      await extractMemories(playerInput); // Assuming this is non-critical path for state update

      // Optional: System acknowledgment (can be removed if AI response is fast)
      // const systemMessage: ChatMessage = { text: "Processing...", sender: 'system', context: { intent: 'acknowledgment' } };
      // await sendMessage(systemMessage);

      logger.info('[Memory Flow] Getting AI response for session:', sessionId);
      // Pass necessary context to getAIResponse. It fetches its own campaign/char details if needed.
      // Use ref to get current messages to avoid stale closure
      const aiResponseMessage = await getAIResponse(
        [...messagesRef.current, playerMessage],
        sessionId,
        turnCountRef.current,
      );
      const sanitizedAiResponseMessage: ChatMessage = {
        ...aiResponseMessage,
        text: sanitizeDMText(aiResponseMessage.text),
      };

      // Check for auto-triggered safety commands in AI response
      const autoSafetyCheck = await checkSafetyCommands(
        playerInput,
        sessionId,
        sanitizedAiResponseMessage.text,
      );
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
            currentSessionState,
          );
          await sendMessage(safetyResponse);
        }

        // Store safety event in memory with high importance
        await extractMemories(
          `Auto-triggered safety command ${autoSafetyCheck.command.type}: ${autoSafetyCheck.command.context}`,
          {
            importance: 8, // High but slightly lower than manual
            tags: ['safety', autoSafetyCheck.command.type, 'auto-triggered', 'ai-response'],
            type: 'game_event',
            context_id: sessionId,
          },
        );

        // Handle pause state
        if (autoSafetyCheck.shouldPause) {
          await updateGameSessionState((prev) => ({ ...prev, is_paused: true }));
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
          handleAsyncError(combatError, {
            userMessage: 'Failed to process combat response',
            logLevel: 'warn',
            showToast: false,
            context: { location: 'MessageHandler.onAIResponse.combatDetection' },
          });
          // Don't throw here - combat processing should not break the message flow
        }
      }

      // Check if we have narration segments for voice synthesis
      if (
        sanitizedAiResponseMessage.narrationSegments &&
        sanitizedAiResponseMessage.narrationSegments.length > 0
      ) {
        logger.info(
          '[Voice Flow] AI response contains',
          sanitizedAiResponseMessage.narrationSegments.length,
          'narration segments',
        );
        // Note: Voice playback will be handled by MultiVoicePlayer component
        // when it detects the narrationSegments in the message
      }

      // Update current_scene_description with short blurb (not full reply)
      if (sanitizedAiResponseMessage.text) {
        const blurb = headerMode === 'off' ? '' : toHeaderExcerpt(sanitizedAiResponseMessage.text);
        await updateGameSessionState((prev) => ({
          ...prev,
          current_scene_description: blurb,
        }));
        logger.info(
          '[Memory Flow] Extracting memories from AI response:',
          sanitizedAiResponseMessage.text,
        );
        await extractMemories(sanitizedAiResponseMessage.text); // Non-critical path
      }
    } catch (error) {
      handleAsyncError(error, {
        userMessage: 'Failed to process your message',
        context: {
          location: 'MessageHandler.actualSendMessage',
          playerInput,
          turnCount: turnCountRef.current,
        },
      });

      // Provide user feedback and recovery options
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Add a system error message to the conversation
      try {
        const systemErrorMessage: ChatMessage = {
          text: 'I encountered an issue processing your message. Let me try again, or you can rephrase your action if needed.',
          sender: 'system',
          context: {
            intent: 'error_recovery',
            originalError: errorMessage,
          },
        };
        await sendMessage(systemErrorMessage);
      } catch (systemMessageError) {
        handleAsyncError(systemMessageError, {
          userMessage: 'Failed to send error recovery message',
          logLevel: 'warn',
          showToast: false,
          context: { location: 'MessageHandler.errorRecovery' },
        });
      }

      // Revert turn count if AI response failed (use original value from when error occurred)
      try {
        const revertCount = Math.max(0, turnCountRef.current - 1);
        await updateGameSessionState((prev) => ({
          ...prev,
          turn_count: Math.max(0, (prev.turn_count || 0) - 1),
        }));
        turnCountRef.current = revertCount;
      } catch (revertError) {
        handleAsyncError(revertError, {
          userMessage: 'Failed to revert turn count',
          logLevel: 'warn',
          showToast: false,
          context: { location: 'MessageHandler.revertTurnCount' },
        });
      }

      toast({
        title: 'Processing Error',
        description:
          'I had trouble responding to your message. The conversation has been restored and you can try again.',
        variant: 'destructive',
      });
    }
  };

  // Public handleSendMessage that queues messages
  const handleSendMessage = React.useCallback(
    async (playerInput: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        // Add to queue
        sendQueueRef.current.push({
          message: playerInput,
          resolve,
          reject,
        });

        // Start processing if not already processing
        processSendQueue();
      });
    },
    [processSendQueue],
  );

  return children({
    handleSendMessage,
    isProcessing: queueStatus === 'processing' || isSendingRef.current,
  });
};
