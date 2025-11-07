/**
 * WorldOrchestrator - Main facade for world graph integration with scene orchestration
 *
 * Responsibilities:
 * - Coordinate between all sub-managers (Entity, Relationship, Event, Action)
 * - Process player intents and DM actions
 * - Maintain consistent world state across game sessions
 * - Provide unified interface for world operations
 *
 * Design Pattern: Facade Pattern - simplifies complex subsystem interactions
 */

import {
  WorldGraph,
  ConsistencyEngine,
  TemporalTracker
} from '../types';
import {
  SceneState,
  PlayerIntent,
  DMAction
} from '../../scene/types';
import { Result, WorldInfo } from './types';
import { IntentProcessor } from './IntentProcessor';
import { EntityManager } from './EntityManager';
import { RelationshipManager } from './RelationshipManager';
import { EventManager } from './EventManager';
import { ActionAnalyzer } from './ActionAnalyzer';

/**
 * World Graph integration with Scene Orchestrator
 * Maintains consistent world state across game sessions
 */
export class WorldOrchestrator {
  private worldGraph: WorldGraph;
  private consistencyEngine: ConsistencyEngine;
  private temporalTracker: TemporalTracker;
  private sessionId: string;

  // Sub-managers
  private intentProcessor: IntentProcessor;
  private entityManager: EntityManager;
  private relationshipManager: RelationshipManager;
  private eventManager: EventManager;
  private actionAnalyzer: ActionAnalyzer;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.worldGraph = new WorldGraph(sessionId);
    this.consistencyEngine = new ConsistencyEngine();
    this.temporalTracker = new TemporalTracker();

    // Initialize sub-managers
    this.intentProcessor = new IntentProcessor();
    this.entityManager = new EntityManager(this.worldGraph, this.intentProcessor);
    this.relationshipManager = new RelationshipManager(this.worldGraph, this.intentProcessor);
    this.eventManager = new EventManager(this.worldGraph, this.intentProcessor);
    this.actionAnalyzer = new ActionAnalyzer(
      this.worldGraph,
      this.intentProcessor,
      this.entityManager
    );
  }

  /**
   * Process player intent and update world graph accordingly
   */
  processPlayerIntent(intent: PlayerIntent, sceneState: SceneState): Result<DMAction> {
    const actions: DMAction[] = [];

    try {
      const intentType = intent.type;

      switch (intentType) {
        case 'ooc':
          if ('message' in intent) {
            this.handleOOCIntent(intent.message, sceneState, actions);
          }
          break;

        case 'attack':
        case 'cast':
          this.actionAnalyzer.handleActionIntent(intent, sceneState, actions);
          break;

        default:
          // Let regular scene orchestrator handle other intent types
          break;
      }

      return { success: true, data: actions.length > 0 ? actions[0] : undefined };
    } catch (error) {
      return {
        success: false,
        error: `World orchestrator error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process DM actions and update world graph
   */
  processDMAction(action: DMAction, sceneState: SceneState): Result<void> {
    try {
      const worldInfo = this.extractWorldInfo(action);

      if (worldInfo) {
        const { entities, relationships, facts } = worldInfo;

        // Process entities
        entities.forEach(entityData => {
          this.worldGraph.createEntity(entityData.request);
        });

        // Process relationships
        relationships.forEach(relData => {
          this.worldGraph.createRelationship(relData.request);
        });

        // Process facts
        facts.forEach(factData => {
          this.worldGraph.updateEntityFact(factData.request);
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process DM world action: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle out-of-character intent messages
   */
  private handleOOCIntent(message: string, sceneState: SceneState, actions: DMAction[]): void {
    const lowerMessage = message.toLowerCase();

    // Entity description
    if (this.isEntityDescription(lowerMessage)) {
      this.entityManager.handleEntityDescription(message, sceneState, actions);
    }
    // Relationship establishment
    else if (this.isRelationshipStatement(lowerMessage)) {
      this.relationshipManager.handleRelationshipEstablishment(message, sceneState, actions);
    }
    // Location statement
    else if (this.isLocationStatement(lowerMessage)) {
      this.entityManager.handleLocationStatement(message, sceneState, actions);
    }
    // Event narration
    else if (this.isEventNarration(lowerMessage)) {
      this.eventManager.handleEventNarration(message, sceneState, actions);
    }
  }

  /**
   * Extract world information from DM actions
   */
  private extractWorldInfo(action: DMAction): WorldInfo | null {
    // This would use NLP to extract structured information
    // For now, return null as it requires additional implementation
    return null;
  }

  // Intent classification helpers
  private isEntityDescription(text: string): boolean {
    return text.includes('is a') || text.includes('is the') || text.includes('describe');
  }

  private isRelationshipStatement(text: string): boolean {
    return text.includes('friend') || text.includes('enemy') ||
           text.includes('parent') || text.includes('works for');
  }

  private isLocationStatement(text: string): boolean {
    return text.includes('went to') || text.includes('traveled to') ||
           text.includes('located in') || text.includes('at the');
  }

  private isEventNarration(text: string): boolean {
    return text.includes('there was') || text.includes('happened') ||
           text.includes('battle') || text.includes('meeting');
  }
}
