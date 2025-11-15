import React from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
  sender?: string;
}

/**
 * TypingIndicator Component
 * Shows a typing animation when someone is composing a message
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, sender = 'DM' }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
          {sender === 'DM' ? 'DM' : 'S'}
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl px-4 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-2">{sender} is typing</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
