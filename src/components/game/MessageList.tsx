import React from 'react';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';
import { CombatMessage, InitiativeMessage, CombatSummaryMessage } from '@/components/combat/CombatMessage';
import { DMMessageVoiceControls } from '@/components/game/voice/DMMessageVoiceControls';

/**
 * MessageList Component
 * Displays a list of chat messages with styling based on sender type
 */
export const MessageList: React.FC = () => {
  const { messages = [] } = useMessageContext();

  return (
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 chat-scroll parchment-panel">
      {messages?.map((message, index) => {
        const isPlayer = message.sender === 'player';
        const isDM = message.sender === 'dm';
        const isSystem = message.sender === 'system';

        // Check if next message is from same sender for grouping
        const nextMessage = messages[index + 1];
        const isGrouped = nextMessage && nextMessage.sender === message.sender;

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
                {/* Check if this is a combat message */}
                {message.context?.combatData ? (
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>

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
                          messageText={message.text}
                          narrationSegments={message.narrationSegments}
                        />
                      </div>
                    )}
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
