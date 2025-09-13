import { gql } from '@apollo/client';
import { MEMORY_FRAGMENT, CAMPAIGN_FRAGMENT, CHARACTER_FRAGMENT } from './queries';

// AI Mutations
export const GENERATE_CHAT_RESPONSE = gql`
  mutation GenerateChatResponse(
    $messages: [ChatMessageInput!]!
    $sessionId: String!
    $context: JSON
  ) {
    generateChatResponse(messages: $messages, sessionId: $sessionId, context: $context) {
      text
      sender
      context
      metadata
    }
  }
`;

export const EXECUTE_DM_AGENT = gql`
  mutation ExecuteDMAgent(
    $task: TaskInput!
    $agentContext: AgentContextInput!
    $voiceContext: VoiceContextInput
    $isFirstMessage: Boolean
    $combatContext: CombatContextInput
  ) {
    executeDMAgent(
      task: $task
      agentContext: $agentContext
      voiceContext: $voiceContext
      isFirstMessage: $isFirstMessage
      combatContext: $combatContext
    ) {
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

export const EXECUTE_RULES_INTERPRETER = gql`
  mutation ExecuteRulesInterpreter(
    $task: TaskInput!
    $agentContext: AgentContextInput!
  ) {
    executeRulesInterpreter(task: $task, agentContext: $agentContext)
  }
`;

export const GENERATE_SPEECH = gql`
  mutation GenerateSpeech(
    $text: String!
    $voiceId: String
    $voiceSettings: VoiceSettingsInput
  ) {
    generateSpeech(text: $text, voiceId: $voiceId, voiceSettings: $voiceSettings) {
      audioUrl
      audioData
      format
      duration
    }
  }
`;

export const GENERATE_EMBEDDING = gql`
  mutation GenerateEmbedding($text: String!) {
    generateEmbedding(text: $text) {
      embedding
      text
    }
  }
`;

// Memory Mutations
export const CREATE_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  mutation CreateMemory($input: MemoryInput!, $sessionId: String!) {
    createMemory(input: $input, sessionId: $sessionId) {
      ...MemoryFields
    }
  }
`;

export const UPDATE_MEMORY_IMPORTANCE = gql`
  ${MEMORY_FRAGMENT}
  mutation UpdateMemoryImportance($memoryId: String!, $importance: Int!) {
    updateMemoryImportance(memoryId: $memoryId, importance: $importance) {
      ...MemoryFields
    }
  }
`;

// Campaign Mutations
export const CREATE_CAMPAIGN = gql`
  ${CAMPAIGN_FRAGMENT}
  mutation CreateCampaign($input: CampaignInput!) {
    createCampaign(input: $input) {
      ...CampaignFields
    }
  }
`;

export const UPDATE_CAMPAIGN = gql`
  ${CAMPAIGN_FRAGMENT}
  mutation UpdateCampaign($id: String!, $input: CampaignInput!) {
    updateCampaign(id: $id, input: $input) {
      ...CampaignFields
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: String!) {
    deleteCampaign(id: $id)
  }
`;

export const GENERATE_CAMPAIGN_DESCRIPTION = gql`
  ${CAMPAIGN_FRAGMENT}
  mutation GenerateCampaignDescription(
    $name: String!
    $genre: String!
    $context: JSON
  ) {
    generateCampaignDescription(name: $name, genre: $genre, context: $context) {
      description
      campaign {
        ...CampaignFields
      }
    }
  }
`;

// Character Mutations
export const CREATE_CHARACTER = gql`
  ${CHARACTER_FRAGMENT}
  mutation CreateCharacter($input: CharacterInput!) {
    createCharacter(input: $input) {
      ...CharacterFields
    }
  }
`;

export const UPDATE_CHARACTER = gql`
  ${CHARACTER_FRAGMENT}
  mutation UpdateCharacter($id: String!, $input: CharacterInput!) {
    updateCharacter(id: $id, input: $input) {
      ...CharacterFields
    }
  }
`;

export const DELETE_CHARACTER = gql`
  mutation DeleteCharacter($id: String!) {
    deleteCharacter(id: $id)
  }
`;