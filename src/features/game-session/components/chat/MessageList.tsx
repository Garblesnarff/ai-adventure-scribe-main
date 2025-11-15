import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { MessageListContainer } from './message-list';
import { useDynamicOptions } from './message-list/useDynamicOptions';
import { useImageGeneration } from './message-list/useImageGeneration';
import { useScrollBehavior } from './message-list/useScrollBehavior';

import type { ChatMessage } from '@/types/game';
import { useCampaign } from '@/contexts/CampaignContext';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCombat } from '@/contexts/CombatContext';
import { useGame } from '@/contexts/GameContext';
import { useMessageContext } from '@/contexts/MessageContext';
import logger from '@/lib/logger';
import { handleAsyncError } from '@/utils/error-handler';

interface MessageListProps {
  onSendFullMessage?: (message: string) => Promise<void>;
  sessionId?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
  suppressEmptyState?: boolean;
}

// Type for last roll metadata to inform /dm/options
type LastRollMeta = {
  kind: 'attack' | 'skill_check' | 'save' | 'damage' | 'initiative' | 'generic';
  skill?: string;
  weapon?: string;
  label?: string;
  result: number;
  nat?: number;
  dc?: number;
  ac?: number;
  success?: boolean;
};

/**
 * MessageList Component
 * Displays a list of chat messages with styling based on sender type
 * Refactored to use sub-components and custom hooks for better maintainability
 */
export const MessageList: React.FC<MessageListProps> = ({
  onSendFullMessage,
  sessionId,
  containerRef,
  suppressEmptyState,
}) => {
  const { messages = [], sendMessage, hasMore, loadMore, isFetchingMore } = useMessageContext();
  const { getCurrentDiceRoll } = useGame();
  const { state: combatState } = useCombat();
  const { state: characterState } = useCharacter();
  const { state: campaignState } = useCampaign();
  const { id: routeCampaignId } = useParams<{ id: string }>();

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const internalRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = (containerRef as React.RefObject<HTMLDivElement>) || internalRef;
  const lastRollRef = useRef<LastRollMeta | null>(null);

  // Custom hooks for feature isolation
  const dynamicOptions = useDynamicOptions({
    messages,
    getCurrentDiceRoll,
    isInCombat: combatState.isInCombat,
    lastRollRef,
  });

  const { generatingFor, imageByMessage, genErrorByMessage, handleGenerateScene } =
    useImageGeneration({
      sessionId,
      routeCampaignId,
      character: characterState.character,
      campaign: campaignState.campaign,
      messages,
    });

  useScrollBehavior(messagesRef, messages, hasMore, loadMore, isFetchingMore);

  // Handle option selection
  const handleOptionSelect = React.useCallback(
    async (optionText: string) => {
      logger.info('[MessageList] Handling option selection:', optionText);
      try {
        if (onSendFullMessage) {
          await onSendFullMessage(optionText);
        } else {
          const playerMessage: ChatMessage = {
            text: optionText,
            sender: 'player',
            timestamp: new Date().toISOString(),
          };
          await sendMessage(playerMessage);
        }
      } catch (error) {
        handleAsyncError(error, {
          userMessage: 'Failed to send option selection',
          context: { location: 'MessageList.handleOptionSelect' },
        });
      }
    },
    [onSendFullMessage, sendMessage],
  );

  return (
    <div className="flex-1 min-h-0">
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6 chat-scroll parchment-panel bg-gradient-to-b from-background/50 to-background/30"
        role="log"
        aria-live="polite"
        ref={messagesRef}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <MessageListContainer
          messages={messages}
          messagesRef={messagesRef}
          expandedMessages={expandedMessages}
          setExpandedMessages={setExpandedMessages}
          dynamicOptions={dynamicOptions}
          imageByMessage={imageByMessage}
          generatingFor={generatingFor}
          genErrorByMessage={genErrorByMessage}
          onGenerateScene={handleGenerateScene}
          onOptionSelect={handleOptionSelect}
          onSendMessage={sendMessage}
          onSendFullMessage={onSendFullMessage}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
          suppressEmptyState={suppressEmptyState}
        />
      </div>
    </div>
  );
};
