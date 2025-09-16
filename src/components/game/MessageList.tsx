import React, { useMemo } from 'react';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { CombatMessage, InitiativeMessage, CombatSummaryMessage } from '@/components/combat/CombatMessage';
import { DiceRollMessage } from '@/components/game/DiceRollMessage';
import { DiceRollRequest } from '@/components/game/DiceRollRequest';
import { DMMessageVoiceControls } from '@/components/game/voice/DMMessageVoiceControls';
import { ActionOptions } from '@/components/game/ActionOptions';
import { parseMessageOptions, createPlayerMessageFromOption } from '@/utils/parseMessageOptions';
import { parseRollRequests, removeRollRequestsFromMessage } from '@/utils/rollRequestParser';
import { rollDice } from '@/utils/diceUtils';

interface MessageListProps {
  onSendFullMessage?: (message: string) => Promise<void>;
}

/**
 * MessageList Component
 * Displays a list of chat messages with styling based on sender type
 */
export const MessageList: React.FC<MessageListProps> = ({ onSendFullMessage }) => {
  const { messages = [], sendMessage } = useMessageContext();

  // Handle option selection
  const handleOptionSelect = React.useCallback(async (optionText: string) => {
    console.log('[MessageList] Handling option selection:', optionText);

    try {
      if (onSendFullMessage) {
        // Use the full message flow (includes AI response)
        console.log('[MessageList] Using full message flow for option selection');
        await onSendFullMessage(optionText);
      } else {
        // Fallback to basic message sending (no AI response)
        console.log('[MessageList] Using fallback message flow for option selection');
        const playerMessage: ChatMessage = {
          text: optionText,
          sender: 'player',
          timestamp: new Date().toISOString()
        };

        console.log('[MessageList] Created player message:', playerMessage);
        await sendMessage(playerMessage);
      }
      console.log('[MessageList] Successfully sent option message');
    } catch (error) {
      console.error('[MessageList] Failed to send option selection:', error);
    }
  }, [onSendFullMessage, sendMessage]);

  // Handle dice roll requests
  const handleDiceRoll = React.useCallback(async (formula: string, advantage?: boolean, disadvantage?: boolean) => {
    console.log('[MessageList] Handling dice roll:', { formula, advantage, disadvantage });

    try {
      // Parse the formula to extract die type, count, and modifier
      const diceMatch = formula.match(/(\d+)d(\d+)([+\-]\d+)?/);
      if (!diceMatch) {
        console.error('[MessageList] Invalid dice formula:', formula);
        return;
      }

      const count = parseInt(diceMatch[1]);
      const dieType = parseInt(diceMatch[2]);
      const modifierMatch = diceMatch[3];
      const modifier = modifierMatch ? parseInt(modifierMatch) : 0;

      // Roll the dice
      const rollResult = rollDice(dieType, count, modifier, {
        advantage: advantage || false,
        disadvantage: disadvantage || false
      });

      // Create dice roll message
      const diceRollMessage: ChatMessage = {
        text: `Rolled ${formula}${advantage ? ' with advantage' : disadvantage ? ' with disadvantage' : ''}`,
        sender: 'player',
        timestamp: new Date().toISOString(),
        context: {
          intent: 'dice_roll',
          diceRoll: {
            formula,
            count,
            dieType,
            modifier,
            advantage: advantage || false,
            disadvantage: disadvantage || false,
            results: rollResult.results,
            keptResults: rollResult.keptResults,
            total: rollResult.total,
            naturalRoll: rollResult.naturalRoll,
            critical: rollResult.critical,
            timestamp: new Date().toISOString()
          }
        }
      };

      await sendMessage(diceRollMessage);

      // Send the result to the DM if we have the full message flow
      if (onSendFullMessage) {
        const resultMessage = `I rolled ${rollResult.total} (${formula}${advantage ? ' with advantage' : disadvantage ? ' with disadvantage' : ''})${rollResult.critical ? rollResult.naturalRoll === 20 ? ' - Critical success!' : ' - Critical failure!' : ''}`;
        await onSendFullMessage(resultMessage);
      }
    } catch (error) {
      console.error('[MessageList] Failed to handle dice roll:', error);
    }
  }, [sendMessage, onSendFullMessage]);

  // Handle manual dice result input
  const handleManualResult = React.useCallback(async (result: number) => {
    console.log('[MessageList] Handling manual dice result:', result);

    try {
      const playerMessage: ChatMessage = {
        text: `I rolled ${result}`,
        sender: 'player',
        timestamp: new Date().toISOString()
      };

      await sendMessage(playerMessage);

      // Send to DM if we have the full message flow
      if (onSendFullMessage) {
        await onSendFullMessage(`I rolled ${result}`);
      }
    } catch (error) {
      console.error('[MessageList] Failed to handle manual dice result:', error);
    }
  }, [sendMessage, onSendFullMessage]);

  return (
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 chat-scroll parchment-panel">
      {messages?.map((message, index) => {
        const isPlayer = message.sender === 'player';
        const isDM = message.sender === 'dm';
        const isSystem = message.sender === 'system';

        // Check if next message is from same sender for grouping
        const nextMessage = messages[index + 1];
        const isGrouped = nextMessage && nextMessage.sender === message.sender;

        // Parse DM message options
        const parsedMessage = isDM ? parseMessageOptions(message.text) : null;
        
        // Get roll requests - prefer structured over parsed
        const structuredRollRequests = isDM && message.rollRequests ? message.rollRequests : [];
        const parsedRollRequests = isDM && structuredRollRequests.length === 0 ? parseRollRequests(message.text) : [];
        const rollRequests = structuredRollRequests.length > 0 ? 
          structuredRollRequests.map(req => ({
            ...req,
            originalText: '',
            confidence: 1.0
          })) : 
          parsedRollRequests;
        const hasRollRequests = rollRequests.length > 0;

        return (
          <div key={message.id || message.timestamp} className={`flex ${isPlayer ? 'justify-end' : 'justify-start'} group`}>
            <div className={`flex max-w-[85%] ${isPlayer ? 'flex-row-reverse' : 'flex-row'} items-start`}>
              {!isPlayer && (
                <div className="flex-shrink-0 mr-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium avatar-dm`} aria-hidden>
                    DM
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'} space-y-1`}> 
                {/* Check if this is a dice roll message */}
                {message.context?.diceRoll ? (
                  <div className="w-full">
                    <DiceRollMessage 
                      data={message.context.diceRoll}
                      playerName={isPlayer ? 'You' : message.sender}
                    />
                  </div>
                ) : message.context?.combatData ? (
                  <div className="w-full">
                    {/* Handle different combat message types */}
                    {message.context.combatData.type === 'initiative' ? (
                      <InitiativeMessage 
                        participants={message.context.combatData.participants || []}
                        timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                      />
                    ) : message.context.combatData.summary ? (
                      <CombatSummaryMessage 
                        summary={message.context.combatData.summary}
                        timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                      />
                    ) : (
                      <CombatMessage 
                        data={message.context.combatData}
                        timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                      />
                    )}
                  </div>
                ) : (
                  /* Regular message bubble */
                  <div className={`relative px-5 py-4 rounded-xl transition-all duration-200 message-bubble ${
                      isDM ? 'dm-bubble' : isSystem ? 'system-bubble' : 'player-bubble'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        let displayText = parsedMessage ? parsedMessage.content || message.text : message.text;
                        // Remove roll request text for cleaner display if we have roll requests
                        if (hasRollRequests) {
                          displayText = removeRollRequestsFromMessage(displayText);
                        }
                        return displayText;
                      })()}
                    </p>

                    {message.context && (
                      <div className="mt-3 pt-3 border-t border-opacity-10 space-y-2 message-meta">
                        {message.context.emotion && (
                          <div className="flex items-center text-xs opacity-80">
                            <span className="font-medium mr-2">🎭</span>
                            <span>{message.context.emotion}</span>
                          </div>
                        )}
                        {message.context.location && (
                          <div className="flex items-center text-xs opacity-80">
                            <span className="font-medium mr-2">📍</span>
                            <span>{message.context.location}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voice Controls for DM messages */}
                    {isDM && (
                      <div className="absolute bottom-2 right-3">
                        <DMMessageVoiceControls
                          messageId={message.id || `${message.timestamp}-${index}`}
                          messageText={parsedMessage ? parsedMessage.content : message.text}
                          narrationSegments={message.narrationSegments}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Action Options for DM messages */}
                {isDM && parsedMessage && parsedMessage.hasOptions && (
                  <div className="w-full max-w-md mt-3">
                    <ActionOptions
                      options={parsedMessage.options}
                      onOptionSelect={(option) => {
                        const playerMessage = createPlayerMessageFromOption(option);
                        handleOptionSelect(playerMessage);
                      }}
                      delay={10000} // 10 second delay
                    />
                  </div>
                )}

                {/* Dice Roll Requests for DM messages */}
                {isDM && hasRollRequests && (
                  <div className="w-full max-w-md mt-3 space-y-3">
                    {rollRequests.map((request, reqIndex) => (
                      <DiceRollRequest
                        key={`${message.id || message.timestamp}-roll-${reqIndex}`}
                        request={{
                          type: request.type,
                          formula: request.formula,
                          purpose: request.purpose,
                          dc: request.dc,
                          ac: request.ac,
                          advantage: request.advantage,
                          disadvantage: request.disadvantage
                        }}
                        onRoll={handleDiceRoll}
                        onManualResult={handleManualResult}
                      />
                    ))}
                  </div>
                )}

                <div className={`text-xs message-meta px-2 ${isPlayer ? 'text-right' : 'text-left'}`}>
                  {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading state - shows while initial greeting is being generated */}
      {messages?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-infinite-purple to-infinite-teal rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-2xl">🎭</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce"></div>
            </div>
            <h3 className="text-lg font-medium text-card-foreground">Your adventure awaits...</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              The Dungeon Master is crafting your opening scene and preparing your world.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
