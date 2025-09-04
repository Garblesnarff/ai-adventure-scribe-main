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
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 chat-scroll">
      {messages?.map((message, index) => {
        const isPlayer = message.sender === 'player';
        const isDM = message.sender === 'dm';
        const isSystem = message.sender === 'system';

        // Check if next message is from same sender for grouping
        const nextMessage = messages[index + 1];
        const isGrouped = nextMessage && nextMessage.sender === message.sender;

        return (
          <div
            key={message.id || message.timestamp}
            className={`flex ${isPlayer ? 'justify-end' : 'justify-start'} group`}
          >
            <div className={`flex max-w-[85%] ${isPlayer ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar placeholder for future use */}
              {!isPlayer && (
                <div className="flex-shrink-0 mr-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isDM ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isDM ? 'DM' : 'S'}
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'} space-y-1`}>
                {/* Message bubble */}
                <div
                  className={`relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                    isDM
                      ? 'bg-white text-gray-800 border border-gray-100'
                      : isSystem
                      ? 'bg-gray-50 text-gray-600 border border-gray-200'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {/* Message text */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>

                  {/* Context information */}
                  {message.context && (
                    <div className="mt-3 pt-3 border-t border-opacity-20 space-y-2">
                      {message.context.emotion && (
                        <div className="flex items-center text-xs opacity-75">
                          <span className="font-medium mr-2">🎭</span>
                          <span>{message.context.emotion}</span>
                        </div>
                      )}
                      {message.context.location && (
                        <div className="flex items-center text-xs opacity-75">
                          <span className="font-medium mr-2">📍</span>
                          <span>{message.context.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message tail */}
                  <div
                    className={`absolute top-0 w-0 h-0 border-l-4 border-r-4 border-t-4 ${
                      isPlayer
                        ? 'right-0 border-l-blue-500 border-r-transparent border-t-blue-500 transform translate-x-2'
                        : isDM
                        ? 'left-0 border-l-transparent border-r-gray-100 border-t-white transform -translate-x-2'
                        : 'left-0 border-l-transparent border-r-gray-200 border-t-gray-50 transform -translate-x-2'
                    }`}
                  />
                </div>

                {/* Timestamp and status */}
                <div className={`text-xs text-gray-400 px-2 ${isPlayer ? 'text-right' : 'text-left'}`}>
                  {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
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
