/**
 * Public API exports for World Orchestrator module
 *
 * Main export: WorldOrchestrator class for world state management
 * Supporting exports: Types and sub-managers for advanced usage
 */

// Main orchestrator facade
export { WorldOrchestrator } from './WorldOrchestrator';

// Types
export type {
  Result,
  RelationshipPattern,
  EventData,
  ActionAnalysis,
  WorldInfo
} from './types';

// Sub-managers (for advanced usage or testing)
export { IntentProcessor } from './IntentProcessor';
export { EntityManager } from './EntityManager';
export { RelationshipManager } from './RelationshipManager';
export { EventManager } from './EventManager';
export { ActionAnalyzer } from './ActionAnalyzer';
export { EntityTypeInference } from './EntityTypeInference';
