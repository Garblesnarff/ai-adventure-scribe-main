import { Send, Paperclip, Smile, Dice6, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { mightBeDiceCommand, getDiceCommandSuggestions } from '@/utils/diceCommandParser';

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
  const [showDiceSuggestions, setShowDiceSuggestions] = useState(false);
  const [diceSuggestions, setDiceSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea based on content and handle dice command suggestions
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

      // Expand if content is multi-line
      setIsExpanded(textareaRef.current.scrollHeight > 48);
    }

    // Check for dice command and show suggestions
    const isDiceCommand = mightBeDiceCommand(input);
    setShowDiceSuggestions(isDiceCommand);

    if (isDiceCommand) {
      const suggestions = getDiceCommandSuggestions(input);
      setDiceSuggestions(suggestions);
    } else {
      setDiceSuggestions([]);
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
    setShowDiceSuggestions(false);
  };

  /**
   * Handle clicking on a dice suggestion
   */
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowDiceSuggestions(false);
    textareaRef.current?.focus();
  };

  /**
   * Add quick dice roll button
   */
  const handleQuickDiceRoll = () => {
    if (input.trim()) return; // Don't override existing input
    setInput('/roll 1d20');
    textareaRef.current?.focus();
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
    <div className="px-4 pb-4">
      <div className="chat-composer transition-all duration-300 focus-within:ring-2 focus-within:ring-infinite-purple/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-2xl bg-card/90 border border-border/60 hover:border-border hover:shadow-lg">
        <div className="flex items-end gap-3 p-3">
          {/* Enhanced Quick action buttons with better touch targets */}
          <div className="flex items-center gap-1 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
              disabled={isDisabled}
              aria-label="Attach file"
              title="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
              disabled={isDisabled}
              aria-label="Insert emoji"
              title="Insert emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleQuickDiceRoll}
              className="h-10 w-10 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
              disabled={isDisabled}
              title="Quick dice roll (1d20)"
              aria-label="Quick dice roll (1d20)"
            >
              <Dice6 className="h-5 w-5" />
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
              className="min-h-[20px] max-h-28 resize-none border-0 shadow-none focus:ring-0 focus:border-0 p-0 text-sm leading-relaxed placeholder:text-gray-600 bg-transparent"
              disabled={isDisabled}
              rows={1}
            />

            {/* Character count indicator */}
            {input.length > 500 && (
              <div className="absolute -top-6 right-0 text-xs text-gray-400">
                {input.length}/1000
              </div>
            )}

            {/* Dice command suggestions */}
            {showDiceSuggestions && diceSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Dice6 className="w-3 h-3" />
                    Dice Roll Suggestions
                  </div>
                  {diceSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded font-mono"
                      disabled={isDisabled}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Send button with better touch targets */}
          <Button
            onClick={handleSubmit}
            disabled={!canSend}
            className={`h-12 w-12 p-0 rounded-xl transition-all duration-200 min-h-[48px] min-w-[48px] touch-manipulation ${
              canSend
                ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            {!canSend && isDisabled ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
          <span>
            {showDiceSuggestions ? (
              <>
                Type <code className="bg-gray-100 px-1 rounded">/roll 1d20</code> for dice rolls
              </>
            ) : (
              <>
                Press Enter to send, Shift+Enter for new line •{' '}
                <code className="bg-gray-100 px-1 rounded">/roll</code> for dice
              </>
            )}
          </span>
          {isExpanded && <span className="text-gray-500">{input.length}/1000 characters</span>}
        </div>
      </div>
    </div>
  );
};
