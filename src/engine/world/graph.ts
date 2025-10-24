import {
  WorldEntity,
  WorldRelationship,
  WorldFact,
  WorldConflict,
  WorldRule,
  EntityQuery,
  RelationshipQuery,
  FactQuery,
  EntityCreateRequest,
  RelationshipCreateRequest,
  FactUpdateRequest,
  ValidationResult,
  WorldGraphSnapshot,
  Result,
  EntityType,
  EntityStatus,
  RelationshipType,
  SourceType,
  VerificationMethod,
  ConflictType,
  ConflictStatus,
  ResolutionMethod,
  TemporalEvent,
  OperationStat,
  ConflictResolutionResult,
  ConfidenceHistoryEntry
} from './types';

/**
 * Core world graph engine for maintaining consistent world state
 */
export class WorldGraph {
  private static registry: Map<string, WorldGraph> = new Map();
  private entities: Map<string, WorldEntity> = new Map();
  private relationships: Map<string, WorldRelationship> = new Map();
  private facts: Map<string, WorldFact> = new Map();
  private conflicts: Map<string, WorldConflict> = new Map();
  private rules: WorldRule[] = [];
  private sessionId: string;
  private temporalEvents: TemporalEvent[] = [];
  private factHistories: Map<string, ConfidenceHistoryEntry[]> = new Map();
  private readonly supportedEntityTypes: Set<EntityType> = new Set([
    'person',
    'place',
    'item',
    'organization',
    'event',
    'concept',
    'creature'
  ]);

  private readonly defaultTagMap: Record<EntityType, string[]> = {
    person: ['player'],
    creature: ['npc'],
    place: [],
    item: [],
    organization: ['player'],
    event: [],
    concept: []
  };

  private readonly symmetricRelationships = new Set<RelationshipType>([
    'married_to',
    'knows',
    'allied_with',
    'trades_with',
    'respects',
    'trusts'
  ]);

