import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { typingDot, fadeIn } from '@/utils/animations';

interface TypingIndicatorProps {
  isVisible: boolean;
  sender?: string;
}

const flavorTexts = [
  'The Dungeon Master weaves a tale...',
  'Consulting ancient tomes...',
  'Rolling dice behind the screen...',
  'The fates are being decided...',
  'Conjuring worlds of wonder...',
  'Narrating your legend...'
];

/**
 * TypingIndicator Component
 * Shows a typing animation with immersive flavor text when the DM is composing
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  sender = 'DM'
}) => {
  const [flavorText, setFlavorText] = useState(flavorTexts[0]);

  useEffect(() => {
    if (isVisible && sender === 'DM') {
      // Randomly select a flavor text
      setFlavorText(flavorTexts[Math.floor(Math.random() * flavorTexts.length)]);
    }
  }, [isVisible, sender]);

  if (!isVisible) return null;

  const isDM = sender === 'DM';

  return (
    <motion.div
      className="flex items-center gap-3 px-6 py-3"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* DM Avatar */}
      {isDM && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-infinite-purple via-infinite-purple-dark to-infinite-dark flex items-center justify-center shadow-lg ring-2 ring-infinite-purple/30">
            <Sparkles className="w-5 h-5 text-infinite-gold animate-pulse" />
          </div>
        </div>
      )}

      {/* Typing bubble */}
      <div className="cosmic-panel px-5 py-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80 font-serif italic">
            {isDM ? flavorText : `${sender} is typing`}
          </span>
          <div className="flex gap-1.5">
            <motion.div
              className="w-2 h-2 bg-infinite-purple-light rounded-full"
              variants={typingDot}
              animate="typing"
              transition={{ delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-infinite-purple-light rounded-full"
              variants={typingDot}
              animate="typing"
              transition={{ delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-infinite-purple-light rounded-full"
              variants={typingDot}
              animate="typing"
              transition={{ delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
