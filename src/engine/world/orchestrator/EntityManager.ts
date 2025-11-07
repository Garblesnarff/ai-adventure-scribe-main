/**
 * EntityManager - Handles entity creation, updates, and location management
 *
 * Responsibilities:
 * - Create and update entities in the world graph
 * - Manage entity descriptions and facts
 * - Handle entity location changes
 * - Track entity state changes (health, status, etc.)
 */

import {
  WorldGraph,
  WorldEntity,
  EntityCreateRequest,
  FactUpdateRequest
} from '../types';
import { SceneState, DMAction } from '../../scene/types';
import { IntentProcessor } from './IntentProcessor';
import { Result } from './types';

export class EntityManager {
  private worldGraph: WorldGraph;
  private intentProcessor: IntentProcessor;

  constructor(worldGraph: WorldGraph, intentProcessor: IntentProcessor) {
    this.worldGraph = worldGraph;
    this.intentProcessor = intentProcessor;
  }

  /**
   * Handle entity description intent - create or update entity
   */
  handleEntityDescription(
    text: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const entityName = this.intentProcessor.extractEntityName(text);

    if (!entityName) {
      return;
    }

    const existing = this.worldGraph.queryEntities({ name: entityName });

    if (existing.length === 0) {
      this.createNewEntity(text, entityName, sceneState, actions);
    } else {
      this.updateExistingEntity(text, existing[0], sceneState, actions);
    }
  }

  /**
   * Handle location statement intent - move entity to location
   */
  handleLocationStatement(
    text: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const locationName = this.intentProcessor.extractLocationName(text);

    if (!locationName) {
      return;
    }

    const location = this.getOrCreateLocation(locationName, text, sceneState, actions);

    if (location) {
      this.moveEntityToLocation(text, location, sceneState, actions);
    }
  }

  /**
   * Handle item acquisition
   */
  handleItemAcquisition(itemName: string, currentPlayerId: string): FactUpdateRequest[] {
    const updates: FactUpdateRequest[] = [];
    const existingItems = this.worldGraph.queryEntities({
      name: itemName,
      entityType: 'item'
    });

    if (existingItems.length === 0) {
      const result = this.worldGraph.createEntity({
        entityType: 'item',
        name: itemName,
        description: 'Item mentioned in conversation',
        confidenceScore: 0.4
      });

      if (result.success && result.data) {
        updates.push({
          entityId: result.data.id,
          propertyKey: 'owner',
          value: currentPlayerId || 'unknown'
        });
      }
    }

    return updates;
  }

  /**
   * Update entity state (health, status, etc.)
   */
  updateEntityState(entityId: string, propertyKey: string, value: any, confidence = 0.8): Result<any> {
    return this.worldGraph.updateEntityFact({
      entityId,
      propertyKey,
      value,
      confidenceScore: confidence
    });
  }

  private createNewEntity(
    text: string,
    entityName: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const entityType = this.intentProcessor.inferEntityType(text);
    const request: EntityCreateRequest = {
      entityType,
      name: entityName,
      description: text,
      confidenceScore: 0.8,
      sourceType: 'player_action'
    };

    const result = this.worldGraph.createEntity(request);

    if (result.success && result.data) {
      actions.push({
        type: 'world_entity_created',
        data: {
          entity: result.data,
          confidence: result.data.confidenceScore
        }
      } as any);

      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities as string[] || []).concat(result.data.id);
      sceneState.metadata.lastEntityAction = {
        entityId: result.data.id,
        action: 'created',
        timestamp: new Date().toISOString()
      };
    }
  }

  private updateExistingEntity(
    text: string,
    entity: WorldEntity,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    const factRequest: FactUpdateRequest = {
      entityId: entity.id,
      propertyKey: 'description',
      value: text,
      confidenceScore: 0.9,
      sourceType: 'player_action'
    };

    const result = this.worldGraph.updateEntityFact(factRequest);

    if (result.success && result.data) {
      actions.push({
        type: 'world_entity_updated',
        data: {
          entity,
          fact: result.data,
          confidence: result.data.confidenceScore
        }
      } as any);

      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.lastEntityAction = {
        entityId: entity.id,
        action: 'updated',
        timestamp: new Date().toISOString()
      };
    }
  }

  private getOrCreateLocation(
    locationName: string,
    text: string,
    sceneState: SceneState,
    actions: DMAction[]
  ): WorldEntity | null {
    const existingLocations = this.worldGraph.queryEntities({
      name: locationName,
      entityType: 'place'
    });

    if (existingLocations.length > 0) {
      return existingLocations[0];
    }

    const result = this.worldGraph.createEntity({
      entityType: 'place',
      name: locationName,
      description: `Location mentioned by: ${text}`,
      confidenceScore: 0.6,
      sourceType: 'player_action'
    });

    if (result.success && result.data) {
      sceneState.metadata = sceneState.metadata || {};
      sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities as string[] || []).concat(result.data.id);

      actions.push({
        type: 'world_location_created',
        data: {
          location: result.data,
          confidence: result.data.confidenceScore
        }
      } as any);

      return result.data;
    }

    return null;
  }

  private moveEntityToLocation(
    text: string,
    location: WorldEntity,
    sceneState: SceneState,
    actions: DMAction[]
  ): void {
    // This would need access to character context to identify which entity moved
    // For now, we'll skip the actual implementation as it requires additional context
  }
}
