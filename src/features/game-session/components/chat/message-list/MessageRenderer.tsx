import React from 'react';

import { DMMessage } from './DMMessage';
import { DynamicOptionsSection } from './DynamicOptionsSection';
import { PlayerMessage } from './PlayerMessage';

import type { ChatMessage } from '@/types/game';

import {
  CombatMessage,
  InitiativeMessage,
  CombatSummaryMessage,
} from '@/components/combat/CombatMessage';
import { DiceRollMessage } from '@/components/game/DiceRollMessage';
import { parseMessageOptions } from '@/utils/parseMessageOptions';

interface MessageRendererProps {
  message: ChatMessage;
  messageId: string;
  groupIndex: number;
  msgIndex: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isPlayer: boolean;
  isDM: boolean;
  expandedMessages: Set<string>;
  setExpandedMessages: React.Dispatch<React.SetStateAction<Set<string>>>;
  dynamicOptions: { key: string; lines: string[] } | null;
  imageByMessage: Record<string, { url: string; prompt: string }>;
  generatingFor: Set<string>;
  genErrorByMessage: Record<string, string>;
  onGenerateScene: (message: ChatMessage & { id?: string; timestamp?: string }) => Promise<void>;
  onOptionSelect: (optionText: string) => Promise<void>;
  characterName?: string;
}

/**
 * MessageRenderer Component
 * Renders individual messages with proper delegation to DMMessage or PlayerMessage
 * Handles special message types (dice rolls, combat)
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  messageId,
  isFirstInGroup,
  isLastInGroup,
  isPlayer,
  isDM,
  expandedMessages,
  setExpandedMessages,
  dynamicOptions,
  imageByMessage,
  generatingFor,
  genErrorByMessage,
  onGenerateScene,
  onOptionSelect,
  characterName,
}) => {
  // Compose display text with dynamic options overlay (DM last-in-group only)
  const shouldOverlay = isDM && isLastInGroup && dynamicOptions?.key === messageId;
  const messageWithOverlay =
    shouldOverlay && dynamicOptions?.lines?.length
      ? `${message.text}\n${dynamicOptions.lines.join('\n')}`
      : message.text;

  // Parse for this message (using overlay text when present)
  const parsedMessage = isDM ? parseMessageOptions(messageWithOverlay) : null;

  // Truncation logic
  const baseText = parsedMessage ? parsedMessage.content || messageWithOverlay : messageWithOverlay;
  const isLongMessage = baseText.length > 200;
  const isExpanded = expandedMessages.has(messageId);
  const displayText = isLongMessage && !isExpanded ? `${baseText.substring(0, 200)}... ` : baseText;

  const toggleExpanded = () => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Image presence (persisted or ephemeral) for DM messages
  const hasMessageImages =
    isDM && Array.isArray((message as any).images) && (message as any).images.length > 0;
  const firstMessageImgUrl = hasMessageImages ? (message as any).images[0]?.url : undefined;
  const ephemeralImgUrl = isDM && !hasMessageImages ? imageByMessage[messageId]?.url : undefined;
  const hasAnyImage = Boolean(firstMessageImgUrl || ephemeralImgUrl);

  return (
    <div
      id={`m-${messageId}`}
      data-anchor={isDM ? 'true' : 'false'}
      className={`w-full ${isFirstInGroup ? '' : 'mt-1'}`}
    >
      {/* Special message types */}
      {message.context?.diceRoll ? (
        <div className="w-full">
          <DiceRollMessage data={message.context.diceRoll} playerName={isPlayer ? 'You' : 'DM'} />
        </div>
      ) : message.context?.combatData ? (
        <div className="w-full">
          {message.context.combatData.type === 'initiative' ? (
            <InitiativeMessage
              participants={message.context.combatData.participants || []}
              timestamp={
                message.timestamp
                  ? new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          ) : message.context.combatData.summary ? (
            <CombatSummaryMessage
              summary={message.context.combatData.summary}
              timestamp={
                message.timestamp
                  ? new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          ) : (
            <CombatMessage
              data={message.context.combatData as any}
              timestamp={
                message.timestamp
                  ? new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          )}
        </div>
      ) : isDM ? (
        <DMMessage
          message={message}
          messageId={messageId}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          displayContent={
            parsedMessage ? parsedMessage.content || messageWithOverlay : messageWithOverlay
          }
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
          imageUrl={firstMessageImgUrl || ephemeralImgUrl}
          isGeneratingImage={generatingFor.has(messageId)}
          imageError={genErrorByMessage[messageId]}
          onGenerateImage={() => onGenerateScene(message as any)}
          hasAnyImage={hasAnyImage}
        />
      ) : (
        <PlayerMessage
          message={message}
          messageId={messageId}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          displayText={displayText}
          isLongMessage={isLongMessage}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
        />
      )}

      {/* Action Options - render inline for DM bubbles on last message */}
      {isLastInGroup && isDM && parsedMessage && parsedMessage.hasOptions && (
        <DynamicOptionsSection
          options={parsedMessage.options}
          onOptionSelect={onOptionSelect}
          hasDynamicOverlay={dynamicOptions?.key === messageId}
        />
      )}
    </div>
  );
};
