/**
 * ActionAnalyzer - Analyzes action intents for state changes
 *
 * Responsibilities:
 * - Detect entity state changes (death, injury, etc.)
 * - Identify item acquisition/loss
 * - Generate fact updates and relationship changes
 */

import {
  WorldGraph,
  FactUpdateRequest,
  RelationshipCreateRequest
} from '../types';
import { PlayerIntent, SceneState, DMAction } from '../../scene/types';
import { IntentProcessor } from './IntentProcessor';
import { EntityManager } from './EntityManager';
import { ActionAnalysis } from './types';

export class ActionAnalyzer {
  private worldGraph: WorldGraph;
  private intentProcessor: IntentProcessor;
  private entityManager: EntityManager;

  constructor(
    worldGraph: WorldGraph,
    intentProcessor: IntentProcessor,
    entityManager: EntityManager
  ) {
    this.worldGraph = worldGraph;
    this.intentProcessor = intentProcessor;
    this.entityManager = entityManager;
  }

  /**
   * Handle action intents and update relevant world facts
   */
  handleActionIntent(
    intent: PlayerIntent,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const text = this.getIntentText(intent);
    if (!text) return;

    const analysis = this.analyzeActionIntent(text);

    // Update entity states
    analysis.entityUpdates.forEach(update => {
      const result = this.worldGraph.updateEntityFact(update);

      if (result.success && result.data) {
        actions.push({
          type: 'world_fact_updated',
          data: {
            fact: result.data,
            confidence: result.data.confidenceScore
          }
        } as any);
      }
    });

    // Track relationship changes
    analysis.relationshipChanges.forEach(change => {
      const result = this.worldGraph.createRelationship(change);

      if (result.success && result.data) {
        actions.push({
          type: 'world_relationship_updated',
          data: {
            relationship: result.data,
            confidence: result.data.confidenceScore
          }
        } as any);
      }
    });
  }

  /**
   * Analyze action intent for world graph impact
   */
  analyzeActionIntent(text: string): ActionAnalysis {
    const entityUpdates: FactUpdateRequest[] = [];
    const relationshipChanges: RelationshipCreateRequest[] = [];

    const lowerText = text.toLowerCase();

    // Death detection
    if (lowerText.includes('dies') || lowerText.includes('is dead') || lowerText.includes('has been killed')) {
      this.handleDeathDetection(text, entityUpdates);
    }

    // Injury detection
    if (lowerText.includes('injured') || lowerText.includes('wounded') || lowerText.includes('hurt')) {
      this.handleInjuryDetection(text, entityUpdates);
    }

    // Item acquisition
    if (lowerText.includes('takes') || lowerText.includes('picks up') || lowerText.includes('finds')) {
      this.handleItemAcquisitionDetection(text, entityUpdates);
    }

    return { entityUpdates, relationshipChanges };
  }

  private handleDeathDetection(text: string, updates: FactUpdateRequest[]): void {
    const entityName = this.intentProcessor.extractSubjectName(text);
    if (entityName) {
      const candidates = this.worldGraph.queryEntities({ name: entityName });
      if (candidates.length > 0) {
        updates.push({
          entityId: candidates[0].id,
          propertyKey: 'status',
          value: 'destroyed',
          confidenceScore: 0.9
        });
      }
    }
  }

  private handleInjuryDetection(text: string, updates: FactUpdateRequest[]): void {
    const entityName = this.intentProcessor.extractSubjectName(text);
    if (entityName) {
      const candidates = this.worldGraph.queryEntities({ name: entityName });
      if (candidates.length > 0) {
        updates.push({
          entityId: candidates[0].id,
          propertyKey: 'health',
          value: 'injured',
          confidenceScore: 0.8
        });
      }
    }
  }

  private handleItemAcquisitionDetection(text: string, updates: FactUpdateRequest[]): void {
    const itemName = this.intentProcessor.extractObjectName(text);
    if (itemName) {
      const itemUpdates = this.entityManager.handleItemAcquisition(itemName, 'player-1');
      updates.push(...itemUpdates);
    }
  }

  private getIntentText(intent: PlayerIntent): string | null {
    if ('message' in intent) {
      return intent.message;
    }
    return null;
  }
}
