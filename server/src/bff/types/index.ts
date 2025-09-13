/**
 * BFF (Backend-for-Frontend) Type Definitions
 * 
 * Defines React-optimized data structures that eliminate the impedance
 * mismatch between generic APIs and frontend component requirements.
 */

// Base types for React components
export interface ReactComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Game session types optimized for React components
export interface BFFGameSessionData {
  id: string;
  campaignId: string;
  characterId: string;
  turnCount: number;
  currentScene: {
    description: string;
    location: string;
    npcs: BFFNPCData[];
    environment: string;
    mood: string;
  };
  recentMessages: BFFMessageData[];
  sessionState: 'active' | 'paused' | 'ended';
  realTimeUpdates: boolean;
  combatStatus: BFFCombatStatus;
  audioSettings: BFFAudioSettings;
}

// Character dashboard optimized data
export interface BFFCharacterDashboard {
  character: BFFCharacterData;
  stats: BFFCharacterStats;
  inventory: BFFInventoryItem[];
  spells: BFFSpellData[];
  activeEffects: BFFActiveEffect[];
  combatReadiness: BFFCombatReadiness;
  progressMetrics: BFFProgressMetrics;
}

// Campaign overview with aggregated data
export interface BFFCampaignOverview {
  campaign: BFFCampaignData;
  characters: BFFCharacterSummary[];
  recentSessions: BFFSessionSummary[];
  worldState: BFFWorldState;
  generatedContent: BFFGeneratedContent;
  timeline: BFFTimelineEvent[];
}

// Real-time message data
export interface BFFMessageData {
  id: string;
  type: 'user' | 'dm' | 'system' | 'combat' | 'dice';
  content: string;
  timestamp: Date;
  characterId?: string;
  metadata: {
    isStreaming?: boolean;
    hasAudio?: boolean;
    combatData?: BFFCombatData;
    diceRolls?: BFFDiceRoll[];
    reactions?: BFFReaction[];
  };
  streamingState?: 'pending' | 'streaming' | 'complete' | 'error';
}

// Memory context for sessions
export interface BFFMemoryContext {
  sessionMemories: BFFMemoryEntry[];
  characterMemories: BFFMemoryEntry[];
  campaignMemories: BFFMemoryEntry[];
  contextualMemories: BFFMemoryEntry[];
  totalMemories: number;
  memorySearchResults?: BFFMemoryEntry[];
  semanticContext: string[];
}

// Audio streaming and management
export interface BFFAudioPlayer {
  currentTrack?: BFFAudioTrack;
  queue: BFFAudioTrack[];
  voiceSettings: BFFVoiceSettings;
  streamingStatus: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  audioHistory: BFFAudioTrack[];
  backgroundMusic: BFFBackgroundMusic;
}

// WebSocket real-time data
export interface BFFWebSocketData {
  type: 'message' | 'combat' | 'session_update' | 'character_update' | 'dice_roll' | 'presence';
  payload: any;
  timestamp: Date;
  sessionId: string;
  userId: string;
}

// Supporting interfaces
export interface BFFNPCData {
  id: string;
  name: string;
  description: string;
  role: string;
  isInCombat: boolean;
  relationship: string;
  lastInteraction: Date;
}

export interface BFFCombatStatus {
  isActive: boolean;
  currentTurn: number;
  turnOrder: string[];
  initiative: Record<string, number>;
  combatants: BFFCombatant[];
  roundNumber: number;
  phase: 'setup' | 'active' | 'ended';
}

export interface BFFAudioSettings {
  voiceEnabled: boolean;
  backgroundMusicEnabled: boolean;
  volume: number;
  voiceId: string;
  musicVolume: number;
  soundEffectsVolume: number;
}

export interface BFFCharacterData {
  id: string;
  name: string;
  level: number;
  class: string;
  race: string;
  background: string;
  hitPoints: BFFHitPoints;
  armorClass: number;
  speed: number;
  proficiencyBonus: number;
  alignment: string;
  portraitUrl?: string;
}

export interface BFFCharacterStats {
  abilityScores: BFFAbilityScores;
  savingThrows: BFFSavingThrows;
  skills: BFFSkills;
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  senses: string[];
  languages: string[];
}

