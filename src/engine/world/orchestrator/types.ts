/**
 * Shared types for World Orchestrator modules
 * Extracted from orchestrator.ts for better organization
 */

import {
  EntityType,
  EntityCreateRequest,
  RelationshipCreateRequest,
  RelationshipType,
  FactUpdateRequest
} from '../types';

/**
 * Generic Result type for operations that can succeed or fail
 */
export interface Result<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parsed relationship data from text intent
 */
export interface RelationshipPattern {
  relationshipType: RelationshipType;
  subjectName: string;
  subjectType?: EntityType;
  objectName: string;
  objectType?: EntityType;
}

/**
 * Extracted event data from narration
 */
export interface EventData {
  name: string;
  occurredAt: Date;
  participants: string[];
}

/**
 * Action analysis result for intent processing
 */
export interface ActionAnalysis {
  entityUpdates: FactUpdateRequest[];
  relationshipChanges: RelationshipCreateRequest[];
}

/**
 * World information extracted from DM actions
 */
export interface WorldInfo {
  entities: Array<{ request: EntityCreateRequest }>;
  relationships: Array<{ request: RelationshipCreateRequest }>;
  facts: Array<{ request: FactUpdateRequest }>;
}

/**
 * Pattern for detecting relationships in text
 */
export interface RelationshipDetectionPattern {
  type: RelationshipType;
  patterns: string[];
  extract: (text: string, match: RegExpMatchArray) => {
    subjectName: string;
    objectName: string;
  };
}
