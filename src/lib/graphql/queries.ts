import { gql } from '@apollo/client';

// Fragment definitions for reusability
export const MEMORY_FRAGMENT = gql`
  fragment MemoryFields on Memory {
    id
    content
    type
    importance
    metadata
    created_at
    updated_at
    embedding
  }
`;

export const CAMPAIGN_FRAGMENT = gql`
  fragment CampaignFields on Campaign {
    id
    name
    description
    genre
    world_id
    thematic_elements
    created_at
    updated_at
  }
`;

export const CHARACTER_FRAGMENT = gql`
  fragment CharacterFields on Character {
    id
    name
    class
    level
    background
    stats
    equipment
    spells
    created_at
    updated_at
  }
`;

// Memory queries
export const SEARCH_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query SearchMemories($input: MemorySearchInput!) {
    searchMemories(input: $input) {
      memories {
        ...MemoryFields
      }
      totalCount
      relevanceScores
    }
  }
`;

export const GET_MEMORY = gql`
  ${MEMORY_FRAGMENT}
  query GetMemory($id: String!) {
    getMemory(id: $id) {
      ...MemoryFields
    }
  }
`;

export const GET_MEMORIES = gql`
  ${MEMORY_FRAGMENT}
  query GetMemories($sessionId: String!, $limit: Int, $offset: Int) {
    getMemories(sessionId: $sessionId, limit: $limit, offset: $offset) {
      ...MemoryFields
    }
  }
`;

// Campaign queries
export const GET_CAMPAIGN = gql`
  ${CAMPAIGN_FRAGMENT}
  query GetCampaign($id: String!) {
    getCampaign(id: $id) {
      ...CampaignFields
    }
  }
`;

export const GET_CAMPAIGNS = gql`
  ${CAMPAIGN_FRAGMENT}
  query GetCampaigns($userId: String!) {
    getCampaigns(userId: $userId) {
      ...CampaignFields
    }
  }
`;

// Character queries
export const GET_CHARACTER = gql`
  ${CHARACTER_FRAGMENT}
  query GetCharacter($id: String!) {
    getCharacter(id: $id) {
      ...CharacterFields
    }
  }
`;

export const GET_CHARACTERS = gql`
  ${CHARACTER_FRAGMENT}
  query GetCharacters($userId: String!) {
    getCharacters(userId: $userId) {
      ...CharacterFields
    }
  }
`;

// Rules queries
export const LOOKUP_RULE = gql`
  query LookupRule($input: RuleQueryInput!) {
    lookupRule(input: $input) {
      rule
      description
      source
      details
    }
  }
`;

export const VALIDATE_RULE = gql`
  query ValidateRule($input: RuleQueryInput!) {
    validateRule(input: $input) {
      isValid
      rule
      explanation
      suggestions
    }
  }
`;

// Health check
export const HEALTH_CHECK = gql`
  query HealthCheck {
    health
  }
`;