export interface BFFAbilityScores {
  strength: { value: number; modifier: number; saveProficient: boolean };
  dexterity: { value: number; modifier: number; saveProficient: boolean };
  constitution: { value: number; modifier: number; saveProficient: boolean };
  intelligence: { value: number; modifier: number; saveProficient: boolean };
  wisdom: { value: number; modifier: number; saveProficient: boolean };
  charisma: { value: number; modifier: number; saveProficient: boolean };
}

export interface BFFSavingThrows {
  [key: string]: { modifier: number; proficient: boolean };
}

export interface BFFSkills {
  [key: string]: { modifier: number; proficient: boolean; expertise: boolean };
}

export interface BFFHitPoints {
  current: number;
  maximum: number;
  temporary: number;
  hitDice: BFFHitDice[];
}

export interface BFFHitDice {
  die: string;
  current: number;
  maximum: number;
}

export interface BFFInventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  weight: number;
  description: string;
  rarity: string;
  equipped: boolean;
  properties: string[];
  value: { amount: number; currency: string };
}

export interface BFFSpellData {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  prepared: boolean;
  ritual: boolean;
  concentration: boolean;
}

export interface BFFActiveEffect {
  id: string;
  name: string;
  description: string;
  duration: string;
  source: string;
  type: 'buff' | 'debuff' | 'condition';
  remainingRounds?: number;
}

export interface BFFCombatReadiness {
  initiative: number;
  armorClass: number;
  hitPoints: BFFHitPoints;
  spellSlots: BFFSpellSlots;
  actions: BFFCombatAction[];
  reactions: BFFCombatAction[];
  bonusActions: BFFCombatAction[];
}

export interface BFFSpellSlots {
  [level: number]: { current: number; maximum: number };
}

export interface BFFCombatAction {
  name: string;
  type: 'attack' | 'spell' | 'ability' | 'item';
  description: string;
  available: boolean;
  cooldown?: number;
}

export interface BFFProgressMetrics {
  experience: { current: number; nextLevel: number };
  sessionStats: {
    messagesThisSession: number;
    combatRoundsThisSession: number;
    diceRolledThisSession: number;
  };
  campaignProgress: {
    totalSessions: number;
    totalCombats: number;
    levelsGained: number;
  };
}

export interface BFFCampaignData {
  id: string;
  name: string;
  description: string;
  genre: string;
  setting: string;
  status: 'active' | 'paused' | 'completed';
  backgroundImage?: string;
  currentArc: string;
  difficulty: string;
}

export interface BFFCharacterSummary {
  id: string;
  name: string;
  level: number;
  class: string;
  lastSeen: Date;
  isOnline: boolean;
  portraitUrl?: string;
}

export interface BFFSessionSummary {
  id: string;
  date: Date;
  duration: number;
  turnCount: number;
  highlights: string[];
  participants: string[];
}

export interface BFFWorldState {
  currentDate: string;
  currentLocation: string;
  weather: string;
  timeOfDay: string;
  seasonalEffects: string[];
  activeEvents: BFFWorldEvent[];
}

export interface BFFWorldEvent {
  id: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  duration: string;
  affectedAreas: string[];
}

export interface BFFGeneratedContent {
  recentNPCs: BFFNPCData[];
  recentLocations: BFFLocationData[];
  recentPlotHooks: BFFPlotHook[];
  worldBuilding: BFFWorldBuildingElement[];
}

export interface BFFLocationData {
  id: string;
  name: string;
  type: string;
  description: string;
  features: string[];
  connectedTo: string[];
  currentOccupants: string[];
}

export interface BFFPlotHook {
  id: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  relatedNPCs: string[];
  suggestedLevel: number;
}

export interface BFFWorldBuildingElement {
  id: string;
  type: 'culture' | 'history' | 'geography' | 'politics' | 'religion';
  name: string;
  description: string;
  relevance: 'background' | 'current' | 'future';
}

export interface BFFTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'session' | 'character' | 'world' | 'plot';
  participants: string[];
  impact: 'minor' | 'major' | 'critical';
}

export interface BFFMemoryEntry {
  id: string;
  content: string;
  type: 'conversation' | 'action' | 'event' | 'observation';
  timestamp: Date;
  importance: 'low' | 'medium' | 'high';
  tags: string[];
  contextScore: number;
  relatedMemories: string[];
}

