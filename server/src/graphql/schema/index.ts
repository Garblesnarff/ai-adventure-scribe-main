import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON
  scalar Upload

  # Common types
  type Memory {
    id: String!
    content: String!
    type: String!
    importance: Int!
    metadata: JSON
    created_at: DateTime!
    updated_at: DateTime!
    embedding: String
  }

  type NarrationSegment {
    text: String!
    voice_id: String
    voice_settings: VoiceSettings
  }

  type VoiceSettings {
    stability: Float!
    similarity_boost: Float!
  }

  type VoiceContext {
    voice_id: String!
    voice_settings: VoiceSettings!
    model_id: String!
  }

  # AI Operation Types
  type ChatResponse {
    text: String!
    sender: String!
    context: JSON
    metadata: JSON
  }

  type DMResponse {
    response: String!
    context: JSON!
    raw: JSON!
    narrationSegments: [NarrationSegment!]
  }

  type StructuredDMResponse {
    text: String!
    narration_segments: [NarrationSegment!]!
  }

  type CombatContext {
    inCombat: Boolean!
    turn: Int
    participants: [JSON!]
    currentTurn: String
    round: Int
  }

  # Audio Operation Types
  type AudioResponse {
    audioUrl: String!
    audioData: String
    format: String!
    duration: Float
  }

  # Memory Operation Types
  type EmbeddingResponse {
    embedding: String!
    text: String!
  }

  type MemorySearchResult {
    memories: [Memory!]!
    totalCount: Int!
    relevanceScores: [Float!]!
  }

  # Campaign Operation Types
  type Campaign {
    id: String!
    name: String!
    description: String
    genre: String
    world_id: String
    thematic_elements: JSON
    created_at: DateTime!
    updated_at: DateTime!
  }

  type CampaignDescription {
    description: String!
    campaign: Campaign
  }

  # Character Operation Types
  type Character {
    id: String!
    name: String!
    class: String!
    level: Int!
    background: String
    stats: JSON
    equipment: JSON
    spells: JSON
    created_at: DateTime!
    updated_at: DateTime!
  }

  # Rules Operation Types
  type RuleValidation {
    isValid: Boolean!
    rule: String
    explanation: String
    suggestions: [String!]
  }

  type RuleLookup {
    rule: String!
    description: String!
    source: String
    details: JSON
  }

  # Environment Types
  type Environment {
    description: String!
    atmosphere: String!
    sensoryDetails: [String!]!
  }

  type NPCInteraction {
    activeNPCs: [JSON!]!
    reactions: [String!]!
    dialogue: String!
  }

  type GameOpportunities {
    immediate: [String!]!
    nearby: [String!]!
    questHooks: [String!]!
  }

  type GameMechanics {
    availableActions: [String!]!
    relevantRules: [String!]!
    suggestions: [String!]!
  }

  # Input types
  input ChatMessageInput {
    role: String!
    content: String!
    context: JSON
    metadata: JSON
  }

  input AgentContextInput {
    campaignDetails: JSON!
    characterDetails: JSON!
    memories: [JSON!]
  }

  input TaskInput {
    description: String!
    type: String
    parameters: JSON
  }

  input VoiceContextInput {
    voice_id: String!
    voice_settings: VoiceSettingsInput!
    model_id: String!
  }

  input VoiceSettingsInput {
    stability: Float!
    similarity_boost: Float!
  }

  input CombatContextInput {
    inCombat: Boolean!
    turn: Int
    participants: [JSON!]
    currentTurn: String
    round: Int
  }

  input MemoryInput {
    content: String!
    type: String!
    importance: Int!
    metadata: JSON
  }

  input MemorySearchInput {
    query: String!
    sessionId: String!
    limit: Int
    threshold: Float
  }

  input CampaignInput {
    name: String!
    description: String
    genre: String
    world_id: String
    thematic_elements: JSON
  }

  input CharacterInput {
    name: String!
    class: String!
    level: Int!
    background: String
    stats: JSON
    equipment: JSON
    spells: JSON
  }

  input RuleQueryInput {
    query: String!
    context: String
    edition: String
  }

  # Queries
  type Query {
    # Memory operations
    searchMemories(input: MemorySearchInput!): MemorySearchResult!
    getMemory(id: String!): Memory
    getMemories(sessionId: String!, limit: Int, offset: Int): [Memory!]!
    
    # Campaign operations
    getCampaign(id: String!): Campaign
    getCampaigns(userId: String!): [Campaign!]!
    
    # Character operations
    getCharacter(id: String!): Character
    getCharacters(userId: String!): [Character!]!
    
    # Rules operations
    lookupRule(input: RuleQueryInput!): RuleLookup!
    validateRule(input: RuleQueryInput!): RuleValidation!
    
    # Health check
    health: String!
  }

  # Mutations
  type Mutation {
    # AI operations
    generateChatResponse(
      messages: [ChatMessageInput!]!
      sessionId: String!
      context: JSON
    ): ChatResponse!
    
    executeDMAgent(
      task: TaskInput!
      agentContext: AgentContextInput!
      voiceContext: VoiceContextInput
      isFirstMessage: Boolean
      combatContext: CombatContextInput
    ): DMResponse!
    
    executeRulesInterpreter(
      task: TaskInput!
      agentContext: AgentContextInput!
    ): JSON!
    
    # Audio operations
    generateSpeech(
      text: String!
      voiceId: String
      voiceSettings: VoiceSettingsInput
    ): AudioResponse!
    
    # Memory operations
    createMemory(
      input: MemoryInput!
      sessionId: String!
    ): Memory!
    
    generateEmbedding(text: String!): EmbeddingResponse!
    
    updateMemoryImportance(
      memoryId: String!
      importance: Int!
    ): Memory!
    
    # Campaign operations
    createCampaign(input: CampaignInput!): Campaign!
    updateCampaign(id: String!, input: CampaignInput!): Campaign!
    deleteCampaign(id: String!): Boolean!
    
    generateCampaignDescription(
      name: String!
      genre: String!
      context: JSON
    ): CampaignDescription!
    
    # Character operations
    createCharacter(input: CharacterInput!): Character!
    updateCharacter(id: String!, input: CharacterInput!): Character!
    deleteCharacter(id: String!): Boolean!
  }

  # Subscriptions
  type Subscription {
    # Real-time AI response streaming
    streamChatResponse(
      messages: [ChatMessageInput!]!
      sessionId: String!
    ): ChatResponse!
    
    streamDMResponse(
      task: TaskInput!
      agentContext: AgentContextInput!
      voiceContext: VoiceContextInput
    ): DMResponse!
    
    # Memory updates
    memoryUpdated(sessionId: String!): Memory!
    
    # Campaign updates
    campaignUpdated(campaignId: String!): Campaign!
    
    # Character updates
    characterUpdated(characterId: String!): Character!
  }
`;

export default typeDefs;