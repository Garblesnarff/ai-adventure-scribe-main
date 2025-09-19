import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { useGame } from '@/contexts/GameContext';
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
  const { getCurrentDiceRoll, completeDiceRoll, cancelDiceRoll } = useGame();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll behavior: scroll to bottom when new messages arrive unless user scrolled up
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setIsUserScrolledUp(!atBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el || isUserScrolledUp) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isUserScrolledUp]);

  // Group consecutive messages from the same sender
  const groupedMessages = useMemo(() => {
    if (!messages.length) {
      return [];
    }

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

  // Handle dice roll requests from GameContext queue
  const handleDiceRoll = React.useCallback(async (formula: string, advantage?: boolean, disadvantage?: boolean) => {
    console.log('[MessageList] Handling dice roll from queue:', { formula, advantage, disadvantage });

    const currentRoll = getCurrentDiceRoll();
    if (!currentRoll) {
      console.warn('[MessageList] No current dice roll in queue');
      return;
    }

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

      // Complete the dice roll in GameContext
      completeDiceRoll(currentRoll.id, rollResult);

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
  }, [sendMessage, getCurrentDiceRoll, completeDiceRoll]);

  // Handle manual dice result input from GameContext queue
  const handleManualResult = React.useCallback(async (result: number) => {
    const currentRoll = getCurrentDiceRoll();
    if (!currentRoll) {
      console.warn('[MessageList] No current dice roll in queue');
      return;
    }

    try {
      // Ensure result is a number
      let numericResult: number;
      if (typeof result === 'number') {
        numericResult = result;
      } else if (typeof result === 'object' && result && 'total' in result) {
        numericResult = (result as any).total;
        console.warn('[MessageList] Received object in handleManualResult, extracting total:', numericResult);
      } else {
        console.error('[MessageList] Invalid result type in handleManualResult:', result);
        return;
      }

      // Complete the dice roll in GameContext
      completeDiceRoll(currentRoll.id, { total: numericResult });

      // Send to DM through the full message flow
      if (onSendFullMessage) {
        await onSendFullMessage(`I rolled ${numericResult}`);
      } else {
        // Fallback to direct message if no full message flow available
        const playerMessage: ChatMessage = {
          text: `I rolled ${numericResult}`,
          sender: 'player',
          timestamp: new Date().toISOString()
        };
        await sendMessage(playerMessage);
      }
    } catch (error) {
      console.error('[MessageList] Failed to handle manual dice result:', error);
    }
  }, [sendMessage, onSendFullMessage, getCurrentDiceRoll, completeDiceRoll]);

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-scroll parchment-panel"
      role="log"
      aria-live="polite"
      ref={messagesRef}
    >
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
                const structuredRollRequests = isDM && (message as any).rollRequests ? (message as any).rollRequests as any[] : [];
                const parsedRollRequests = isDM && structuredRollRequests.length === 0 ? parseRollRequests(message.text) : [];
                const rollRequests = structuredRollRequests.length > 0 ? 
                  structuredRollRequests.map((req: any) => ({ ...req, originalText: req.originalText ?? '', confidence: req.confidence ?? 1.0 })) : 
                  parsedRollRequests;
                const hasRollRequests = Array.isArray(rollRequests) && rollRequests.length > 0;

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
                            data={message.context.combatData as any}
                            timestamp={message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                          />
                        )}
                      </div>
                    ) : (
                      /* Regular message bubble - only first/last have full styling */
                      <div
                        className={
                          `relative px-3 py-2 rounded-xl transition-all duration-200 message-bubble ` +
                          (isDM
                            ? 'dm-bubble border-l-4 border-l-primary/20 bg-gradient-to-r from-infinite-purple/80 to-infinite-teal/60 text-white shadow-md '
                            : group.isPlayer
                              ? 'player-bubble ml-auto bg-card text-card-foreground shadow-sm '
                              : 'system-bubble bg-muted/20 '
                          ) +
                          (isFirstInGroup ? 'rounded-t-xl pt-3 ' : '') +
                          (isLastInGroup ? 'rounded-b-xl pb-3 ' : 'border-b border-border/20 ') +
                          'animate-in fade-in'
                        }
                      >
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
                              narrationSegments={message.narrationSegments as any}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shared elements for group - options/rolls on last message only */}
                    {isLastInGroup && (
                      <>
                        {/* Action Options - render inline for DM bubbles */}
                        {isDM && parsedMessage && parsedMessage.hasOptions && (
                          <div className="w-full max-w-md mt-3">
                            <ActionOptions
                              options={parsedMessage.options}
                              onOptionSelect={(option) => handleOptionSelect(createPlayerMessageFromOption(option))}
                              delay={10000}
                            />
                          </div>
                        )}

                        {/* Note: Dice Roll Requests are now handled globally by GameContext */}
                        {/* Individual message-based roll requests no longer create popups */}
                        {/* The GameContext manages the dice roll queue to prevent duplicates */}

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

      {/* Global Dice Roll Request - Shows current roll from GameContext queue */}
      {(() => {
        const currentRoll = getCurrentDiceRoll();
        if (!currentRoll) return null;

        return (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <DiceRollRequest
              request={{
                type: currentRoll.requestType as any,
                formula: `${currentRoll.rollConfig.count}d${currentRoll.rollConfig.dieType}${currentRoll.rollConfig.modifier >= 0 ? '+' : ''}${currentRoll.rollConfig.modifier}`,
                purpose: currentRoll.description,
                advantage: currentRoll.rollConfig.advantage,
                disadvantage: currentRoll.rollConfig.disadvantage
              }}
              onRoll={handleDiceRoll}
              onManualResult={handleManualResult}
              onCancel={() => cancelDiceRoll(currentRoll.id)}
              className="shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            />
          </div>
        );
      })()}

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