export interface BFFAudioTrack {
  id: string;
  text: string;
  audioUrl: string;
  voiceId: string;
  duration: number;
  character?: string;
  type: 'narration' | 'dialogue' | 'effect';
}

export interface BFFVoiceSettings {
  currentVoiceId: string;
  speed: number;
  pitch: number;
  volume: number;
  availableVoices: BFFVoiceOption[];
}

export interface BFFVoiceOption {
  id: string;
  name: string;
  description: string;
  gender: string;
  accent: string;
  isPreferred: boolean;
}

export interface BFFBackgroundMusic {
  currentTrack?: string;
  mood: string;
  volume: number;
  isPlaying: boolean;
  playlist: string[];
}

export interface BFFCombatData {
  actions: BFFCombatAction[];
  damage: BFFDamageRoll[];
  conditions: string[];
  initiative?: number;
}

export interface BFFCombatant {
  id: string;
  name: string;
  isPlayer: boolean;
  hitPoints: BFFHitPoints;
  armorClass: number;
  initiative: number;
  conditions: string[];
  position: { x: number; y: number };
}

export interface BFFDamageRoll {
  type: string;
  amount: number;
  die: string;
  rolls: number[];
}

export interface BFFDiceRoll {
  type: string;
  dice: string;
  result: number;
  rolls: number[];
  modifier: number;
  advantage: boolean;
  disadvantage: boolean;
  critical: boolean;
}

export interface BFFReaction {
  id: string;
  emoji: string;
  count: number;
  userReacted: boolean;
}

// Request/Response types for BFF endpoints
export interface BFFGameSessionRequest {
  campaignId: string;
  characterId: string;
  includeRealtimeUpdates?: boolean;
}

export interface BFFGameSessionResponse {
  success: boolean;
  data: BFFGameSessionData;
  websocketUrl?: string;
  error?: string;
}

export interface BFFCharacterDashboardRequest {
  characterId: string;
  campaignId?: string;
  includeDetailedStats?: boolean;
}

export interface BFFCharacterDashboardResponse {
  success: boolean;
  data: BFFCharacterDashboard;
  error?: string;
}

export interface BFFCampaignOverviewRequest {
  campaignId: string;
  includeGeneratedContent?: boolean;
  timelineDepth?: number;
}

export interface BFFCampaignOverviewResponse {
  success: boolean;
  data: BFFCampaignOverview;
  error?: string;
}

export interface BFFStreamingChatRequest {
  sessionId: string;
  message: string;
  characterId: string;
  includeAudio?: boolean;
  voiceId?: string;
}

export interface BFFStreamingChatResponse {
  success: boolean;
  streamId: string;
  sseUrl: string;
  error?: string;
}

export interface BFFMemoryContextRequest {
  sessionId: string;
  query?: string;
  contextType?: 'session' | 'character' | 'campaign' | 'all';
  limit?: number;
}

export interface BFFMemoryContextResponse {
  success: boolean;
  data: BFFMemoryContext;
  error?: string;
}

// Error handling types
export interface BFFError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
}

export interface BFFValidationError extends BFFError {
  field: string;
  value: any;
  constraint: string;
}

// Caching and optimization types
export interface BFFCacheConfig {
  ttl: number;
  key: string;
  strategy: 'memory' | 'redis' | 'database';
  invalidationTriggers: string[];
}

export interface BFFPrefetchConfig {
  endpoint: string;
  trigger: 'route_change' | 'user_action' | 'time_based';
  priority: 'high' | 'medium' | 'low';
  conditions?: Record<string, any>;
}

// WebSocket event types
export type BFFWebSocketEventType = 
  | 'session_join'
  | 'session_leave'
  | 'message_sent'
  | 'message_received'
  | 'combat_start'
  | 'combat_end'
  | 'turn_change'
  | 'dice_roll'
  | 'character_update'
  | 'session_update'
  | 'typing_start'
  | 'typing_stop'
  | 'presence_update';

export interface BFFWebSocketEvent {
  type: BFFWebSocketEventType;
  payload: any;
  timestamp: Date;
  sessionId: string;
  userId: string;
  characterId?: string;
}