import {
  WorldEntity,
  WorldRelationship,
  WorldFact,
  WorldGraph,
  ConsistencyEngine,
  TemporalTracker,
  EntityCreateRequest,
  RelationshipCreateRequest,
  FactUpdateRequest,
  EntityQuery,
  RelationshipQuery,
  FactQuery,
  ValidationResult,
  WorldGraphSnapshot,
  Result
} from './types';

import {
  SceneScheme,
  PlayerIntent,
  DMAction,
  RulesEvent,
  SceneState,
  EventLogEntry
} from '../scene/types';

/**
 * World Graph integration with Scene Orchestrator
 * Maintains consistent world state across game sessions
 */
export class WorldOrchestrator {
  private worldGraph: WorldGraph;
  private consistencyEngine: ConsistencyEngine;
  private temporalTracker: TemporalTracker;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.worldGraph = new WorldGraph(sessionId);
    this.consistencyEngine = new ConsistencyEngine();
    this.temporalTracker = new TemporalTracker();
  }

  /**
   * Process player intent and update world graph accordingly
   */
  processPlayerIntent(intent: PlayerIntent, sceneState: SceneState): Result<DMAction> {
    const actions: DMAction[] = [];

    try {
      switch (intent.type) {
        case 'describe_entity':
          this.handleEntityDescription(intent, sceneState, actions);
          break;

        case 'establish_relationship':
          this.handleRelationshipEstablishment(intent, sceneState, actions);
          break;

        case 'state_location':
          this.handleLocationStatement(intent, sceneState, actions);
          break;

        case 'narrate_event':
          this.handleEventNarration(intent, sceneState, actions);
          break;

        case 'ask_question':
          // Questions don't modify world state
          break;

        case 'attack_action':
        case 'casting_spell':
          this.handleActionIntent(intent, sceneState, actions);
          break;

        default:
          // Let regular scene orchestrator handle other intents
          break;
      }

      return { success: true, data: actions.length > 0 ? actions[0] : null };
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
      // Extract world information from DM actions
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
   * Handle entity description intent
   */
  private handleEntityDescription(intent: PlayerIntent, sceneState: SceneState, actions: DMAction[]): DMAction[] {
    const entityName = this.extractEntityName(intent.text);
    
    if (!entityName) {
      return;
    }

    // Check if entity already exists
    const existing = this.worldGraph.queryEntities({
      name: entityName
    });

    if (existing.length === 0) {
      // Create new entity
      const entityType = this.inferEntityType(intent.text, sceneState);
      const request: EntityCreateRequest = {
        entityType,
        name: entityName,
        description: intent.text,
        confidenceScore: 0.8,
        sourceType: 'player_action'
      };

      const result = this.worldGraph.createEntity(request);
      
      if (result.success) {
        actions.push({
          type: 'world_entity_created',
          data: {
            entity: result.data,
            confidence: result.data.confidenceScore
          }
        } as DMAction);

        // Update scene to include the new entity
        sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities || []).concat(result.data.id);
        sceneState.metadata.lastEntityAction = {
          entityId: result.data.id,
          action: 'created',
          timestamp: new Date().toISOString()
        };
      }
    } else {
      // Update existing entity
      const entity = existing[0];
      const factRequest: FactUpdateRequest = {
        entityId: entity.id,
        propertyKey: 'description',
        value: intent.text,
        confidenceScore: 0.9,
        sourceType: 'player_action'
      };

      const result = this.worldGraph.updateEntityFact(factRequest);
      
      if (result.success) {
        actions.push({
          type: 'world_entity_updated',
          data: {
            entity,
            fact: result.data,
            confidence: result.data.confidenceScore
          }
        } as DMAction);
        
        sceneState.metadata.lastEntityAction = {
          entityId: entity.id,
          action: 'updated',
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Handle relationship establishment intent
   */
  private handleRelationshipEstablishment(intent: PlayerIntent, sceneState: SceneState, actions: DMAction[]): DMAction[] {
    const relationshipData = this.parseRelationshipIntent(intent.text, sceneState);
    
    if (!relationshipData) {
      return;
    }

    // Check if entities exist
    const subject = this.worldGraph.queryEntities({
      name: relationshipData.subjectName
    });

    const object = this.worldGraph.queryEntities({
      name: relationshipData.objectName
    });

    if (subject.length === 0 || object.length === 0) {
      // Create missing entities if needed
      if (subject.length === 0) {
        const subjectResult = this.worldGraph.createEntity({
          entityType: relationshipData.subjectType || 'person',
          name: relationshipData.subjectName,
          description: `Entity mentioned in relationship establishment`,
          confidenceScore: 0.3,
          sourceType: 'player_action'
        });
        
        if (subjectResult.success) {
          subject.push(subjectResult.data);
          sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities || []).concat(subjectResult.data.id);
        }
      }

      if (object.length === 0) {
        const objectResult = this.worldGraph.createEntity({
          entityType: relationshipData.objectType || 'person',
          name: relationshipData.objectName,
          description: `Entity mentioned in relationship establishment`,
          confidenceScore: 0.3,
          sourceType: 'player_action'
        });
        
        if (objectResult.success) {
          object.push(objectResult.data);
          sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities || []).concat(objectResult.data.id);
        }
      }
    }

    // Create the relationship
    const request: RelationshipCreateRequest = {
      subjectId: subject[0].id,
      objectId: object[0].id,
      relationshipType: relationshipData.relationshipType,
      description: intent.text,
      confidenceScore: 0.7,
      sourceType: 'player_action'
    };

    const result = this.worldGraph.createRelationship(request);
    
    if (result.success) {
      actions.push({
        type: 'world_relationship_created',
        data: {
          relationship: result.data,
          subject: subject[0],
          object: object[0],
          confidence: result.data.confidenceScore
        }
      } as DMAction);

      sceneState.metadata.lastRelationshipAction = {
        relationshipId: result.data.id,
        action: 'created',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle location statement intent
   */
  private handleLocationStatement(intent: PlayerIntent, sceneState: SceneState, actions: DMAction[]): DMAction[] {
    const locationName = this.extractLocationName(intent.text);
    
    if (!locationName) {
      return;
    }

    // Create or verify location entity
    const existingLocations = this.worldGraph.queryEntities({
      name: locationName,
      entityType: 'place'
    });

    let location: WorldEntity;
    
    if (existingLocations.length === 0) {
      const result = this.worldGraph.createEntity({
        entityType: 'place',
        name: locationName,
        description: `Location mentioned by: ${intent.text}`,
        confidenceScore: 0.6,
        sourceType: 'player_action'
      });

      if (result.success) {
        location = result.data;
        sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities || []).concat(location.id);
        
        actions.push({
          type: 'world_location_created',
          data: {
            location,
            confidence: location.confidenceScore
          }
        } as DMAction);
      }
    } else {
      location = existingLocations[0];
    }

    // Try to identify which entity moved
    const entityCandidates = this.identifyEntityInText(intent.text, sceneState);
    
    if (entityCandidates.length > 0) {
      const entityId = entityCandidates[0].id;
      const moveResult = this.worldGraph.moveEntity(entityId, location.id, intent.text);

      if (moveResult.success) {
        actions.push({
          type: 'entity_location_changed',
          data: {
            entityId,
            from: this.getEntityName(moveResult.data.previousValue),
            to: locationName,
            reason: intent.text
          }
        } as DMAction);

        sceneState.metadata.lastLocationAction = {
          entityId,
          action: 'moved',
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Handle event narration intent
   */
  private handleEventNarration(intent: PlayerIntent, sceneState: SceneState, actions: DMAction[]): DMAction[] {
    const eventData = this.extractEventData(intent.text, sceneState);
    
    if (!eventData) {
      return;
    }

    // Create event entity
    const result = this.worldGraph.createEntity({
      entityType: 'event',
      name: eventData.name,
      description: intent.text,
      confidenceScore: 0.7,
      sourceType: 'player_action',
      lifespanStart: eventData.occurredAt
    });

    if (result.success) {
      const event = result.data;
      
      actions.push({
        type: 'world_event_created',
        data: {
          event,
          confidence: event.confidenceScore
        }
      } as DMAction);

      sceneState.metadata.worldEntities = (sceneState.metadata.worldEntities || []).concat(event.id);
      sceneState.metadata.lastEventAction = {
        eventId: event.id,
        action: 'created',
        timestamp: new Date().toISOString()
      };

      // Add participants to event
      eventData.participants.forEach(participantName => {
        const participant = this.worldGraph.queryEntities({ name: participantName });
        if (participant.length > 0) {
          this.worldGraph.createRelationship({
            subjectId: participant[0].id,
            objectId: event.id,
            relationshipType: 'participates_in',
            confidenceScore: 0.6
          });
        }
      });
    }
  }

  /**
   * Handle action intents and update relevant world facts
   */
  private handleActionIntent(intent: PlayerIntent, sceneState: SceneState, actions: DMAction[]): DMAction[] {
    const actionAnalysis = this.analyzeActionIntent(intent);

    // Update entity states based on actions
    actionAnalysis.entityUpdates.forEach(update => {
      const result = this.worldGraph.updateEntityFact(update);
      
      if (result.success) {
        actions.push({
          type: 'world_fact_updated',
          data: {
            fact: result.data,
            confidence: result.data.confidenceScore
          }
        } as DMAction);
      }
    });

    // Track relationship changes
    actionAnalysis.relationshipChanges.forEach(change => {
      const result = this.worldGraph.createRelationship(change);
      
      if (result.success) {
        actions.push({
          type: 'world_relationship_updated',
          data: {
            relationship: result.data,
            confidence: result.data.confidenceScore
          }
        } as DMAction);
      }
    });
  }

  /**
   * Analyze a text intent for world graph impact
   */
  private analyzeActionIntent(intent: PlayerIntent): {
    entityUpdates: FactUpdateRequest[];
    relationshipChanges: RelationshipCreateRequest[];
  } {
    const entityUpdates: FactUpdateRequest[] = [];
    const relationshipChanges: RelationshipCreateRequest[] = [];
    
    const text = intent.text.toLowerCase();
    
    // Entity state detection
    if (text.includes('dies') || text.includes('is dead') || text.includes('has been killed')) {
      const entityName = this.extractSubjectName(intent.text);
      if (entityName) {
        const candidates = this.worldGraph.queryEntities({ name: entityName });
        if (candidates.length > 0) {
          entityUpdates.push({
            entityId: candidates[0].id,
            propertyKey: 'status',
            value: 'destroyed',
            confidenceScore: 0.9
          });
        }
      }
    }

    // Injury detection
    if (text.includes('injured') || text.includes('wounded') || text.includes('hurt')) {
      const entityName = this.extractSubjectName(intent.text);
      if (entityName) {
        const candidates = this.worldGraph.queryEntities({ name: entityName });
        if (candidates.length > 0) {
          entityUpdates.push({
            entityId: candidates[0].id,
            propertyKey: 'health',
            value: 'injured',
            confidenceScore: 0.8
          });
        }
      }
    }

    // Object acquisition/loss
    if (text.includes('takes') || text.includes('picks up') || text.includes('finds')) {
      const itemName = this.extractObjectName(intent.text);
      if (itemName) {
        this.handleItemAcquisition(itemName, entityUpdates);
      }
    }

    return { entityUpdates, relationshipChanges };
  }

  private handleItemAcquisition(itemName: string, updates: FactUpdateRequest[]): void {
    // Check if item already exists
    const existingItems = this.worldGraph.queryEntities({
      name: itemName,
      entityType: 'item'
    });

    if (existingItems.length === 0) {
      // Create new item
      const result = this.worldGraph.createEntity({
        entityType: 'item',
        name: itemName,
        description: `Item mentioned in conversation`,
        confidenceScore: 0.4
      });

      if (result.success) {
        updates.push({
          entityId: result.data.id,
          propertyKey: 'owner',
          value: this.getCurrentPlayerId() || 'unknown'
        });
      }
    }
  }

  /**
   * Parse relationship intent text
   */
  private parseRelationshipIntent(text: string, sceneState: SceneState): any {
    const lowerText = text.toLowerCase();
    
    // Pattern matching for different relationship types
    const patterns = [
      {
        type: 'friend_of',
        patterns: ['is friends with', 'befriended with', 'friend of the', 'ally with'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      },
      {
        type: 'enemy_of',
        patterns: ['is enemies with', 'hates', 'enemy of the', 'opposes'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      },
      {
        type: 'parent_of',
        patterns: ['is the parent of', 'is mother of', 'is father of'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      },
      {
        type: 'child_of',
        patterns: ['is the child of', 'is son of', 'is daughter of'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      },
      {
        type: 'owns',
        patterns: ['owns the', 'has a', 'carries a', 'possesses'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      },
      {
        type: 'works_for',
        patterns: ['works for', 'is employed by', 'serves'],
        extract: (text: string, match: RegExp) => {
          const subject = match[1];
          const object = match[2] || match[3];
          return { subjectName: subject, objectName: object };
        }
      }
    ];

    for (const relationship of patterns) {
      for (const pattern of relationship.patterns) {
        const regex = new RegExp(pattern, 'i');
        const match = text.match(regex);
        if (match) {
          return {
            relationshipType: relationship.type,
            subjectName: relationship.extract(text, match),
            subjectType: this.inferEntityType(match[1]) || 'person',
            objectName: relationship.extract(text, match),
            objectType: this.inferEntityType(match[2] || match[3]) || 'person'
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract entity name from text
   */
  private extractEntityName(text: string): string | null {
    const patterns = [
      /(?:the|a|an)\s+([A-Z][a-z]+(?:\s+[a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[a-z]+)*)(?:\s+is|are|was|were)\s+([A-Z][a-z]+)/g,
      /I know\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2]; // Return first captured group or second
      }
    }

    return null;
  }

  /**
   * Extract subject name from text
   */
  private extractSubjectName(text: string): string | null {
    // Similar to extractEntityName but focuses on actors
    return this.extractEntityName(text);
  }

  /**
   * Extract object name from text
   */
  private extractObjectName(text: string): string | null {
    const patterns = [
      /(?:the|his|her|its)\s+([A-Z][a-z]+(?:\s+id)?)\s*(\w+)/g,
      /(?:my|your|your)\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }

    return null;
  }

  /**
   * Extract location name from text
   */
  private extractLocationName(text: string): string | null {
    const patterns = [
      /(?:to|in|at)\s+([A-Z][a-z]+(?:\s+the\s+([a-z]+)*\s*(?:point|location|place|inn|tavern))/g,
      /(?:arrived at|reached)\s+([A-Z][a-z]+(?:\s+Inn))/g,
      /(?:went to|traveled to|journeyed to)\s+([A-Z][a-z]+)/g,
      /(?:located in|found in)\s+([A-Z][a-z]+)/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }

    return null;
  }

  /**
   * Extract event data from text
   */
  private extractEventData(text: string, sceneState: SceneState): any {
    const timePatterns = [
      /yesterday\s+(\d+)/,
      /(\d+)\s+(?:hours?|minutes?|days?\s+ago)/i,
      /(\d+)\s+days\s+ago/i,
      /last\s+(\d+)\s+days/i,
      /(?:this\s+morning|tonight|evening)/i
    ];

    let occurredAt: Date | undefined = new Date(); // Default to now

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        occurredAt = this.parseTimeExpression(match[0]);
        break;
      }
    }

    // Extract event name
    const namePatterns = [
      /(?:there\s+was|there\s+were)\s+(?:a\s+)?([A-Z][a-z][a-z]+)/,
      /(?:the\s+battle|the\s+fight)\s+of\s+(\w+)/i,
      /(?:the\s+wedding|the\s+funeral|the\s+celebration)/g,
      /(?:the\s+meeting|the\s+council|the\s+court)/g
    ];

    let eventName = 'Unknown Event';
    const lowerText = text.toLowerCase();

    for (const pattern of namePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        eventName = match[2] || match[1];
        break;
      }
    }

    // Extract participants
    const participantPatterns = [
      /(?:with|and)\s+([A-Z][a-z]+(?:\s+the)?)/g,
      /(?:attended|joined|participated_in|present at)/g
    ];

    const participants: string[] = [];
    const participantMatches = text.toLowerCase().matchAll(/(?:with|and)\s+([A-Z][a-z]+)?(?:\s+the)?/g) || [];

    participantMatches.forEach(match => {
      if (match[1]) {
        participants.push(match[1]);
      }
    });

    return {
      name: eventName,
      occurredAt,
      participants
    };
  }

  /**
   * Infer entity type from name and context
   */
  private inferEntityType(text: string, sceneState: SceneState): EntityType {
    const lowerText = text.toLowerCase();

    // Person detection
    if (this.isPersonName(lowerText)) {
      return 'person';
    }

    // Place detection
    if (this.isPlaceName(lowerText)) {
      return 'place';
    }

    // Item detection (goods, equipment, etc.)
    if (this.isItemName(lowerText)) {
      return 'item';
    }

    // Organization detection
    if (this.isOrganizationName(lowerText)) {
      return 'organization';
    }

    // Creature detection
    if (this.isCreatureName(lowerText)) {
      return 'creature';
    }

    // Concept detection
    if (this.isConceptName(lowerText)) {
      return 'concept';
    }

    // Default to person for unknown
    return 'person';
  }

  private isPersonName(name: string): boolean {
    const personIndicators = [
      'jonathani', 'elizabeth', 'michael', 'jane', 'mary', 'john', 'david',
      'aragorn', 'celebrim', 'drizzt', 'frank', 'samantha', 'rebecca'
    ];

    return personIndicators.some(indicator => name.toLowerCase().includes(indicator)) ||
           (name.match(/^[A-Z][a-z]+$/) && name.length >= 2 && name.length <= 15);
  }

  private isPlaceName(name: string): boolean {
    const placeIndicators = [
      'tavern', 'inn', 'castle', 'dungeon', 'forest', 'mountain', 'river',
      'city', 'village', 'kingdom', 'temple', 'church', 'marketplace'
    ];

    return placeIndicators.includes(name.toLowerCase()) ||
           name.match(/(?:\w+)(?:\s+\([^/]+)|\s+([^/]+)\/)/);
  }

  private isItemName(name: string): boolean {
    const itemIndicators = [
      'sword', 'shield', 'armor', 'potion', 'scroll', 'key', 'coin',
      'ring', 'amulet', 'wand', 'staff', 'bow', 'arrow'
    ];

    return itemIndicators.includes(name.toLowerCase());
  }

  private isOrganizationName(name: string): boolean {
    const orgIndicators = [
      'guild', 'company', 'order', 'faction', 'army', 'council',
      'ministry', 'tribe', 'households', 'corporation'
    ];

    return orgIndicators.some(indicator => name.toLowerCase().includes(indicator));
  }

  private isCreatureName(name: string): boolean {
    const creatureIndicators = [
      'dragon', 'goblin', 'orc', 'elf', 'dwarf', 'halfling', 'giant',
      'wolf', 'bear', 'lion', 'tiger', 'eagle', 'serpent'
    ];

    return creatureIndicators.includes(name.toLowerCase());
  }

  private isConceptName(name: string): boolean {
    const conceptIndicators = [
      'magic', 'arcane', 'divine', 'holy', 'ancient', 'legendary'
    ];

    return conceptIndicators.includes(name.toLowerCase());
  }

  private getEntityName(entityId: string): string {
    const entity = this.temporalTracker.getValidEntities().find(e => e.id === entityId);
    return entity?.name || entityId;
  }

  private getCurrentPlayerId(): string {
    // This would interface with character context
    // For now, return a placeholder
    return 'player-1';
  }

  /**
   * Extract world information from DM actions
   */
  private extractWorldInfo(action: DMAction): {
    entities: EntityCreateRequest[];
    relationships: RelationshipCreateRequest[];
    facts: FactUpdateRequest[];
  } {
    const entities: EntityCreateRequest[] = [];
    const relationships: RelationshipCreateRequest[] = [];
    const facts: FactUpdateRequest[] = [];

    // Parse DM message for world information
    if (action.text) {
      // This would use NLP to extract structured information
      // For now, return empty
    }

    return { entities, relationships, facts };
  }
}

// Supporting interface
interface RelationshipPattern {
  relationshipType: RelationshipType;
  subjectName: string;
  subjectType?: EntityType;
  objectName: string;
  objectType?: EntityType;
}

interface EventData {
  name: string;
  occurredAt: Date;
  participants: string[];
}
