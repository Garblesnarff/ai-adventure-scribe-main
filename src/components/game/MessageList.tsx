import React from 'react';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';

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
                </div>

                <div className={`text-xs message-meta px-2 ${isPlayer ? 'text-right' : 'text-left'}`}>
                  {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {messages?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start your adventure</h3>
          <p className="text-gray-500 max-w-sm">
            Begin by describing what your character would like to do, and the Dungeon Master will guide you through the story.
          </p>
        </div>
      )}
    </div>
  );
};
