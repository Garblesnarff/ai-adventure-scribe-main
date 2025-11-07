/**
 * Game Session Components Public API
 *
 * Exports all game-session-related components for use outside the feature.
 */

// Chat components
export { SimpleGameChat } from './chat/SimpleGameChat';
export { SimpleGameChatWithVoice } from './chat/SimpleGameChatWithVoice';
export { MessageList } from './chat/MessageList';
export { ChatInput } from './chat/ChatInput';
export { ChatImage } from './chat/ChatImage';
export { TypingIndicator } from './chat/TypingIndicator';
export { DMChatBubble } from './chat/chat/DMChatBubble';
export { ActionOptions } from './chat/ActionOptions';
export { DiceRollMessage } from './chat/DiceRollMessage';
export { DiceRollRequest } from './chat/DiceRollRequest';

// Message list components
export * from './chat/message-list';

// Audio components
export { AudioControls } from './audio/AudioControls';
export { AudioPlayer } from './audio/AudioPlayer';
export { ProgressiveVoicePlayer } from './audio/ProgressiveVoicePlayer';
export { SpeakingIndicator } from './audio/SpeakingIndicator';
export { VoiceButton } from './audio/VoiceButton';
export { VolumeButton } from './audio/VolumeButton';
export { VolumeSlider } from './audio/VolumeSlider';

// Voice components
export { VoiceHandler } from './voice/VoiceHandler';
export { DMMessageVoiceControls } from './voice/DMMessageVoiceControls';

// Dice components
export { DiceRollEmbed } from './dice/DiceRollEmbed';

// Game UI components
export { GameInterface } from './game-interface';
export { GameContent } from './game/GameContent';
export { GameContentWithErrorBoundary } from './game/GameContentWithErrorBoundary';
export { StatsBar } from './game/StatsBar';
export { MemoryPanel } from './game/MemoryPanel';
export { CompactCharacterHeader } from './game/CompactCharacterHeader';
export { CampaignSidePanel } from './game/CampaignSidePanel';
export { FloatingActionPanel } from './game/FloatingActionPanel';
export { CombatSummary } from './game/CombatSummary';
export { TimelineRail } from './game/TimelineRail';

// Game session components
export { SessionValidator } from './game/session/SessionValidator';

// Game content components
export * from './game/game-content';

// Game skeletons
export { MessageListSkeleton } from './game/skeletons/MessageListSkeleton';

// Memory components
export { MemoryTester } from './game/memory/MemoryTester';
export { MemoryCard } from './game/memory/MemoryCard';
export { MemoryFilter } from './game/memory/MemoryFilter';
export { useMemoryFiltering } from './game/memory/useMemoryFiltering';
export * from './game/memory/types';
export * from './game/memory/memoryConstants';

// Message components
export { MessageHandler } from './game/message/MessageHandler';
