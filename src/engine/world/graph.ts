import { logger } from '../../lib/logger';
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
  RelationshipType,
  SourceType,
  VerificationMethod,
  ConflictType,
  ConflictStatus,
  ResolutionMethod
} from './types';

/**
 * Core world graph engine for maintaining consistent world state
 */
export class WorldGraph {
  private entities: Map<string, WorldEntity> = new Map();
  private relationships: Map<string, WorldRelationship> = new Map();
  private facts: Map<string, WorldFact> = new Map();
  private conflicts: Map<string, WorldConflict> = new Map();
  private rules: WorldRule[] = [];
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Create a new entity in the world
   */
  createEntity(request: EntityCreateRequest): Result<WorldEntity> {
    const id = this.generateId();
    const now = new Date();

    const entity: WorldEntity = {
      id,
      sessionId: this.sessionId,
      entityType: request.entityType,
      name: request.name,
      aliases: [],
      description: request.description,
      metadata: request.metadata || {},
      status: 'unknown',
      lifespanStart: request.entityType === 'person' || request.entityType === 'creature' ? now : undefined,
      locationHistory: [],
      tags: request.tags || [],
      category: request.category,
      confidenceScore: request.confidenceScore || 0.5,
      sourceType: request.sourceType || 'manual',
      sourceSessionId: this.sessionId,
      createdAt: now,
      updatedAt: now
    };

    // Check for existing entities with similar names
    this.detectSimilarEntities(entity);

    this.entities.set(id, entity);
    return { success: true, data: entity };
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
        code: 'ENTITY_NOT_FOUND'
      };
    }

    // Validate relationship type
    if (!this.isValidRelationship(subject.entityType, object.entityType, request.relationshipType)) {
      return {
        success: false,
        error: `Invalid relationship type: ${request.relationshipType} between ${subject.entityType} and ${object.entityType}`,
        code: 'INVALID_RELATIONSHIP'
      };
    }

    const relationship: WorldRelationship = {
      id: relationshipId,
      sessionId: this.sessionId,
      subjectId: request.subjectId,
      objectId: request.objectId,
      relationshipType: request.relationshipType,
      description: request.description,
      strength: request.strength ?? 0,
      mutual: request.mutual ?? false,
      validFrom: now,
      confidenceScore: request.confidenceScore || 0.5,
      sourceType: request.sourceType || 'manual',
      sourceSessionId: this.sessionId,
      createdAt: now,
      updatedAt: now
    };

    // Check for conflicting relationships
    this.detectRelationshipConflicts(relationship);

    // Create mutual relationship if requested
    if (relationship.mutual) {
      const mutualRelationship: WorldRelationship = {
        ...relationship,
        id: this.generateId(),
        subjectId: request.objectId,
        objectId: request.subjectId,
        description: request.description ? `Mutual: ${request.description}` : undefined
      };
      this.relationships.set(mutualRelationship.id, mutualRelationship);
    }

    this.relationships.set(relationshipId, relationship);
    return { success: true, data: relationship };
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

    const fact: WorldFact = {
      id: factId,
      sessionId: this.sessionId,
      factType: 'entity_property',
      subjectId: request.entityId,
      propertyKey: request.propertyKey,
      propertyValue: request.value,
      previousValue,
      observedAt: now,
      validFrom: now,
      confidenceScore: request.confidenceScore || 0.5,
      verificationMethod: request.verificationMethod || 'stated',
      sourceType: request.sourceType || 'manual',
      sourceSessionId: this.sessionId,
      contradictions: [],
      supportingFacts: [],
      confidenceHistory: [{
        score: request.confidenceScore || 0.5,
        changedAt: now,
        reason: 'Initial fact creation',
        changedBy: request.sourceType || 'manual',
        previousScore: 0
      }],
      createdAt: now,
      updatedAt: now
    };

    // Update entity metadata
    entity.metadata[request.propertyKey] = request.value;
    entity.updatedAt = now;

    // Detect contradictions with existing facts
    this.detectFactContradictions(fact);

    this.facts.set(factId, fact);
    return { success: true, data: fact };
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
      confidenceHistory: [{
        score: 0.8,
        changedAt: now,
        reason: 'Entity location change',
        changedBy: 'manual',
        previousScore: 0
      }],
      createdAt: now,
      updatedAt: now
    };

    this.facts.set(fact.id, fact);
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
      results = results.filter(e => e.status === query.status);
    }

    if (query.tags?.length) {
      results = results.filter(e => 
        query.tags!.some(tag => e.tags.includes(tag))
      );
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
   * Validate world state for consistency
   */
  validateWorld(): ValidationResult {
    const warnings: ValidationResult['warnings'] = [];
    const errors: ValidationResult['errors'] = [];
    const conflicts = Array.from(this.conflicts.values());
    
    // Apply world rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      const ruleResults = this.applyRule(rule);
      errors.push(...ruleResults.errors);
      warnings.push(...ruleResults.warnings);
      
      // Trigger rule consequences
      this.applyRuleConsequences(rule, ruleResults);
    }

    // Basic consistency checks
    this.validateBasicConsistency(warnings, errors);

    // Sort by severity
    warnings.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    errors.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));

    return {
      valid: errors.length === 0,
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
    // Define valid relationship patterns
    const validPatterns: Record<EntityType, Set<RelationshipType>> = {
      person: new Set(['owns', 'located_in', 'member_of', 'knows', 'allied_with', 'enemy_of', 'works_for', 'leads', 'parent_of', 'child_of', 'married_to', 'friend_of', 'uses', 'carries', 'guards', 'serves', 'follows', 'trades_with', 'lives_in', 'controls', 'protects', 'hunts', 'fears', 'hates', 'respects', 'trusts']),
      place: new Set(['located_in', 'contains', 'knows']),
      item: new Set(['owns', 'located_in', 'used_by', 'carried_by']),
      organization: new Set(['member_of', 'leads', 'owns', 'located_in', 'knows']),
      creature: new Set(['located_in', 'knows', 'hunts', 'fears', 'hates']),
      event: new Set(['occurs_in', 'involves']),
      concept: new Set(['known_by', 'understood_by'])
    };

    return validPatterns[subjectType]?.has(relationshipType) ?? false;
  }

  private detectSimilarEntities(newEntity: WorldEntity): void {
    const similar = this.queryEntities({
      entityType: newEntity.entityType,
      searchText: newEntity.name,
      minConfidence: 0.3
    });

    if (similar.length > 0) {
      // Create conflict for duplicate entities
      similar.forEach(existing => {
        if (existing.id !== newEntity.id && this.calculateSimilarity(newEntity, existing) > 0.7) {
          this.createConflict({
            type: 'entity_conflict',
            description: `Potential duplicate entity: ${newEntity.name} similar to ${existing.name}`,
            severity: 'medium',
            factA: newEntity.id,
            factB: existing.id
          });
        }
      });
    }
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

  private detectRelationshipConflicts(relationship: WorldRelationship): void {
    // Check for conflicting relationships
    const conflicting = this.queryRelationships({
      subjectId: relationship.subjectId,
      objectId: relationship.objectId,
      relationshipTypes: this.getConflictingTypes(relationship.relationshipType)
    });

    conflicting.forEach(existing => {
      if (this.isRelationshipConflict(relationship, existing)) {
        this.createConflict({
          type: 'relationship_conflict',
          description: `Conflicting relationship: ${relationship.relationshipType} vs ${existing.relationshipType}`,
          severity: 'high',
          factA: relationship.id,
          factB: existing.id
        });
      }
    });
  }

  private getConflictingTypes(type: RelationshipType): RelationshipType[] {
    // Define conflicting relationship types
    const conflicts: Record<RelationshipType, RelationshipType[]> = {
      enemy_of: ['allied_with', 'friend_of', 'married_to'],
      allied_with: ['enemy_of'],
      hates: ['loves', 'married_to', 'friend_of'],
      owns: ['owns'] // Self-ownership should be flagged
    };

    return conflicts[type] || [];
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
          type: 'property_conflict',
          description: `Conflicting values for ${fact.propertyKey}: ${fact.propertyValue} vs ${existing.propertyValue}`,
          severity: 'medium',
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

  private createConflict(conflict: Omit<WorldConflict, 'id' | 'createdAt' | 'sessionId'>): void {
    const fullConflict: WorldConflict = {
      id: this.generateId(),
      sessionId: this.sessionId,
      createdAt: new Date(),
      status: 'open',
      ...conflict
    };

    this.conflicts.set(fullConflict.id, fullConflict);
  }

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
      // Apply automatic resolution
      this.resolveConflicts(rule.resolutionMethod);
    }

    // Log rule violation
    logger.info(`Rule ${rule.name} triggered with ${results.errors.length} errors and ${results.warnings.length} warnings`);
  }

  private resolveConflicts(method: ResolutionMethod): void {
    switch (method) {
      case 'most_recent':
        this.resolveConflictsByRecency();
        break;
      case 'weighted':
        this.resolveConflictsByConfidence();
        break;
      // Add more resolution methods as needed
    }
  }

  private resolveConflictsByRecency(): void {
    const conflicts = Array.from(this.conflicts.values())
      .filter(c => c.status === 'open')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    conflicts.slice(10).forEach(conflict => {
      conflict.status = 'resolved';
      conflict.resolvedAt = new Date();
      conflict.resolutionMethod = 'most_recent';
      conflict.resolvedBy = 'system';
    });
  }

  private resolveConflictsByConfidence(): void {
    const conflicts = Array.from(this.conflicts.values())
      .filter(c => c.status === 'open');

    conflicts.forEach(conflict => {
      const factA = this.facts.get(conflict.factA);
      const factB = this.facts.get(conflict.factB);

      if (factA && factB) {
        const winner = factA.confidenceScore > factB.confidenceScore ? factA : factB;
        const loser = factA.confidenceScore > factB.confidenceScore ? factB : factA;

        // Invalidate the losing fact
        loser.validUntil = new Date();
        this.facts.set(loser.id, loser);

        conflict.status = 'resolved';
        conflict.resolvedAt = new Date();
        conflict.resolutionMethod = 'weighted';
        conflict.resolvedBy = 'system';
      }
    });
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

    if (conflicts.filter(c => c.severity === 'high').length > 0) {
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