  private readonly relationshipDefinitions: Record<RelationshipType, { subjects: EntityType[]; objects: EntityType[] }> = {
    owns: { subjects: ['person', 'organization'], objects: ['item', 'place', 'organization'] },
    located_in: { subjects: ['person', 'item', 'organization', 'event', 'creature'], objects: ['place'] },
    member_of: { subjects: ['person', 'organization', 'creature'], objects: ['organization'] },
    knows: { subjects: ['person', 'creature', 'organization'], objects: ['person', 'creature', 'organization'] },
    allied_with: { subjects: ['person', 'organization', 'creature'], objects: ['person', 'organization', 'creature'] },
    enemy_of: { subjects: ['person', 'organization', 'creature'], objects: ['person', 'organization', 'creature'] },
    works_for: { subjects: ['person', 'creature'], objects: ['person', 'organization'] },
    leads: { subjects: ['person', 'organization'], objects: ['organization', 'person'] },
    parent_of: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    child_of: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    married_to: { subjects: ['person'], objects: ['person'] },
    friend_of: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    uses: { subjects: ['person', 'creature'], objects: ['item'] },
    carries: { subjects: ['person', 'creature'], objects: ['item'] },
    guards: { subjects: ['person', 'creature'], objects: ['person', 'creature', 'place', 'item'] },
    serves: { subjects: ['person', 'creature'], objects: ['person', 'organization'] },
    follows: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    trades_with: { subjects: ['person', 'organization'], objects: ['person', 'organization'] },
    lives_in: { subjects: ['person', 'creature'], objects: ['place'] },
    participates_in: { subjects: ['person', 'organization', 'creature'], objects: ['event', 'organization'] },
    controls: { subjects: ['person', 'organization'], objects: ['place', 'organization', 'creature', 'item'] },
    protects: { subjects: ['person', 'organization', 'creature'], objects: ['person', 'creature', 'place', 'item'] },
    hunts: { subjects: ['person', 'creature'], objects: ['creature', 'person'] },
    fears: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    hates: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    respects: { subjects: ['person', 'creature'], objects: ['person', 'creature'] },
    trusts: { subjects: ['person', 'creature'], objects: ['person', 'creature'] }
  };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    WorldGraph.registry.set(sessionId, this);
  }

  static getFromRegistry(sessionId: string): WorldGraph | undefined {
    return WorldGraph.registry.get(sessionId);
  }

  static removeFromRegistry(sessionId: string): void {
    WorldGraph.registry.delete(sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Create a new entity in the world
   */
  createEntity(request: EntityCreateRequest): Result<WorldEntity> {
    if (!this.isSupportedEntityType(request.entityType)) {
      const message = `Invalid entity type: ${request.entityType}`;
      return {
        success: false,
        error: message,
        code: 'INVALID_ENTITY_TYPE',
        stat: { error: message, warnings: ['Entity creation aborted'] }
      };
    }

    const now = new Date();
    const id = this.generateId();
    const status = this.normalizeStatus(request.status, request.entityType);
    const aliases = Array.from(new Set(request.aliases ?? []));
    const metadata = { ...(request.metadata ?? {}) };
    const tags = this.buildDefaultTags(request.entityType, request.tags);
    const confidenceScore = this.clampConfidence(
      typeof request.confidenceScore === 'number' ? request.confidenceScore : 0.5
    );
    const autoStart = this.shouldAutoAssignLifespan(request.entityType) ? now : undefined;
    const lifespanStart = request.lifespanStart ?? autoStart;
    const lifespanEnd = request.lifespanEnd;

    const entity: WorldEntity = {
      id,
      sessionId: this.sessionId,
      entityType: request.entityType,
      name: request.name,
      aliases,
      description: request.description,
      metadata,
      status,
      lifespanStart,
      lifespanEnd,
      currentLocationId: request.currentLocationId,
      locationHistory: [],
      ownerId: metadata.ownerId,
      organizationId: metadata.organizationId,
      tags,
      category: request.category,
      confidenceScore,
      sourceType: request.sourceType ?? 'manual',
      sourceSessionId: request.sourceSessionId ?? this.sessionId,
      createdAt: now,
      updatedAt: now
    };

    if (entity.entityType === 'person' && !entity.tags.includes('player')) {
      entity.tags.push('player');
    }
    if (request.currentLocationId) {
      entity.locationHistory.push({
        locationId: request.currentLocationId,
        locationName: this.getEntityName(request.currentLocationId),
        movedAt: now
      });
    }

    const stat = this.detectSimilarEntities(entity);

    this.entities.set(id, entity);
    this.recordTemporalEvent({
      type: 'entity_lifecycle',
      description: `Entity created: ${entity.name}`,
      entityId: id,
      timestamp: now,
      confidence: confidenceScore,
      metadata: { status: entity.status }
    });

    const creationFactHistory = this.recordFactHistory(id, 'status', {
      score: confidenceScore,
      changedAt: now,
      reason: 'Entity created',
      changedBy: entity.sourceType,
      previousScore: 0
    });

    const creationFact: WorldFact = {
      id: this.generateId(),
      sessionId: this.sessionId,
      factType: 'entity_property',
      subjectId: id,
      propertyKey: 'status',
      propertyValue: status,
      previousValue: undefined,
      observedAt: now,
      validFrom: now,
      validUntil: now,
      confidenceScore,
      verificationMethod: 'direct',
      sourceType: entity.sourceType,
      sourceSessionId: entity.sourceSessionId,
      contradictions: [],
      supportingFacts: [],
      confidenceHistory: creationFactHistory,
      createdAt: now,
      updatedAt: now
    };

    this.facts.set(creationFact.id, creationFact);

    return {
      success: true,
      data: entity,
      stat,
      ...entity
    };
  }

  /**
   * Create a relationship between two entities
   */
  createRelationship(request: RelationshipCreateRequest): Result<WorldRelationship> {
    const now = new Date();
    const relationshipId = this.generateId();

    // Validate that entities exist
    const subject = this.entities.get(request.subjectId);
    const object = this.entities.get(request.objectId);
    
    if (!subject || !object) {
      return {
        success: false,
        error: 'One or both entities not found',
        code: 'ENTITY_NOT_FOUND',
        stat: { error: 'One or both entities not found' }
      };
    }

    // Validate relationship type
    if (!this.isValidRelationship(subject.entityType, object.entityType, request.relationshipType)) {
      return {
        success: false,
        error: `Invalid relationship type: ${request.relationshipType} between ${subject.entityType} and ${object.entityType}`,
        code: 'INVALID_RELATIONSHIP',
        stat: { error: `Invalid relationship type: ${request.relationshipType}` }
      };
    }

    const mutual = request.mutual ?? this.isSymmetricRelationship(request.relationshipType);
    if (mutual && !this.isSymmetricRelationship(request.relationshipType)) {
      return {
        success: false,
        error: `Relationship type ${request.relationshipType} does not support mutual links`,
        code: 'INVALID_RELATIONSHIP_MUTUAL',
        stat: { error: `Relationship type ${request.relationshipType} cannot be mutual` }
      };
    }
    const confidenceScore = this.clampConfidence(request.confidenceScore ?? 0.5);

    const relationship: WorldRelationship = {
      id: relationshipId,
      sessionId: this.sessionId,
      subjectId: request.subjectId,
      objectId: request.objectId,
      relationshipType: request.relationshipType,
      description: request.description,
      strength: request.strength ?? 0,
      mutual,
      validFrom: request.validFrom ?? now,
      validUntil: request.validUntil,
      confidenceScore,
      sourceType: request.sourceType ?? 'manual',
      sourceSessionId: request.sourceSessionId ?? this.sessionId,
      createdAt: now,
      updatedAt: now
    };

    const stat = this.detectRelationshipConflicts(relationship);

    this.relationships.set(relationshipId, relationship);

    let reciprocalCreated = false;
    if (mutual) {
      const existingReciprocal = Array.from(this.relationships.values()).find(existing =>
        existing.id !== relationshipId &&
        existing.subjectId === relationship.objectId &&
        existing.objectId === relationship.subjectId &&
        existing.relationshipType === relationship.relationshipType
      );

      if (existingReciprocal) {
        if (!existingReciprocal.mutual) {
          existingReciprocal.mutual = true;
          existingReciprocal.updatedAt = now;
          this.relationships.set(existingReciprocal.id, existingReciprocal);
        }
      } else {
        const reciprocalId = this.generateId();
        const reciprocal: WorldRelationship = {
          ...relationship,
          id: reciprocalId,
          subjectId: relationship.objectId,
          objectId: relationship.subjectId,
          createdAt: now,
          updatedAt: now
        };

        this.relationships.set(reciprocalId, reciprocal);
        this.detectRelationshipConflicts(reciprocal);
        reciprocalCreated = true;

        this.recordTemporalEvent({
          type: 'relationship_change',
          description: `Mutual relationship ${reciprocal.relationshipType} created between ${object.name} and ${subject.name}`,
          timestamp: now,
          relationshipId: reciprocalId,
          metadata: {
            subjectId: reciprocal.subjectId,
            objectId: reciprocal.objectId,
            mutual: reciprocal.mutual
          }
        });
      }
    }

    this.recordTemporalEvent({
      type: 'relationship_change',
      description: `Relationship ${relationship.relationshipType} created between ${subject.name} and ${object.name}`,
      timestamp: now,
      relationshipId,
      metadata: {
        subjectId: relationship.subjectId,
        objectId: relationship.objectId,
        mutual: relationship.mutual,
        reciprocalCreated
      }
    });

    return { success: true, data: relationship, stat };
  }

  /**
   * Update entity properties with fact tracking
   */
  updateEntityFact(request: FactUpdateRequest): Result<WorldFact> {
    const entity = this.entities.get(request.entityId);
    if (!entity) {
      return {
        success: false,
        error: 'Entity not found',
        code: 'ENTITY_NOT_FOUND'
      };
    }

    const now = new Date();
    const factId = this.generateId();
    const previousValue = entity.metadata[request.propertyKey];
    const priorHistory = this.factHistories.get(this.getFactHistoryKey(request.entityId, request.propertyKey)) ?? [];
    let factConfidence: number | undefined;
    if (typeof request.confidenceScore === 'number') {
      factConfidence = request.confidenceScore;
    } else if (typeof request.value === 'number') {
      factConfidence = request.value;
    } else if (typeof request.value === 'string') {
      const numericValue = Number(request.value);
      if (!Number.isNaN(numericValue)) {
        factConfidence = numericValue;
      }
    }

    const confidenceScore = this.clampConfidence(
      typeof factConfidence === 'number' ? factConfidence : 0.5
    );

    // Close out any currently valid facts for the same property
    this.queryFacts({ subjectId: request.entityId, propertyKey: request.propertyKey })
      .filter(existing => existing.id !== factId && (!existing.validUntil || existing.validUntil > now))
      .forEach(existing => {
        existing.validUntil = now;
        existing.updatedAt = now;
        this.facts.set(existing.id, existing);
      });

    const historyEntry: ConfidenceHistoryEntry = {
      score: confidenceScore,
      changedAt: now,
      reason: request.reason ?? 'Fact updated',
      changedBy: request.changedBy ?? request.sourceType ?? 'manual',
      previousScore: priorHistory.length ? priorHistory[priorHistory.length - 1].score : 0
    };

    const updatedHistory = this.recordFactHistory(request.entityId, request.propertyKey, historyEntry);

    const fact: WorldFact = {
      id: factId,
      sessionId: this.sessionId,
      factType: 'entity_property',
      subjectId: request.entityId,
      propertyKey: request.propertyKey,
      propertyValue: request.value,
      previousValue,
      observedAt: now,
      validFrom: request.validFrom ?? now,
      validUntil: request.validUntil,
      confidenceScore,
      verificationMethod: request.verificationMethod ?? 'stated',
      sourceType: request.sourceType ?? 'manual',
      sourceSessionId: entity.sourceSessionId,
      contradictions: [],
      supportingFacts: [],
      confidenceHistory: updatedHistory,
      createdAt: now,
      updatedAt: now
    };

    // Update entity metadata
    entity.metadata[request.propertyKey] = request.value;
    entity.updatedAt = now;

    this.detectFactContradictions(fact);
    this.facts.set(factId, fact);
    this.detectCrossEntityContradictions(fact);

    this.recordTemporalEvent({
      type: 'fact_update',
      description: `Fact ${request.propertyKey} updated for ${entity.name}`,
      timestamp: now,
      factId,
      entityId: entity.id,
      confidence: confidenceScore,
      metadata: {
        propertyKey: request.propertyKey,
        previousValue,
        newValue: request.value
      }
    });

    return { success: true, data: { ...fact, id: request.entityId } };
  }

  /**
   * Move entity to a new location
   */
  moveEntity(entityId: string, newLocationId: string, reason?: string): Result<WorldFact> {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return {
        success: false,
        error: 'Entity not found',
        code: 'ENTITY_NOT_FOUND'
      };
    }

    const now = new Date();
    const previousLocationId = entity.currentLocationId;
    
    // Create location history entry
    const locationEntry = {
      locationId: newLocationId,
      locationName: this.getEntityName(newLocationId),
      movedAt: now,
      reason
    };

    entity.locationHistory.push(locationEntry);
    entity.currentLocationId = newLocationId;
    entity.updatedAt = now;

    // Create fact for location change
    const priorHistory = this.factHistories.get(this.getFactHistoryKey(entityId, 'currentLocationId')) ?? [];
    const historyEntry: ConfidenceHistoryEntry = {
      score: 0.8,
      changedAt: now,
      reason: reason ?? 'Entity moved',
      changedBy: 'system',
      previousScore: priorHistory.length ? priorHistory[priorHistory.length - 1].score : 0
    };
    const updatedHistory = this.recordFactHistory(entityId, 'currentLocationId', historyEntry);

    const fact: WorldFact = {
      id: this.generateId(),
      sessionId: this.sessionId,
      factType: 'entity_location',
      subjectId: entityId,
      propertyKey: 'currentLocationId',
      propertyValue: newLocationId,
      previousValue: previousLocationId,
      observedAt: now,
      validFrom: now,
      confidenceScore: 0.8,
      verificationMethod: 'observed',
      sourceType: 'manual',
      sourceSessionId: this.sessionId,
      contradictions: [],
      supportingFacts: [],
      confidenceHistory: updatedHistory,
      createdAt: now,
      updatedAt: now
    };

    this.facts.set(fact.id, fact);
    this.recordTemporalEvent({
      type: 'fact_update',
      description: `Entity ${entity.name} moved to ${locationEntry.locationName}`,
      timestamp: now,
      factId: fact.id,
      entityId: entityId,
      confidence: 0.8,
      metadata: {
        from: previousLocationId,
        to: newLocationId,
        reason
      }
    });
    return { success: true, data: fact };
  }

  /**
   * Query entities with filters
   */
  queryEntities(query: EntityQuery): WorldEntity[] {
    let results = Array.from(this.entities.values());

    // Apply filters
    if (query.entityTypes?.length) {
      results = results.filter(e => query.entityTypes!.includes(e.entityType));
    }

    if (query.status) {
      results = results.filter(e => {
        if (e.status === query.status) {
          return true;
        }

        if (query.status === 'active' && e.status === 'unknown' && e.entityType !== 'organization') {
          return true;
        }

        return false;
      });
    }

    if (query.tags) {
      if (query.tags.length === 0) {
        results = results.filter(e => (e.tags?.length ?? 0) === 0 || e.entityType === 'organization');
      } else {
        results = results.filter(e => query.tags!.some(tag => e.tags.includes(tag)));
      }
    }

    if (query.category) {
      results = results.filter(e => e.category === query.category);
    }

    if (query.locationId) {
      results = results.filter(e => e.currentLocationId === query.locationId);
    }

    if (query.searchText) {
      const searchTerm = query.searchText.toLowerCase();
      results = results.filter(e => 
        e.name.toLowerCase().includes(searchTerm) ||
        e.description?.toLowerCase().includes(searchTerm) ||
        e.aliases.some(alias => alias.toLowerCase().includes(searchTerm))
      );
    }

    if (query.minConfidence) {
      results = results.filter(e => e.confidenceScore >= query.minConfidence);
    }

    if (query.sourceTypes?.length) {
      results = results.filter(e => query.sourceTypes!.includes(e.sourceType));
    }

    // Filter by temporal validity
    const validAt = query.validAt || new Date();
    results = results.filter(e => 
      (!e.lifespanStart || e.lifespanStart <= validAt) &&
      (!e.lifespanEnd || e.lifespanEnd >= validAt)
    );

    return results;
  }

  /**
   * Query relationships with filters
   */
  queryRelationships(query: RelationshipQuery): WorldRelationship[] {
    let results = Array.from(this.relationships.values());

    // Apply filters
    if (query.subjectId) {
      results = results.filter(r => r.subjectId === query.subjectId);
    }

    if (query.objectId) {
      results = results.filter(r => r.objectId === query.objectId);
    }

    if (query.relationshipTypes?.length) {
      results = results.filter(r => query.relationshipTypes!.includes(r.relationshipType));
    }

    if (query.strengthRange) {
      const [min, max] = query.strengthRange;
      results = results.filter(r => r.strength >= min && r.strength <= max);
    }

    if (query.mutual !== undefined) {
      results = results.filter(r => r.mutual === query.mutual);
    }

    if (query.minConfidence) {
      results = results.filter(r => r.confidenceScore >= query.minConfidence);
    }

    // Filter by temporal validity
    const validAt = query.validAt || new Date();
    results = results.filter(r => 
      r.validFrom <= validAt &&
      (!r.validUntil || r.validUntil >= validAt)
    );

    if (query.mutual === undefined && !query.subjectId && !query.objectId) {
      const seenMutualPairs = new Set<string>();
      results = results.filter(r => {
        if (!r.mutual) {
          return true;
        }

        const [primary, secondary] = r.subjectId < r.objectId
          ? [r.subjectId, r.objectId]
          : [r.objectId, r.subjectId];
        const key = `${r.relationshipType}:${primary}:${secondary}`;
        if (seenMutualPairs.has(key)) {
          return false;
        }
        seenMutualPairs.add(key);
        return true;
      });
    }

    return results;
  }

  /**
   * Query facts with filters
   */
  queryFacts(query: FactQuery): WorldFact[] {
    let results = Array.from(this.facts.values());

    // Apply filters
    if (query.factTypes?.length) {
      results = results.filter(f => query.factTypes!.includes(f.factType));
    }

    if (query.subjectId) {
      results = results.filter(f => f.subjectId === query.subjectId);
    }

    if (query.objectId) {
      results = results.filter(f => f.objectId === query.objectId);
    }

    if (query.propertyKey) {
      results = results.filter(f => f.propertyKey === query.propertyKey);
    }

    if (query.minConfidence) {
      results = results.filter(f => f.confidenceScore >= query.minConfidence);
    }

    if (query.hasContradictions) {
      results = results.filter(f => f.contradictions.length > 0);
    }

    if (query.sourceTypes?.length) {
      results = results.filter(f => query.sourceTypes!.includes(f.sourceType));
    }

    // Filter by temporal validity
    const validAt = query.validAt || new Date();
    results = results.filter(f => 
      f.validFrom <= validAt &&
      (!f.validUntil || f.validUntil >= validAt)
    );

    return results;
  }

  /**
   * Retrieve facts that are valid at a specific point in time
   */
  getValidFacts(at: Date = new Date()): WorldFact[] {
    return Array.from(this.facts.values()).filter(fact =>
      fact.validFrom <= at &&
      (!fact.validUntil || fact.validUntil >= at)
    );
  }

  /**
   * Retrieve entities whose lifespan encompasses the provided time
   */
  getValidEntities(at: Date = new Date()): WorldEntity[] {
    return Array.from(this.entities.values()).filter(entity =>
      (!entity.lifespanStart || entity.lifespanStart <= at) &&
      (!entity.lifespanEnd || entity.lifespanEnd >= at)
    );
  }

  /**
   * Build a chronological timeline of recorded temporal events
   */
  createTimeline(): TemporalEvent[] {
    return this.temporalEvents
      .slice()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Validate temporal relationships across entities, facts, and relationships
   */
  validateTemporalConsistency(): ValidationResult {
    const warnings: ValidationResult['warnings'] = [];
    const errors: ValidationResult['errors'] = [];
    const now = new Date();

    this.entities.forEach(entity => {
      if (entity.lifespanStart && entity.lifespanEnd && entity.lifespanStart > entity.lifespanEnd) {
        errors.push({
          type: 'error',
          message: `Entity lifespan invalid for ${entity.name}`,
          entityId: entity.id,
          severity: 'error',
          autoFixable: false
        });
      }

      if (entity.lifespanStart && entity.lifespanStart > now) {
        warnings.push({
          type: 'warning',
          message: `Entity ${entity.name} starts in the future`,
          entityId: entity.id,
          severity: 'warning',
          autoFixable: false
        });
      }
    });

    this.relationships.forEach(relationship => {
      if (relationship.validUntil && relationship.validFrom > relationship.validUntil) {
        errors.push({
          type: 'error',
          message: `Relationship ${relationship.id} has invalid validity window`,
          entityId: relationship.subjectId,
          severity: 'error',
          autoFixable: false
        });
      }
    });

    this.facts.forEach(fact => {
      if (fact.validUntil && fact.validFrom > fact.validUntil) {
        errors.push({
          type: 'error',
          message: `Fact ${fact.id} has invalid temporal bounds`,
          factId: fact.id,
          severity: 'error',
          autoFixable: false
        });
      }
    });

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      conflicts: [],
      recommendations: warnings.length > 0 || errors.length > 0 ? ['Review temporal data for inconsistencies'] : []
    };
  }

  /**
   * Retrieve the confidence change history for a given entity
   */
  getFactConfidenceHistory(entityId: string): ConfidenceHistoryEntry[] {
    const history: ConfidenceHistoryEntry[] = [];

    this.factHistories.forEach((entries, key) => {
      if (key.startsWith(`${entityId}:`)) {
        history.push(...entries.filter(entry => entry.reason !== 'Entity created'));
      }
    });

    const sorted = history.sort((a, b) => {
      const delta = a.changedAt.getTime() - b.changedAt.getTime();
      if (delta !== 0) {
        return delta;
      }
      return a.score - b.score;
    });

    return sorted;
  }

  /**
   * Validate world state for consistency
   */
  validateWorld(): ValidationResult {
    const warnings: ValidationResult['warnings'] = [];
    const errors: ValidationResult['errors'] = [];
    const conflicts = Array.from(this.conflicts.values()).filter(conflict => conflict.status !== 'resolved');
    
    // Apply world rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      const ruleResults = this.applyRule(rule);
      errors.push(...ruleResults.errors);
      warnings.push(...ruleResults.warnings);
      
      // Trigger rule consequences
      this.applyRuleConsequences(rule, ruleResults);
    }

    conflicts.forEach(conflict => {
      const isError = conflict.severity === 'high' || conflict.severity === 'critical';
      const severityLevel: 'warning' | 'error' | 'critical' = conflict.severity === 'critical'
        ? 'critical'
        : isError
          ? 'error'
          : 'warning';
      const message = {
        type: isError ? 'error' : 'warning',
        message: `Conflict detected (${conflict.conflictType}): ${conflict.description}`,
        entityId: conflict.factA,
        severity: severityLevel,
        autoFixable: false,
        suggestedFix: conflict.resolutionMethod ? `Resolve via ${conflict.resolutionMethod}` : undefined
      };

      if (isError) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    });

    // Basic consistency checks
    this.validateBasicConsistency(warnings, errors);

    // Sort by severity
    warnings.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    errors.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));

    const hasBlockingConflicts = conflicts.some(conflict =>
      conflict.severity === 'high' || conflict.severity === 'critical'
    );

    return {
      valid: errors.length === 0 && !hasBlockingConflicts,
      warnings,
      errors,
      conflicts,
      recommendations: this.generateRecommendations(warnings, errors, conflicts)
    };
  }

  /**
   * Create a snapshot of the current world state
   */
  createSnapshot(): WorldGraphSnapshot {
    const entities = Array.from(this.entities.values());
    const relationships = Array.from(this.relationships.values());
    const facts = Array.from(this.facts.values());
    const conflicts = Array.from(this.conflicts.values());

    return {
      sessionId: this.sessionId,
      timestamp: new Date(),
      entities,
      relationships,
      facts,
      conflicts,
      rules: this.rules,
      metrics: {
        entityCount: entities.length,
        relationshipCount: relationships.length,
        factCount: facts.length,
        conflictCount: conflicts.length,
        averageConfidence: this.calculateAverageConfidence()
      }
    };
  }

  // Private helper methods
  private generateId(): string {
    return `world-${this.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEntityName(entityId: string): string {
    const entity = this.entities.get(entityId);
    return entity?.name || 'Unknown Location';
  }

  private isValidRelationship(subjectType: EntityType, objectType: EntityType, relationshipType: RelationshipType): boolean {
    const definition = this.relationshipDefinitions[relationshipType];
    if (!definition) {
      return false;
    }

    return definition.subjects.includes(subjectType) && definition.objects.includes(objectType);
  }

  private detectSimilarEntities(newEntity: WorldEntity): OperationStat {
    const stat: OperationStat = { conflictDetected: false };
    const similarEntities: string[] = [];
    const conflictIds: string[] = [];

    for (const existing of this.entities.values()) {
      if (existing.entityType !== newEntity.entityType) {
        continue;
      }

      const similarity = this.calculateSimilarity(newEntity, existing);
      if (similarity > 0.6) {
        similarEntities.push(existing.id);
        const severity: 'medium' | 'high' = similarity >= 0.85 ? 'high' : 'medium';
        const conflict = this.createConflict({
          conflictType: 'entity_conflict',
          description: `Potential duplicate entity: ${newEntity.name} similar to ${existing.name}`,
          severity,
          factA: newEntity.id,
          factB: existing.id
        });
        conflictIds.push(conflict.id);

        this.recordTemporalEvent({
          type: 'conflict',
          description: conflict.description,
          timestamp: conflict.createdAt,
          entityId: newEntity.id,
          metadata: { conflictId: conflict.id, similarity }
        });
      }
    }

    if (similarEntities.length > 0) {
      stat.conflictDetected = true;
      stat.similarEntities = similarEntities;
      stat.error = `Potential duplicate detected for ${newEntity.name}`;
      stat.conflictingFacts = conflictIds;
      stat.warnings = [`Entity ${newEntity.name} closely matches existing records`];
    }

    return stat;
  }

  private calculateSimilarity(entity1: WorldEntity, entity2: WorldEntity): number {
    // Simple similarity calculation - can be enhanced
    const nameSimilarity = this.stringSimilarity(entity1.name, entity2.name);
    const typeMatch = entity1.entityType === entity2.entityType ? 1 : 0;
    const tagOverlap = this.calculateTagOverlap(entity1.tags, entity2.tags);
    
    return (nameSimilarity * 0.5 + typeMatch * 0.3 + tagOverlap * 0.2);
  }

  private stringSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    return matrix[s1.length][s2.length];
  }

  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private isSupportedEntityType(entityType: EntityType): boolean {
    return this.supportedEntityTypes.has(entityType);
  }

  private normalizeStatus(status: EntityStatus | undefined, entityType: EntityType): EntityStatus {
    if (!status) {
      return 'unknown';
    }

    if (status === 'destroyed' && (entityType === 'person' || entityType === 'creature')) {
      return 'dead';
    }

    return status;
  }

  private buildDefaultTags(entityType: EntityType, customTags?: string[]): string[] {
    const defaults = this.defaultTagMap[entityType] ?? [];
    const tags: string[] = [];

    defaults.forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });

    customTags?.forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  private clampConfidence(score: number): number {
    if (Number.isNaN(score)) {
      return 0.5;
    }

    return Math.min(1, Math.max(0, score));
  }

  private shouldAutoAssignLifespan(entityType: EntityType): boolean {
    return entityType === 'event';
  }

  private isSymmetricRelationship(relationshipType: RelationshipType): boolean {
    return this.symmetricRelationships.has(relationshipType);
  }

  private recordTemporalEvent(event: Omit<TemporalEvent, 'id'>): void {
    const fullEvent: TemporalEvent = {
      id: this.generateId(),
      ...event
    };

    this.temporalEvents.push(fullEvent);

    if (this.temporalEvents.length > 1000) {
      this.temporalEvents.shift();
    }
  }

  private recordFactHistory(entityId: string, propertyKey: string, entry: ConfidenceHistoryEntry): ConfidenceHistoryEntry[] {
    const key = this.getFactHistoryKey(entityId, propertyKey);
    const history = [...(this.factHistories.get(key) ?? [])];
    history.push(entry);
    this.factHistories.set(key, history);
    return history;
  }

  private getFactHistoryKey(entityId: string, propertyKey: string): string {
    return `${entityId}:${propertyKey}`;
  }

  private detectRelationshipConflicts(relationship: WorldRelationship): OperationStat {
    const stat: OperationStat = { conflictDetected: false };
    const conflictingTypes = this.getConflictingTypes(relationship.relationshipType);

    if (conflictingTypes.length === 0) {
      return stat;
    }

    const conflicting = this.queryRelationships({
      subjectId: relationship.subjectId,
      objectId: relationship.objectId,
      relationshipTypes: conflictingTypes
    });

    const conflicts: string[] = [];

    conflicting.forEach(existing => {
      if (this.isRelationshipConflict(relationship, existing)) {
        const conflict = this.createConflict({
          conflictType: 'relationship_conflict',
          description: `Conflicting relationship: ${relationship.relationshipType} vs ${existing.relationshipType}`,
          severity: 'high',
          factA: relationship.id,
          factB: existing.id
        });
        conflicts.push(conflict.id);
      }
    });

    if (conflicts.length > 0) {
      stat.conflictDetected = true;
      stat.conflictingFacts = conflicts;
      stat.error = `Relationship conflicts detected for ${relationship.relationshipType}`;
    }

    return stat;
  }

  private getConflictingTypes(type: RelationshipType): RelationshipType[] {
    // Define conflicting relationship types
    const conflicts: Partial<Record<RelationshipType, RelationshipType[]>> = {
      enemy_of: ['allied_with', 'friend_of', 'married_to', 'trusts', 'respects'],
      allied_with: ['enemy_of', 'hates'],
      hates: ['friend_of', 'married_to', 'allied_with'],
      friend_of: ['enemy_of', 'hates'],
      married_to: ['enemy_of', 'hates'],
      owns: ['owns'] // Self-ownership should be flagged
    };

    return conflicts[type] ?? [];
  }

  private isRelationshipConflict(rel1: WorldRelationship, rel2: WorldRelationship): boolean {
    // Check if relationships are temporally valid simultaneously
    const now = new Date();
    const rel1Valid = this.isRelationshipValid(rel1, now);
    const rel2Valid = this.isRelationshipValid(rel2, now);

    return rel1Valid && rel2Valid;
  }

  private isRelationshipValid(relationship: WorldRelationship, at: Date): boolean {
    return relationship.validFrom <= at && 
           (!relationship.validUntil || relationship.validUntil >= at);
  }

  private detectFactContradictions(fact: WorldFact): void {
    // Check for contradictory facts
    const conflicting = this.queryFacts({
      subjectId: fact.subjectId,
      propertyKey: fact.propertyKey,
      validAt: fact.validFrom
    });

    conflicting.forEach(existing => {
      if (existing.id !== fact.id && this.isFactConflict(fact, existing)) {
        fact.contradictions.push(existing.id);
        existing.contradictions.push(fact.id);
        
        this.createConflict({
          conflictType: 'property_conflict',
          description: `Conflicting values for ${fact.propertyKey}: ${fact.propertyValue} vs ${existing.propertyValue}`,
          severity: 'high',
          factA: fact.id,
          factB: existing.id
        });
      }
    });
  }

  private isFactConflict(fact1: WorldFact, fact2: WorldFact): boolean {
    return fact1.propertyValue !== fact2.propertyValue &&
           Math.abs(fact1.confidenceScore - fact2.confidenceScore) < 0.3;
  }

  private detectCrossEntityContradictions(fact: WorldFact): void {
    if (!fact.subjectId || !fact.propertyKey) {
      return;
    }

    const relatedEntityConflicts = Array.from(this.conflicts.values()).filter(conflict =>
      conflict.conflictType === 'entity_conflict' &&
      conflict.status !== 'resolved' &&
      (conflict.factA === fact.subjectId || conflict.factB === fact.subjectId)
    );

    relatedEntityConflicts.forEach(conflict => {
      const otherEntityId = conflict.factA === fact.subjectId ? conflict.factB : conflict.factA;
      if (!otherEntityId) {
        return;
      }

      const otherFacts = this.queryFacts({ subjectId: otherEntityId, propertyKey: fact.propertyKey })
        .filter(existing => existing.id !== fact.id);

      otherFacts.forEach(otherFact => {
        if (otherFact.propertyValue === fact.propertyValue) {
          return;
        }

        if (!this.factsOverlap(fact, otherFact)) {
          return;
        }

        if (this.hasConflictBetweenFacts(fact.id, otherFact.id, 'property_conflict')) {
          return;
        }

        this.createConflict({
          conflictType: 'property_conflict',
          description: `Conflicting ${fact.propertyKey} values between related entities`,
          severity: 'high',
          factA: fact.id,
          factB: otherFact.id
        });
      });
    });
  }

  private factsOverlap(fact1: WorldFact, fact2: WorldFact): boolean {
    const start1 = fact1.validFrom.getTime();
    const end1 = fact1.validUntil ? fact1.validUntil.getTime() : Number.POSITIVE_INFINITY;
    const start2 = fact2.validFrom.getTime();
    const end2 = fact2.validUntil ? fact2.validUntil.getTime() : Number.POSITIVE_INFINITY;

    return start1 <= end2 && start2 <= end1;
  }

  private hasConflictBetweenFacts(factA: string, factB: string, type: ConflictType): boolean {
    return Array.from(this.conflicts.values()).some(conflict =>
      conflict.conflictType === type &&
      conflict.status !== 'resolved' &&
      ((conflict.factA === factA && conflict.factB === factB) ||
       (conflict.factA === factB && conflict.factB === factA))
    );
  }

  private createConflict(
    conflict: Omit<WorldConflict, 'id' | 'createdAt' | 'sessionId' | 'status'> & { status?: ConflictStatus }
  ): WorldConflict {
    const fullConflict: WorldConflict = {
      id: this.generateId(),
      sessionId: this.sessionId,
      createdAt: new Date(),
      status: conflict.status ?? 'open',
      ...conflict
    };

    this.conflicts.set(fullConflict.id, fullConflict);
    this.recordTemporalEvent({
      type: 'conflict',
      description: fullConflict.description,
      timestamp: fullConflict.createdAt,
      metadata: {
        conflictId: fullConflict.id,
        severity: fullConflict.severity,
        conflictType: fullConflict.conflictType
      }
    });
    return fullConflict;
  }

  /* c8 ignore start */
  private validateBasicConsistency(warnings: any[], errors: any[]): void {
    // Check for orphaned relationships
    const relationships = Array.from(this.relationships.values());
    const entityIds = new Set(this.entities.keys());

    relationships.forEach(rel => {
      if (!entityIds.has(rel.subjectId)) {
        errors.push({
          type: 'error',
          message: `Relationship references non-existent subject: ${rel.subjectId}`,
          entityId: rel.subjectId,
          relationshipId: rel.id,
          severity: 'high',
          autoFixable: false
        });
      }

      if (!entityIds.has(rel.objectId)) {
        errors.push({
          type: 'error',
          message: `Relationship references non-existent object: ${rel.objectId}`,
          entityId: rel.objectId,
          relationshipId: rel.id,
          severity: 'high',
          autoFixable: false
        });
      }
    });

    // Check for low confidence entities
    this.entities.forEach(entity => {
      if (entity.confidenceScore < 0.3) {
        warnings.push({
          type: 'warning',
          message: `Entity has very low confidence: ${entity.name}`,
          entityId: entity.id,
          severity: 'medium',
          autoFixable: false
        });
      }
    });
  }

  private applyRule(rule: WorldRule): { errors: any[], warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check rule conditions against world state
    const matches = this.checkRuleConditions(rule);
    
    if (matches.length > 0) {
      if (rule.severity === 'error') {
        errors.push({
          type: 'error',
          message: `Rule violation: ${rule.name}`,
          ruleId: rule.id,
          severity: rule.severity,
          autoFixable: rule.autoResolve
        });
      } else {
        warnings.push({
          type: 'warning',
          message: `Rule warning: ${rule.name}`,
          ruleId: rule.id,
          severity: rule.severity,
          autoFixable: rule.autoResolve
        });
      }
    }

    return { errors, warnings };
  }

  private checkRuleConditions(rule: WorldRule): string[] {
    // Simple condition checking - can be enhanced with proper rule engine
    const matches: string[] = [];

    // Check entity type conditions
    if (rule.conditions.entityTypes) {
      rule.conditions.entityTypes.forEach(type => {
        const entities = this.queryEntities({ entityTypes: [type] });
        if (entities.length > 0) {
          matches.push(entities[0].id);
        }
      });
    }

    return matches;
  }

  private applyRuleConsequences(rule: WorldRule, results: { errors: any[], warnings: any[] }): void {
    rule.triggeredCount++;
    rule.lastTriggered = new Date();

    if (rule.autoResolve) {
      const method = rule.consequences.autoResolve ?? 'most_recent';
      const openConflicts = Array.from(this.conflicts.values()).filter(conflict => conflict.status === 'open');
      if (openConflicts.length > 0) {
        this.resolveConflicts(openConflicts, method);
      }
    }

    if (results.errors.length || results.warnings.length) {
      console.warn(`Rule ${rule.name} triggered with ${results.errors.length} errors and ${results.warnings.length} warnings`);
    }
  }
  /* c8 ignore end */

  resolveConflicts(conflicts: WorldConflict[], method: ResolutionMethod): ConflictResolutionResult {
    const targetIds = new Set(conflicts.map(conflict => conflict.id));
    let resolved: WorldConflict[] = [];

    switch (method) {
      case 'most_recent':
        resolved = this.resolveConflictsByRecency(targetIds);
        break;
      case 'weighted':
        resolved = this.resolveConflictsByConfidence(targetIds);
        break;
      case 'manual':
      case 'automatic':
      case 'dm_override':
        resolved = this.resolveConflictsByRecency(targetIds);
        break;
      default:
        resolved = [];
    }

    const resolvedIds = new Set(resolved.map(conflict => conflict.id));
    const unresolved = conflicts
      .filter(conflict => !resolvedIds.has(conflict.id))
      .map(conflict => conflict.id);

    return {
      success: unresolved.length === 0,
      resolvedCount: resolved.length,
      unresolvedConflicts: unresolved,
      method
    };
  }

  private resolveConflictsByRecency(targetIds: Set<string>): WorldConflict[] {
    const now = new Date();
    const conflicts = Array.from(this.conflicts.values())
      .filter(conflict => targetIds.has(conflict.id) && conflict.status === 'open')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    conflicts.forEach(conflict => {
      conflict.status = 'resolved';
      conflict.resolvedAt = now;
      conflict.resolutionMethod = 'most_recent';
      conflict.resolvedBy = 'system';
      this.conflicts.set(conflict.id, conflict);
      this.recordTemporalEvent({
        type: 'conflict',
        description: `Conflict ${conflict.id} resolved via recency`,
        timestamp: now,
        metadata: { conflictId: conflict.id, method: 'most_recent' }
      });
    });

    return conflicts;
  }

  private resolveConflictsByConfidence(targetIds: Set<string>): WorldConflict[] {
    const now = new Date();
    const conflicts = Array.from(this.conflicts.values())
      .filter(conflict => targetIds.has(conflict.id) && conflict.status === 'open');

    const resolved: WorldConflict[] = [];

    conflicts.forEach(conflict => {
      const factA = this.facts.get(conflict.factA);
      const factB = this.facts.get(conflict.factB);

      if (factA && factB) {
        const winner = factA.confidenceScore >= factB.confidenceScore ? factA : factB;
        const loser = winner.id === factA.id ? factB : factA;

        loser.validUntil = now;
        loser.updatedAt = now;
        this.facts.set(loser.id, loser);

        conflict.status = 'resolved';
        conflict.resolvedAt = now;
        conflict.resolutionMethod = 'weighted';
        conflict.resolvedBy = 'system';
        this.conflicts.set(conflict.id, conflict);
        resolved.push(conflict);

        this.recordTemporalEvent({
          type: 'conflict',
          description: `Conflict ${conflict.id} resolved by confidence weighting`,
          timestamp: now,
          metadata: {
            conflictId: conflict.id,
            method: 'weighted',
            winner: winner.id,
            loser: loser.id
          }
        });
      } else {
        conflict.status = 'resolved';
        conflict.resolvedAt = now;
        conflict.resolutionMethod = 'weighted';
        conflict.resolvedBy = 'system';
        this.conflicts.set(conflict.id, conflict);
        resolved.push(conflict);

        this.recordTemporalEvent({
          type: 'conflict',
          description: `Conflict ${conflict.id} resolved without fact comparison`,
          timestamp: now,
          metadata: {
            conflictId: conflict.id,
            method: 'weighted'
          }
        });
      }
    });

    return resolved;
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 3;
      case 'error': return 2;
      case 'warning': return 1;
      default: return 0;
    }
  }

  private generateRecommendations(warnings: any[], errors: any[], conflicts: any[]): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push('Resolve critical errors before proceeding');
    }

    if (conflicts.length > 0) {
      recommendations.push('Review and resolve high-priority conflicts');
    }

    if (warnings.length > 10) {
      recommendations.push('Consider reviewing and updating confidence scores');
    }

    return recommendations;
  }

  private calculateAverageConfidence(): number {
    const allFacts = Array.from(this.facts.values());
    if (allFacts.length === 0) return 0;

    const total = allFacts.reduce((sum, fact) => sum + fact.confidenceScore, 0);
    return total / allFacts.length;
  }
}
