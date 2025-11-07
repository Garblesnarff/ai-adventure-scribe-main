/**
 * RelationshipManager - Handles relationship creation and management
 *
 * Responsibilities:
 * - Create relationships between entities
 * - Ensure entities exist before creating relationships
 * - Track relationship changes in scene state
 */

import {
  WorldGraph,
  WorldEntity,
  RelationshipCreateRequest
} from '../types';
import { SceneState, DMAction } from '../../scene/types';
import { IntentProcessor } from './IntentProcessor';

export class RelationshipManager {
  private worldGraph: WorldGraph;
  private intentProcessor: IntentProcessor;

  constructor(worldGraph: WorldGraph, intentProcessor: IntentProcessor) {
    this.worldGraph = worldGraph;
    this.intentProcessor = intentProcessor;
  }

  /**
   * Handle relationship establishment intent
   */
  handleRelationshipEstablishment(
    text: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const relationshipData = this.intentProcessor.parseRelationshipIntent(text, sceneState);

    if (!relationshipData) {
      return;
    }

    const subject = this.getOrCreateEntity(
      relationshipData.subjectName,
      relationshipData.subjectType || 'person',
      sceneState
    );

    const object = this.getOrCreateEntity(
      relationshipData.objectName,
      relationshipData.objectType || 'person',
      sceneState
    );

    if (subject && object) {
      this.createRelationship(
        subject,
        object,
        relationshipData.relationshipType,
        text,
        sceneState,
        actions
      );
    }
  }

  /**
   * Create a relationship between two entities
   */
  createRelationship(
    subject: WorldEntity,
    object: WorldEntity,
    relationshipType: string,
    description: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const request: RelationshipCreateRequest = {
      subjectId: subject.id,
      objectId: object.id,
      relationshipType: relationshipType as any,
      description,
      confidenceScore: 0.7,
      sourceType: 'player_action'
    };

    const result = this.worldGraph.createRelationship(request);

    if (result.success && result.data) {
      actions.push({
        type: 'world_relationship_created',
        data: {
          relationship: result.data,
          subject,
          object,
          confidence: result.data.confidenceScore
        }
      } as any);

      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.lastRelationshipAction = {
        relationshipId: result.data.id,
        action: 'created',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get existing entity or create if missing
   */
  private getOrCreateEntity(
    name: string,
    entityType: string,
    sceneState: SceneState
  ): WorldEntity | null {
    const existing = this.worldGraph.queryEntities({ name });

    if (existing.length > 0) {
      return existing[0];
    }

    // Create missing entity with low confidence
    const result = this.worldGraph.createEntity({
      entityType: entityType as any,
      name,
      description: 'Entity mentioned in relationship establishment',
      confidenceScore: 0.3,
      sourceType: 'player_action'
    });

    if (result.success && result.data) {
      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities as string[] || []).concat(result.data.id);
      return result.data;
    }

    return null;
  }
}
