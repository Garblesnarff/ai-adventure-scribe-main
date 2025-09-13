import { GraphQLResolveInfo } from 'graphql';

// Context type for GraphQL resolvers
export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  supabase: any; // Supabase client
  loaders: {
    memoryLoader: any;
    campaignLoader: any;
    characterLoader: any;
  };
  pubsub: any; // PubSub instance for subscriptions
}

// Base types for domain entities
export interface Memory {
  id: string;
  content: string;
  type: string;
  importance: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  embedding?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  world_id?: string;
  thematic_elements?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  background?: string;
  stats?: Record<string, any>;
  equipment?: Record<string, any>;
  spells?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// AI response types
export interface ChatMessage {
  role: string;
  content: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  text: string;
  sender: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

export interface VoiceContext {
  voice_id: string;
  voice_settings: VoiceSettings;
  model_id: string;
}

export interface NarrationSegment {
  text: string;
  voice_id?: string;
  voice_settings?: VoiceSettings;
}

export interface DMResponse {
  response: string;
  context: Record<string, any>;
  raw: Record<string, any>;
  narrationSegments?: NarrationSegment[];
}

export interface StructuredDMResponse {
  text: string;
  narration_segments: NarrationSegment[];
}

export interface CombatContext {
  inCombat: boolean;
  turn?: number;
  participants?: Record<string, any>[];
  currentTurn?: string;
  round?: number;
}

// Task and agent context types
export interface Task {
  description: string;
  type?: string;
  parameters?: Record<string, any>;
}

export interface AgentContext {
  campaignDetails: Record<string, any>;
  characterDetails: Record<string, any>;
  memories?: Record<string, any>[];
}

// Audio types
export interface AudioResponse {
  audioUrl?: string;
  audioData?: string;
  format: string;
  duration?: number;
}

// Memory operation types
export interface EmbeddingResponse {
  embedding: string;
  text: string;
}

export interface MemorySearchResult {
  memories: Memory[];
  totalCount: number;
  relevanceScores: number[];
}

// Campaign operation types
export interface CampaignDescription {
  description: string;
  campaign?: Campaign;
}

// Rules operation types
export interface RuleValidation {
  isValid: boolean;
  rule?: string;
  explanation?: string;
  suggestions?: string[];
}

export interface RuleLookup {
  rule: string;
  description: string;
  source?: string;
  details?: Record<string, any>;
}

// Input types
export interface ChatMessageInput {
  role: string;
  content: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentContextInput {
  campaignDetails: Record<string, any>;
  characterDetails: Record<string, any>;
  memories?: Record<string, any>[];
}

export interface TaskInput {
  description: string;
  type?: string;
  parameters?: Record<string, any>;
}

export interface VoiceContextInput {
  voice_id: string;
  voice_settings: VoiceSettingsInput;
  model_id: string;
}

export interface VoiceSettingsInput {
  stability: number;
  similarity_boost: number;
}

export interface CombatContextInput {
  inCombat: boolean;
  turn?: number;
  participants?: Record<string, any>[];
  currentTurn?: string;
  round?: number;
}

export interface MemoryInput {
  content: string;
  type: string;
  importance: number;
  metadata?: Record<string, any>;
}

export interface MemorySearchInput {
  query: string;
  sessionId: string;
  limit?: number;
  threshold?: number;
}

export interface CampaignInput {
  name: string;
  description?: string;
  genre?: string;
  world_id?: string;
  thematic_elements?: Record<string, any>;
}

export interface CharacterInput {
  name: string;
  class: string;
  level: number;
  background?: string;
  stats?: Record<string, any>;
  equipment?: Record<string, any>;
  spells?: Record<string, any>;
}

export interface RuleQueryInput {
  query: string;
  context?: string;
  edition?: string;
}

// Resolver function types
export type Resolver<TResult, TParent = {}, TArgs = {}, TContext = GraphQLContext> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionResolver<TResult, TParent = {}, TArgs = {}, TContext = GraphQLContext> = {
  subscribe: Resolver<AsyncIterableIterator<TResult>, TParent, TArgs, TContext>;
  resolve?: Resolver<TResult, TParent, TArgs, TContext>;
};

// Resolver map types
export interface QueryResolvers {
  searchMemories: Resolver<MemorySearchResult, {}, { input: MemorySearchInput }>;
  getMemory: Resolver<Memory | null, {}, { id: string }>;
  getMemories: Resolver<Memory[], {}, { sessionId: string; limit?: number; offset?: number }>;
  getCampaign: Resolver<Campaign | null, {}, { id: string }>;
  getCampaigns: Resolver<Campaign[], {}, { userId: string }>;
  getCharacter: Resolver<Character | null, {}, { id: string }>;
  getCharacters: Resolver<Character[], {}, { userId: string }>;
  lookupRule: Resolver<RuleLookup, {}, { input: RuleQueryInput }>;
  validateRule: Resolver<RuleValidation, {}, { input: RuleQueryInput }>;
  health: Resolver<string>;
}

export interface MutationResolvers {
  generateChatResponse: Resolver<ChatResponse, {}, { messages: ChatMessageInput[]; sessionId: string; context?: Record<string, any> }>;
  executeDMAgent: Resolver<DMResponse, {}, { task: TaskInput; agentContext: AgentContextInput; voiceContext?: VoiceContextInput; isFirstMessage?: boolean; combatContext?: CombatContextInput }>;
  executeRulesInterpreter: Resolver<Record<string, any>, {}, { task: TaskInput; agentContext: AgentContextInput }>;
  generateSpeech: Resolver<AudioResponse, {}, { text: string; voiceId?: string; voiceSettings?: VoiceSettingsInput }>;
  createMemory: Resolver<Memory, {}, { input: MemoryInput; sessionId: string }>;
  generateEmbedding: Resolver<EmbeddingResponse, {}, { text: string }>;
  updateMemoryImportance: Resolver<Memory, {}, { memoryId: string; importance: number }>;
  createCampaign: Resolver<Campaign, {}, { input: CampaignInput }>;
  updateCampaign: Resolver<Campaign, {}, { id: string; input: CampaignInput }>;
  deleteCampaign: Resolver<boolean, {}, { id: string }>;
  generateCampaignDescription: Resolver<CampaignDescription, {}, { name: string; genre: string; context?: Record<string, any> }>;
  createCharacter: Resolver<Character, {}, { input: CharacterInput }>;
  updateCharacter: Resolver<Character, {}, { id: string; input: CharacterInput }>;
  deleteCharacter: Resolver<boolean, {}, { id: string }>;
}

export interface SubscriptionResolvers {
  streamChatResponse: SubscriptionResolver<ChatResponse, {}, { messages: ChatMessageInput[]; sessionId: string }>;
  streamDMResponse: SubscriptionResolver<DMResponse, {}, { task: TaskInput; agentContext: AgentContextInput; voiceContext?: VoiceContextInput }>;
  memoryUpdated: SubscriptionResolver<Memory, {}, { sessionId: string }>;
  campaignUpdated: SubscriptionResolver<Campaign, {}, { campaignId: string }>;
  characterUpdated: SubscriptionResolver<Character, {}, { characterId: string }>;
}

export interface Resolvers {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
  Subscription: SubscriptionResolvers;
}