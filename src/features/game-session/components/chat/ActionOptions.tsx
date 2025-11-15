import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sword, MessageCircle, Eye, Zap, User } from 'lucide-react';
import { ActionOption, createPlayerMessageFromOption } from '@/utils/parseMessageOptions';
import logger from '@/lib/logger';
import { cardItemFast, createStagger } from '@/utils/animations';

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
  if (lowerText.includes('attack') || lowerText.includes('fight') || lowerText.includes('weapon') ||
      lowerText.includes('sword') || lowerText.includes('strike')) {
    return Sword;
  }

  // Social/Dialogue keywords
  if (lowerText.includes('speak') || lowerText.includes('talk') || lowerText.includes('say') ||
      lowerText.includes('ask') || lowerText.includes('converse') || lowerText.includes('greet')) {
    return MessageCircle;
  }

  // Investigation/Observation keywords
  if (lowerText.includes('look') || lowerText.includes('observe') || lowerText.includes('examine') ||
      lowerText.includes('search') || lowerText.includes('investigate') || lowerText.includes('peer')) {
    return Eye;
  }

  // Magic/Ability keywords
  if (lowerText.includes('cast') || lowerText.includes('spell') || lowerText.includes('magic') ||
      lowerText.includes('ability') || lowerText.includes('power')) {
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
  className = ''
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
        <motion.div
          className="space-y-3"
          variants={createStagger(0.1)}
          initial="hidden"
          animate="visible"
        >
          <div className="text-xs text-infinite-purple/70 text-center mb-3 font-serif italic">
            What would you like to do?
          </div>

          <div className="grid gap-3">
            {options.map((option, index) => {
              const IconComponent = getOptionIcon(option.text);
              const isSelected = selectedOption === option.id;
              const isDisabled = disabled || (selectedOption && selectedOption !== option.id);

              return (
                <motion.div key={option.id} variants={cardItemFast}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOptionClick(option)}
                    disabled={isDisabled}
                    className={`
                      flex items-start gap-3 p-4 h-auto text-left justify-start w-full
                      transition-all duration-200 border-2 rounded-xl
                      hover:bg-gradient-to-r hover:from-infinite-purple/10 hover:to-infinite-teal/10
                      hover:border-infinite-purple/50 hover:shadow-lg hover:shadow-infinite-purple/20
                      hover:scale-[1.02] hover:-translate-y-0.5
                      focus:ring-2 focus:ring-infinite-purple/50 focus:border-infinite-purple
                      ${isSelected ? 'bg-gradient-to-r from-infinite-purple/15 to-infinite-teal/15 border-infinite-purple shadow-md shadow-infinite-purple/30' : 'bg-card/50'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''}
                    `}
                  >
                    <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg transition-colors ${isSelected ? 'bg-infinite-purple/20' : 'bg-muted/30'}`}>
                      <IconComponent className={`h-5 w-5 ${isSelected ? 'text-infinite-purple' : ''}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1 text-infinite-purple">
                        Option {option.number}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {option.text}
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        className="flex-shrink-0 mt-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div className="w-3 h-3 bg-infinite-purple rounded-full animate-pulse shadow-lg shadow-infinite-purple/50"></div>
                      </motion.div>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Help text */}
          {!selectedOption && (
            <motion.div
              className="text-xs text-muted-foreground text-center pt-2 opacity-75 italic"
              variants={cardItemFast}
            >
              Or describe your own action in the chat
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};