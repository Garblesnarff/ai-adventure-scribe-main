import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Paperclip, Smile } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
}

/**
 * ChatInput Component
 * Enhanced input component with multi-line support and better UX
 *
 * @param onSendMessage - Callback function to handle message submission
 * @param isDisabled - Boolean to disable input during message processing
 */
export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isDisabled }) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

      // Expand if content is multi-line
      setIsExpanded(textareaRef.current.scrollHeight > 48);
    }
  }, [input]);

  /**
   * Handles message submission and clears input
   */
  const handleSubmit = () => {
    if (!input.trim() || isDisabled) return;
    onSendMessage(input.trim());
    setInput('');
    setIsExpanded(false);
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter for new line
        return;
      } else {
        // Enter to send
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const canSend = input.trim().length > 0 && !isDisabled;

  return (
    <div className="px-6 pb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 transition-all duration-200 focus-within:shadow-md focus-within:border-blue-300">
        <div className="flex items-end gap-3">
          {/* Quick action buttons */}
          <div className="flex items-center gap-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isDisabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isDisabled}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Input area */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what your character would like to do..."
              className="min-h-[20px] max-h-32 resize-none border-0 shadow-none focus:ring-0 focus:border-0 p-0 text-sm leading-relaxed placeholder:text-gray-400 bg-transparent"
              disabled={isDisabled}
              rows={1}
            />

            {/* Character count indicator */}
            {input.length > 500 && (
              <div className="absolute -top-6 right-0 text-xs text-gray-400">
                {input.length}/1000
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSend}
            className={`h-10 w-10 p-0 rounded-xl transition-all duration-200 ${
              canSend
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Helper text */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {isExpanded && (
            <span className="text-gray-500">
              {input.length}/1000 characters
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
