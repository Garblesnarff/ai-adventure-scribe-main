import React, { useMemo, useState } from 'react';
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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Group consecutive messages from the same sender
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];

    const groups: { sender: string; messages: ChatMessage[]; isPlayer: boolean }[] = [];
    let currentGroup = { sender: messages[0].sender, messages: [messages[0]], isPlayer: messages[0].sender === 'player' };

    for (let i = 1; i < messages.length; i++) {
      const message = messages[i];
      if (message.sender === currentGroup.sender) {
        currentGroup.messages.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = { sender: message.sender, messages: [message], isPlayer: message.sender === 'player' };
      }
    }
    groups.push(currentGroup);
    return groups;
  }, [messages]);

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

      console.log('[MessageList] Roll result:', rollResult);
      console.log('[MessageList] Roll result.total type:', typeof rollResult.total, rollResult.total);

      // Create dice roll message
      const diceRollMessage: ChatMessage = {
        text: `Rolled ${formula}${advantage ? ' with advantage' : disadvantage ? ' with disadvantage' : ''} = ${rollResult.total}`,
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

      // Send the dice roll message
      await sendMessage(diceRollMessage);

      // NOTE: DM will get information from the dice roll message context above
      // Don't send a second text message to avoid duplicates
    } catch (error) {
      console.error('[MessageList] Failed to handle dice roll:', error);
    }
  }, [sendMessage, onSendFullMessage]);

  // Handle manual dice result input
  const handleManualResult = React.useCallback(async (result: number) => {
    console.log('[MessageList] Handling manual dice result:', result);

    try {
      // Send to DM through the full message flow
      if (onSendFullMessage) {
        await onSendFullMessage(`I rolled ${result}`);
      } else {
        // Fallback to direct message if no full message flow available
        const playerMessage: ChatMessage = {
          text: `I rolled ${result}`,
          sender: 'player',
          timestamp: new Date().toISOString()
        };
        await sendMessage(playerMessage);
      }
    } catch (error) {
      console.error('[MessageList] Failed to handle manual dice result:', error);
    }
  }, [sendMessage, onSendFullMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-scroll parchment-panel">
      {groupedMessages.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className={`flex ${group.isPlayer ? 'justify-end' : 'justify-start'} group`}>
          <div className={`flex max-w-[90%] ${group.isPlayer ? 'flex-row-reverse' : 'flex-row'} items-start`}>
            {/* Avatar only for first message in group */}
            {!group.isPlayer && (
              <div className="flex-shrink-0 mr-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground" aria-hidden>
                  DM
                </div>
              </div>
            )}

            <div className={`flex flex-col ${group.isPlayer ? 'items-end' : 'items-start'} space-y-2 w-full`}>
              {group.messages.map((message, msgIndex) => {
                const isFirstInGroup = msgIndex === 0;
                const isLastInGroup = msgIndex === group.messages.length - 1;
                const isDM = message.sender === 'dm';
                const messageId = message.id || message.timestamp || `${groupIndex}-${msgIndex}`;

                // Parse for this message
                const parsedMessage = isDM ? parseMessageOptions(message.text) : null;
                const structuredRollRequests = isDM && message.rollRequests ? message.rollRequests : [];
                const parsedRollRequests = isDM && structuredRollRequests.length === 0 ? parseRollRequests(message.text) : [];
                const rollRequests = structuredRollRequests.length > 0 ? 
                  structuredRollRequests.map(req => ({ ...req, originalText: '', confidence: 1.0 })) : 
                  parsedRollRequests;
                const hasRollRequests = rollRequests.length > 0;

                // Truncation logic
                const isLongMessage = message.text.length > 200;
                const isExpanded = expandedMessages.has(messageId);
                const displayText = isLongMessage && !isExpanded 
                  ? `${message.text.substring(0, 200)}... ` 
                  : message.text;

                const toggleExpanded = () => {
                  setExpandedMessages(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(messageId)) {
                      newSet.delete(messageId);
                    } else {
                      newSet.add(messageId);
                    }
                    return newSet;
                  });
                };

                return (
                  <div key={messageId} className={`w-full ${isFirstInGroup ? '' : 'mt-1'}`}>
                    {/* Special message types */}
                    {message.context?.diceRoll ? (
                      <div className="w-full">
                        <DiceRollMessage 
                          data={message.context.diceRoll}
                          playerName={group.isPlayer ? 'You' : 'DM'}
                        />
                      </div>
                    ) : message.context?.combatData ? (
                      <div className="w-full">
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
                      /* Regular message bubble - only first/last have full styling */
                      <div className={`relative px-4 py-3 rounded-xl transition-all duration-200 message-bubble ${
                        isDM 
                          ? 'dm-bubble border-l-4 border-l-primary/20' 
                          : group.isPlayer 
                            ? 'player-bubble ml-auto' 
                            : 'system-bubble'
                      } ${isFirstInGroup ? 'rounded-t-xl pt-4' : ''} ${isLastInGroup ? 'rounded-b-xl pb-4' : 'border-b border-border/20'}`}>
                        {/* Message content */}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {(() => {
                            let content = parsedMessage ? parsedMessage.content || message.text : message.text;
                            if (hasRollRequests) {
                              content = removeRollRequestsFromMessage(content);
                            }
                            return content;
                          })()}
                        </div>

                        {/* Truncation expander */}
                        {isLongMessage && (
                          <button
                            onClick={toggleExpanded}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            {isExpanded ? 'Read less' : 'Read more'}
                          </button>
                        )}

                        {/* Metadata - only show on first message */}
                        {isFirstInGroup && message.context && (
                          <div className="mt-2 pt-2 border-t border-border/20 space-y-1 text-xs opacity-80">
                            {message.context.emotion && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">🎭</span>
                                <span>{message.context.emotion}</span>
                              </div>
                            )}
                            {message.context.location && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">📍</span>
                                <span>{message.context.location}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Voice Controls - only on last DM message */}
                        {isDM && isLastInGroup && (
                          <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DMMessageVoiceControls
                              messageId={messageId}
                              messageText={parsedMessage ? parsedMessage.content : message.text}
                              narrationSegments={message.narrationSegments}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shared elements for group - options/rolls on last message only */}
                    {isLastInGroup && (
                      <>
                        {/* Action Options */}
                        {isDM && parsedMessage && parsedMessage.hasOptions && (
                          <div className="w-full max-w-md mt-3">
                            <ActionOptions
                              options={parsedMessage.options}
                              onOptionSelect={(option) => handleOptionSelect(createPlayerMessageFromOption(option))}
                              delay={10000}
                            />
                          </div>
                        )}

                        {/* Dice Roll Requests */}
                        {isDM && hasRollRequests && (
                          <div className="w-full max-w-md mt-3 space-y-3">
                            {rollRequests.map((request, reqIndex) => (
                              <DiceRollRequest
                                key={`${messageId}-roll-${reqIndex}`}
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

                        {/* Timestamp - only on last message */}
                        <div className={`text-xs message-meta px-2 ${group.isPlayer ? 'text-right' : 'text-left'} mt-1`}>
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Loading state */}
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
