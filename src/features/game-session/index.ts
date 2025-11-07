/**
 * Game Session Feature Public API
 *
 * This is the main entry point for the game-session feature.
 * Only exports that are needed by other parts of the application
 * should be included here.
 *
 * Following vertical slice architecture principles:
 * - Features are self-contained
 * - External consumers import from this file only
 * - Internal implementation details are not exposed
 */

// Components
export {
  SimpleGameChat,
  SimpleGameChatWithVoice,
  MessageList,
  ChatInput,
  ChatImage,
  TypingIndicator,
  DMChatBubble,
  AudioControls,
  AudioPlayer,
  ProgressiveVoicePlayer,
  SpeakingIndicator,
  VoiceButton,
  VolumeButton,
  VolumeSlider,
  VoiceHandler,
  DMMessageVoiceControls,
} from './components';

// Re-export message list components
export * from './components/chat/message-list';

// Hooks
export { useSimpleGameSession, useGameSession } from './hooks';

// Types
export * from './types';
