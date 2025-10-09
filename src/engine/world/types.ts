export interface WorldEntity {
  id: string;
  sessionId: string;
  entityType: EntityType;
  name: string;
  aliases: string[];
  description?: string;
  imageUrl?: string;
  metadata: Record<string, any>;
  status: EntityStatus;
  lifespanStart?: Date;
  lifespanEnd?: Date;
  currentLocationId?: string;
  locationHistory: LocationHistoryEntry[];
  ownerId?: string;
  organizationId?: string;
  tags: string[];
  category?: string;
  confidenceScore: number;
  sourceType: SourceType;
  sourceSessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldRelationship {
  id: string;
  sessionId: string;
  subjectId: string;
  objectId: string;
  relationshipType: RelationshipType;
  description?: string;
  strength: number; // -1 to 1
  mutual: boolean;
  validFrom: Date;
  validUntil?: Date;
  confidenceScore: number;
  sourceType: SourceType;
  sourceSessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldFact {
  id: string;
  sessionId: string;
  factType: FactType;
  subjectId?: string;
  objectId?: string;
  propertyKey?: string;
  propertyValue?: any;
  previousValue?: any;
  observedAt: Date;
  validFrom: Date;
  validUntil?: Date;
  confidenceScore: number;
  verificationMethod: VerificationMethod;
  sourceType: SourceType;
  sourceSessionId: string;
  contradictions: string[];
  supportingFacts: string[];
  confidenceHistory: ConfidenceHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldConflict {
  id: string;
  sessionId: string;
  conflictType: ConflictType;
  description: string;
  severity: ConflictSeverity;
  factA: string;
  factB: string;
  resolutionMethod?: ResolutionMethod;
  resolutionDetails?: Record<string, any>;
  resolvedBy?: string;
  status: ConflictStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface WorldRule {
  id: string;
  sessionId?: string; // null for global rules
  name: string;
  description?: string;
  ruleType: RuleType;
  conditions: RuleCondition;
  consequences: RuleConsequence;
  priority: number;
  enabled: boolean;
  severity: RuleSeverity;
  triggeredCount: number;
  lastTriggered?: Date;
  autoResolve: boolean;
  createdAt: Date;
}

// Enums and unions
export type EntityType = 
  | 'person' 
  | 'place' 
  | 'item' 
  | 'organization' 
  | 'event' 
  | 'concept' 
  | 'creature';

export type EntityStatus = 
  | 'active' 
  | 'inactive' 
  | 'destroyed' 
  | 'unknown';

export type RelationshipType = 
  | 'owns' 
  | 'located_in' 
  | 'member_of' 
  | 'knows' 
  | 'allied_with' 
  | 'enemy_of' 
  | 'works_for' 
  | 'leads' 
  | 'parent_of' 
  | 'child_of' 
  | 'married_to' 
  | 'friend_of'
  | 'uses' 
  | 'carries' 
  | 'guards' 
  | 'serves' 
  | 'follows' 
  | 'trades_with' 
  | 'lives_in'
  | 'controls' 
  | 'protects' 
  | 'hunts' 
  | 'fears' 
  | 'hates' 
  | 'respects' 
  | 'trusts';

export type FactType = 
  | 'entity_property' 
  | 'entity_location' 
  | 'relationship_property' 
  | 'event_occurrence' 
  | 'world_state' 
  | 'rule_fact' 
  | 'derived_fact';

export type SourceType = 
  | 'player_action' 
  | 'dm_statement' 
  | 'rule_derivation' 
  | 'external_fact'
  | 'inferred'
  | 'automatic'
  | 'manual';

export type VerificationMethod = 
  | 'direct' 
  | 'inferred' 
  | 'stated' 
  | 'observed' 
  | 'derived';

export type ConflictType = 
  | 'property_conflict' 
  | 'relationship_conflict' 
  | 'location_conflict' 
  | 'temporal_conflict';

export type ConflictSeverity = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export type ResolutionMethod = 
  | 'manual' 
  | 'automatic' 
  | 'weighted' 
  | 'most_recent' 
  | 'dm_override';

export type ConflictStatus = 
  | 'open' 
  | 'in_review' 
  | 'resolved' 
  | 'ignored';

export type RuleType = 
  | 'consistency' 
  | 'constraint' 
  | 'derivation' 
  | 'business_logic';

export type RuleSeverity = 
  | 'warning' 
  | 'error' 
  | 'critical';

// Supporting interfaces
export interface LocationHistoryEntry {
  locationId: string;
  locationName: string;
  movedAt: Date;
  duration?: number; // minutes
  reason?: string;
}

export interface ConfidenceHistoryEntry {
  score: number;
  changedAt: Date;
  reason: string;
  changedBy: string;
  previousScore: number;
}

export interface RuleCondition {
  entityTypes?: EntityType[];
  relationshipTypes?: RelationshipType[];
  factPatterns?: string[];
  minConfidence?: number;
  requiresLocation?: boolean;
  temporalConditions?: TemporalCondition[];
  customLogic?: string; // JavaScript expression
}

export interface TemporalCondition {
  type: 'before' | 'after' | 'between';
  date?: Date;
  dates?: [Date, Date];
  relativeTo?: string; // fact ID
  relativeDays?: number;
}

export interface RuleConsequence {
  actions: RuleAction[];
  prevent?: boolean;
  warning?: string;
  autoResolve?: ResolutionMethod;
  confidence?: {
    penalty?: number;
    bonus?: number;
    min?: number;
    max?: number;
  };
}

export interface RuleAction {
  type: 'create_fact' | 'update_entity' | 'create_conflict' | 'send_notification' | 'log_event';
  target?: string; // entity/fact ID or pattern
  data?: Record<string, any>;
}

// World graph operations
export interface EntityCreateRequest {
  entityType: EntityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  category?: string;
  confidenceScore?: number;
  sourceType?: SourceType;
}

export interface RelationshipCreateRequest {
  subjectId: string;
  objectId: string;
  relationshipType: RelationshipType;
  description?: string;
  strength?: number;
  mutual?: boolean;
  confidenceScore?: number;
  sourceType?: SourceType;
}

export interface FactUpdateRequest {
  entityId: string;
  propertyKey: string;
  value: any;
  confidenceScore?: number;
  verificationMethod?: VerificationMethod;
  sourceType?: SourceType;
}

// Query and search interfaces
export interface EntityQuery {
  entityTypes?: EntityType[];
  status?: EntityStatus;
  tags?: string[];
  category?: string;
  locationId?: string;
  searchText?: string;
  minConfidence?: number;
  sourceTypes?: SourceType[];
  validAt?: Date;
}

export interface RelationshipQuery {
  subjectId?: string;
  objectId?: string;
  relationshipTypes?: RelationshipType[];
  strengthRange?: [number, number];
  mutual?: boolean;
  validAt?: Date;
  minConfidence?: number;
}

export interface FactQuery {
  factTypes?: FactType[];
  subjectId?: string;
  objectId?: string;
  propertyKey?: string;
  validAt?: Date;
  minConfidence?: number;
  hasContradictions?: boolean;
  sourceTypes?: SourceType[];
}

// World state validation
export interface ValidationResult {
  valid: boolean;
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  conflicts: WorldConflict[];
  recommendations: string[];
}

export interface ValidationMessage {
  type: 'warning' | 'error' | 'info';
  message: string;
  entityId?: string;
  factId?: string;
  ruleId?: string;
  severity: RuleSeverity;
  autoFixable: boolean;
  suggestedFix?: string;
}

// World graph snapshot for debugging
export interface WorldGraphSnapshot {
  sessionId: string;
  timestamp: Date;
  entities: WorldEntity[];
  relationships: WorldRelationship[];
  facts: WorldFact[];
  conflicts: WorldConflict[];
  rules: WorldRule[];
  metrics: {
    entityCount: number;
    relationshipCount: number;
    factCount: number;
    conflictCount: number;
    averageConfidence: number;
  };
}
