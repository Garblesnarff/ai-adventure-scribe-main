import { gql } from '@apollo/client';
import { MEMORY_FRAGMENT, CAMPAIGN_FRAGMENT, CHARACTER_FRAGMENT } from './queries';

// AI Subscriptions for real-time streaming
export const STREAM_CHAT_RESPONSE = gql`
  subscription StreamChatResponse(
    $messages: [ChatMessageInput!]!
    $sessionId: String!
  ) {
    streamChatResponse(messages: $messages, sessionId: $sessionId) {
      text
      sender
      context
      metadata
    }
  }
`;

export const STREAM_DM_RESPONSE = gql`
  subscription StreamDMResponse(
    $task: TaskInput!
    $agentContext: AgentContextInput!
    $voiceContext: VoiceContextInput
  ) {
    streamDMResponse(task: $task, agentContext: $agentContext, voiceContext: $voiceContext) {
      response
      context
      raw
      narrationSegments {
        text
        voice_id
        voice_settings {
          stability
          similarity_boost
        }
      }
    }
  }
`;

// Memory Subscriptions
export const MEMORY_UPDATED = gql`
  ${MEMORY_FRAGMENT}
  subscription MemoryUpdated($sessionId: String!) {
    memoryUpdated(sessionId: $sessionId) {
      ...MemoryFields
    }
  }
`;

// Campaign Subscriptions
export const CAMPAIGN_UPDATED = gql`
  ${CAMPAIGN_FRAGMENT}
  subscription CampaignUpdated($campaignId: String!) {
    campaignUpdated(campaignId: $campaignId) {
      ...CampaignFields
    }
  }
`;

// Character Subscriptions
export const CHARACTER_UPDATED = gql`
  ${CHARACTER_FRAGMENT}
  subscription CharacterUpdated($characterId: String!) {
    characterUpdated(characterId: $characterId) {
      ...CharacterFields
    }
  }
`;