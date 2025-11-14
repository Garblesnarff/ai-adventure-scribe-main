import { Sword, MessageCircle, Eye, Zap, User } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { ActionOption } from '@/utils/parseMessageOptions';

import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';
import { createPlayerMessageFromOption } from '@/utils/parseMessageOptions';

interface ActionOptionsProps {
  options: ActionOption[];
  onOptionSelect: (option: ActionOption) => void;
  delay?: number; // Delay in milliseconds before showing options
  disabled?: boolean;
  className?: string;
}

/**
 * Get an appropriate icon for an option based on its text content
 */
function getOptionIcon(text: string): React.ComponentType<{ className?: string }> {
  const lowerText = text.toLowerCase();

  // Combat/Action keywords
  if (
    lowerText.includes('attack') ||
    lowerText.includes('fight') ||
    lowerText.includes('weapon') ||
    lowerText.includes('sword') ||
    lowerText.includes('strike')
  ) {
    return Sword;
  }

  // Social/Dialogue keywords
  if (
    lowerText.includes('speak') ||
    lowerText.includes('talk') ||
    lowerText.includes('say') ||
    lowerText.includes('ask') ||
    lowerText.includes('converse') ||
    lowerText.includes('greet')
  ) {
    return MessageCircle;
  }

  // Investigation/Observation keywords
  if (
    lowerText.includes('look') ||
    lowerText.includes('observe') ||
    lowerText.includes('examine') ||
    lowerText.includes('search') ||
    lowerText.includes('investigate') ||
    lowerText.includes('peer')
  ) {
    return Eye;
  }

  // Magic/Ability keywords
  if (
    lowerText.includes('cast') ||
    lowerText.includes('spell') ||
    lowerText.includes('magic') ||
    lowerText.includes('ability') ||
    lowerText.includes('power')
  ) {
    return Zap;
  }

  // Default to character/person icon
  return User;
}

/**
 * ActionOptions component displays clickable option buttons with a configurable delay
 * Encourages player roleplay before showing suggested actions
 */
export const ActionOptions: React.FC<ActionOptionsProps> = ({
  options,
  onOptionSelect,
  delay = 10000, // 10 seconds default
  disabled = false,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Show options after delay
  useEffect(() => {
    if (options.length > 0) {
      let mounted = true;
      const timer = setTimeout(() => {
        if (mounted) {
          setVisible(true);
        }
      }, delay);

      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
  }, [options, delay]);

  // Handle option selection
  const handleOptionClick = (option: ActionOption) => {
    if (disabled || selectedOption) return;
    logger.info('[ActionOptions] Option clicked:', option.text);
    setSelectedOption(option.id);
    onOptionSelect(option);
  };

  // Don't render if no options
  if (options.length === 0) {
    return null;
  }

  return (
    <div className={`transition-all duration-500 ${className}`}>
      {/* Show loading dots before options appear */}
      {!visible && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-muted-foreground/40 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-muted-foreground/40 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-muted-foreground/40 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Option buttons with fade-in animation */}
      {visible && (
        <div className="space-y-3 animate-in fade-in-0 duration-500">
          <div className="text-xs text-muted-foreground text-center mb-3">
            What would you like to do?
          </div>

          <div className="grid gap-3">
            {options.map((option, index) => {
              const IconComponent = getOptionIcon(option.text);
              const isSelected = selectedOption === option.id;
              const isDisabled = disabled || (selectedOption && selectedOption !== option.id);

              return (
                <Button
                  key={option.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleOptionClick(option)}
                  disabled={isDisabled}
                  className={`
                    flex items-start gap-3 p-4 h-auto text-left justify-start
                    transition-all duration-200 border-2 rounded-lg
                    hover:bg-infinite-purple/5 hover:border-infinite-purple/30
                    focus:ring-2 focus:ring-infinite-purple/50 focus:border-infinite-purple
                    animate-in fade-in-0 slide-in-from-left-4 duration-300
                    ${isSelected ? 'bg-infinite-purple/10 border-infinite-purple text-infinite-purple' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">Option {option.number}</div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{option.text}</div>
                  </div>

                  {isSelected && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-infinite-purple rounded-full animate-pulse"></div>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Help text */}
          {!selectedOption && (
            <div className="text-xs text-muted-foreground text-center pt-2 opacity-75">
              Or describe your own action in the chat
            </div>
          )}
        </div>
      )}
    </div>
  );
};
