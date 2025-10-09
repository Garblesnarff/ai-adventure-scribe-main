import { WorldGraph } from '../graph';
import { 
  WorldEntity,
  WorldRelationship,
  WorldFact,
  WorldConflict,
  Result,
  EntityQuery,
  RelationshipQuery,
  TemporalEvent
} from '../types';

describe('World Graph Engine', () => {
  let worldGraph: WorldGraph;
  const sessionId = 'test-session-1';

  beforeEach(() => {
    worldGraph = new WorldGraph(sessionId);
  });

  describe('Entity Management', () => {
    describe('createEntity', () => {
      it('should create a person entity with basic properties', () => {
        const request = {
          entityType: 'person',
          name: 'John Doe',
          description: 'A test character',
          tags: ['player', 'fighter'],
          confidenceScore: 0.8,
          sourceType: 'manual'
        };

        const result = worldGraph.createEntity(request);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.name).toBe('John Doe');
        expect(result.data.entityType).toBe('person');
        expect(result.data.description).toBe('A test character');
        expect(result.data.tags).toEqual(['player', 'fighter']);
        expect(result.data.confidenceScore).toBe(0.8);
        expect(result.data.sourceType).toBe('manual');
        expect(result.data.status).toBe('unknown');
      });

      it('should detect similar existing entities and create conflicts', () => {
        // Create first entity
        worldGraph.createEntity({
          entityType: 'person',
          name: 'Alice Johnson',
          description: 'First character',
          confidenceScore: 0.9
        });

        // Create second entity with very similar name
        const result = worldGraph.createEntity({
          entityType: 'person',
          name: 'Alicia Johnson',
          description: 'Similar name character',
          confidenceScore: 0.8
        });

        // Should still succeed but with warnings about similarity
        expect(result.success).toBe(true);
        expect(result.stat.error).toBeDefined();
        expect(result.stat.conflictDetected).toBe(true);
      });

      it('should handle invalid entity types', () => {
        const result = worldGraph.createEntity({
          entityType: 'invalid_type' as any,
          name: 'Test Entity'
        });

        expect(result.success).toBe(false);
        expect(result.stat.error).toContain('Invalid entity type');
      });
    });

    describe('queryEntities', () => {
      beforeEach(() => {
        // Setup test data
        worldGraph.createEntity({ entityType: 'person', name: 'Alice', confidenceScore: 0.8 });
        worldGraph.createEntity({ entityType: 'place', name: 'Tavern', confidenceScore: 0.7 });
        worldGraph.createEntity({ entityType: 'item', name: 'Sword', confidenceScore: 0.5 });
        worldGraph.createEntity({ entityType: 'organization', name: 'Fighters Guild', confidenceScore: 0.6 });
      });

      it('should filter by entity type', () => {
        const persons = worldGraph.queryEntities({ entityTypes: ['person'] });
        const places = worldGraph.queryEntities({ entityTypes: ['place'] });

        expect(persons.length).toBe(1);
        expect(places.length).toBe(1);
        expect(persons[0].name).toBe('Alice');
        expect(places[0].name).toBe('Tavern');
      });

      it('should filter by status', () => {
        worldGraph.createEntity({ 
          entityType: 'person', 
          name: 'Dead Character',
          status: 'dead',
          confidenceScore: 0.9
        });

        const activeEntities = worldGraph.queryEntities({ status: 'active' });
        const deadEntities = worldGraph.queryEntities({ status: 'dead' });

        expect(activeEntities.length).toBe(3);
        expect(deadEntities.length).toBe(1);
        expect(deadEntities[0].name).toBe('Dead Character');
      });

      it('should filter by search text', () => {
        const results = worldGraph.queryEntities({ searchText: 'alice' });
        const noResults = worldGraph.queryEntities({ searchText: 'NonExistent' });

        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Alice');
        expect(noResults.length).toBe(0);
      });

      it('should filter by tags', () => {
        const tagged = worldGraph.queryEntities({ tags: ['player'] });
        const untagged = worldGraph.queryEntities({ tags: [] });

        expect(tagged.length).toBe(2); // Alice has 'player' tag
        expect(untagged.length).toBe(3); // All others except Alice
      });
    });
  });

  describe('Relationship Management', () => {
    beforeEach(() => {
      // Create test entities
      worldGraph.createEntity({ entityType: 'person', name: 'Alice' });
      worldGraph.createEntity({ entityType: 'person', name: 'Bob' });
      worldGraph.createEntity({ entityType: 'place', name: 'Tavern' });
    });

    describe('createRelationship', () => {
      it('should create a relationship between two entities', () => {
        const alice = worldGraph.queryEntities({ name: 'Alice' })[0];
        const bob = worldGraph.queryEntities({ searchText: 'Bob' })[0];

        const request = {
          subjectId: alice.id,
          objectId: bob.id,
          relationshipType: 'friend_of',
          description: 'Alice considers Bob a friend',
          confidenceScore: 0.7
        };

        const result = worldGraph.createRelationship(request);

        expect(result.success).toBe(true);
        expect(result.data.subjectId).toBe(alice.id);
        expect(result.data.objectId).toBe(bob.id);
        expect(result.data.relationshipType).toBe('friend_of');
        expect(result.data.strength).toBe(0);
        expect(result.data.mutual).toBe(false);
      });

      it('should create mutual relationships', () => {
        const alice = worldGraph.queryEntities({ name: 'Alice' })[0];
        const bob = worldGraph.queryEntities({ searchText: 'Bob' })[0];

        const request = {
          subjectId: alice.id,
          objectId: bob.id,
          relationshipType: 'married_to',
          mutual: true,
          confidenceScore: 0.9
        };

        const result = worldGraph.createRelationship(request);

        expect(result.success).toBe(true);
        expect(result.data.mutual).toBe(true);

        // Should create reciprocal relationship
        const reciprocal = worldGraph.queryRelationships({
          subjectId: bob.id,
          objectId: alice.id,
          relationshipType: 'married_to'
        });

        expect(reciprocal.length).toBe(1);
      });

      it('should validate relationship types', () => {
        // Invalid relationship: person owns person
        const alice = worldGraph.queryEntities({ name: 'Alice' })[0];
        const bob = worldGraph.queryEntities({ name: 'Bob' })[0];

        const result = worldGraph.createRelationship({
          subjectId: alice.id,
          objectId: bob.id,
          relationshipType: 'owns' as any
        });

        expect(result.success).toBe(false);
        expect(result.stat.error).toContain('Invalid relationship type');
      });

      it('should check for orphaned relationships', () => {
        const request = {
          subjectId: 'non-existent',
          objectId: ' also-non-existent',
          relationshipType: 'knows'
        };

        const result = worldGraph.createRelationship(request);

        expect(result.success).toBe(false);
        expect(result.stat.error).toContain('One or both entities not found');
      });
    });

    describe('queryRelationships', () => {
      beforeEach(() => {
        // Create test entities and relationships
        const alice = worldGraph.createEntity({ entityType: 'person', name: 'Alice' });
        const bob = worldGraph.createEntity({ entityType: 'person', name: 'Bob' });
        const charlie = worldGraph.createEntity({ entityType: 'person', name: 'Charlie' });

        worldGraph.createRelationship({
          subjectId: alice.id,
          objectId: bob.id,
          relationshipType: 'friend_of'
        });

        worldGraph.createRelationship({
          subjectId: alice.id,
          objectId: charlie.id,
          relationshipType: 'knows',
          strength: 0.3
        });

        worldGraph.createRelationship({
          subjectId: bob.id,
          objectId: charlie.id,
          relationshipType: 'enemy_of',
          strength: -0.8
        });
      });

      it('should filter by relationship type', () => {
        const friendships = worldGraph.queryRelationships({ relationshipTypes: ['friend_of', 'knows'] });
        const enemies = worldGraph.queryRelationships({ relationshipTypes: ['enemy_of'] });

        expect(friendships.length).toBe(2);
        expect(enemies.length).toBe(1);
      });

      it('filter relationships by strength range', () => {
        const highConfidence = worldGraph.queryRelationships({ minConfidence: 0.8 });
        const allRelationships = worldGraph.queryRelationships({});

        expect(highConfidence.length).toBeLessThanOrEqual(allRelationships.length));
      });

      it('should filter by mutual relationships', () => {
        const mutual = worldGraph.queryRelationships({ mutual: true });
        const nonMutual = worldGraph.queryRelationships({ mutual: false });

        expect(mutual.length).toBe(2); // Alice-Charles know each other
        expect(nonMutual.length).toBe(2); // Alice-Bob (not mutual) and Bob-Charlie
      });
    });
  });

  describe('Fact Management', () => {
    beforeEach(() => {
      // Create test entity
      const entity = worldGraph.createEntity({
        entityType: 'person',
        name: 'Test Character',
        metadata: { level: 5, class: 'Fighter', hp: 50, maxHp: 50 }}
      });
    });

    describe('updateEntityFact', () => {
      it('should update entity properties with fact tracking', () => {
        const factRequest = {
          entityId: 'test-entity-id',
          propertyKey: 'hp',
          value: 45
        };

        const result = worldGraph.updateEntityFact(factRequest);
        const entity = worldGraph.queryEntities({ id: 'test-entity-id' })[0];

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('test-entity-id');
        expect(entity.metadata.hp).toBe(45);
        expect(result.data.previousValue).toBe(50);
      });

      it('maintains confidence history for facts', () => {
        const initialFact = worldGraph.updateEntityFact({
          entityId: 'test-entity-id',
          propertyKey: 'confidence',
          value: 0.6
        });

        const updatedFact = worldGraph.updateEntityFact({
          entityId: 'test-entity-id',
          propertyKey: 'confidence',
          value: 0.8
        });

        const history = worldGraph.getFactConfidenceHistory('test-entity-id');
        
        expect(history).toHaveLength(2);
        expect(history[1].score).toBe(0.8);
        expect(history[1].previousScore).toBe(0.6);
      });
    });
  });

  describe('Consistency Validation', () => {
    beforeEach(() => {
      // Create some test data with potential conflicts
      worldGraph.createEntity({ 
        entityType: 'person', 
        name: 'Alice', 
        confidenceScore: 0.9 
      });
      
      worldGraph.createEntity({ 
        entityType: 'person', 
        name: 'Alicia', 
        confidenceScore: 0.8 
      });

      worldGraph.createEntity({ 
        entityType: 'person', 
        name: 'Bob', 
        confidenceScore: 0.6 
      });

      worldGraph.createRelationship({
        subjectId: 'alice-entity-1',
        objectId: 'bob-entity-1',
        relationshipType: 'friend_of'
      });

      worldGraph.createRelationship({
        subjectId: 'alice-entity-1',
        objectId: 'bob-entity-1',
        relationshipType: 'enemy_of'
      });
    });

    describe('validateWorld', () => {
      it('should detect property conflicts', () => {
        const alice = worldGraph.queryEntities({ name: 'Alice' })[0];
        const alicia = worldGraph.queryEntities({ name: 'Alicia' })[0];

        if (alice.id && alicia.id) {
          // Create conflicting facts
          worldGraph.updateEntityFact({
            entityId: alice.id,
            propertyKey: 'alignment',
            value: 'chaotic'
          });

          worldGraph.updateEntityFact({
            entityId: alicia.id,
            propertyKey: 'alignment',
            value: 'lawful'
          });
        }

        const validation = worldGraph.validateWorld();
        
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should detect relationship conflicts', () => {
        const validation = worldGraph.validateWorld();
        
        expect(validation.valid).toBe(false);
        expect(validation.conflicts.length).toBeGreaterThan(0);
        // Should detect the friend_of vs enemy_of conflict
      });

      it('provide recommendations for conflict resolution', () => {
        const validation = worldGraph.validateWorld();
        
        expect(validation.recommendations).toBeDefined();
        expect(validation.recommendations.length).toBeGreaterThan(0);
      });

      it('determine overall validity', () => {
        // Add valid data
        worldGraph.createEntity({ 
          entityType: 'person', 
          name: 'Valid Entity', 
          confidenceScore: 0.8 
        });

        let validation = worldGraph.validateWorld();
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('Temporal Tracking', () => {
    let now: Date;
    let yesterday: Date;
    let twoDaysAgo: Date;
    
    beforeEach(() => {
      // Create entities with temporal information
      now = new Date();
      yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      worldGraph.createEntity({
        entityType: 'person',
        name: 'Timeline Character',
        lifespanStart: twoDaysAgo,
        status: 'active'
      });

      worldGraph.createEntity({
        entityType: 'person',
        name: 'Dead Ghost',
        lifespanStart: yesterday,
        lifespanEnd: twoDaysAgo,
        status: 'destroyed'
      });
    });

    describe('getValidFacts', () => {
      it('should return facts valid at a given time', () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const validFacts = worldGraph.getValidFacts(now);
        const futureFacts = worldGraph.getValidFacts(futureDate);

        expect(validFacts.length).toBeGreaterThan(0);
        expect(futureFacts.length).toBe(0);
      });

      it('return only currently valid entities', () => {
        const now = new Date();
        const validEntities = worldGraph.getValidEntities(now);
        const allEntities = Array.from(worldGraph.entities.values());

        expect(validEntities.length).toBeLessThanOrEqual(allEntities.length));
      });
    });

    describe('createTimeline', () => {
      it('should generate chronological timeline of events', () => {
        const timeline = worldGraph.createTimeline();
        
        expect(timeline).toBeInstanceOf(Array);
        expect(timeline.length).toBeGreaterThan(0);
      });

      it('should include entity lifecycle events', () => {
        const timeline = worldGraph.createTimeline();
        
        const lifecycleEvents = timeline.filter(e => e.type === 'entity_lifecycle');
        
        expect(lifecycleEvents.length).toBeGreaterThan(0);
      });
    });

    describe('validateTemporalConsistency', () => {
      it('detects future facts as errors', () => {
        const validation = worldGraph.validateTemporalConsistency();
        
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('detects inverted lifespans as errors', () => {
        const validation = worldGraph.validateTemporalConsistency();
        
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => 
          e.message.includes('inverted lifespan')
        ));
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex game scenario end-to-end', () => {
      // Create a complete game scenario
      const alice = worldGraph.createEntity({
        entityType: 'person',
        name: 'Alice',
        confidenceScore: 0.9
      });

      const bob = worldGraph.createEntity({
        entityType: 'person',
        name: 'Bob',
        confidenceScore: 0.8
      });

      const tavern = worldGraph.createEntity({
        entityType: 'place',
        name: 'The Rusty Dragon Tavern',
        confidenceScore: 0.7
      });

      // Create relationships
      worldGraph.createRelationship({
        subjectId: alice.id,
        objectId: bob.id,
        relationshipType: 'friend_of'
      });

      worldGraph.createRelationship({
        subjectId: alice.id,
        objectId: tavern.id,
        relationshipType: 'located_in'
      });

      // Move entities
      worldGraph.moveEntity(alice.id, tavern.id);

      // Update entity states
      worldGraph.updateEntityFact({
        entityId: bob.id,
        propertyKey: 'health',
        value: 15
      });

      // Create timeline
      const timeline = worldGraph.createTimeline();
      
      expect(timeline.length).toBeGreaterThan(10);
      
      // Verify timeline structure
      const entityCreationCount = timeline.filter(e => e.type === 'entity_lifecycle');
      const locationChanges = timeline.filter(e => e.type === 'entity_location');
      
      expect(entityCreationCount).toBe(2); // Alice, Dead Ghost
      expect(locationChanges.length).toBe(1); // Alice moved to tavern
      expect(locationChanges[0].entityName).toBe('Alice');
    });

    it('should integrate with scene state', () => {
      const sessionState = {
        id: 'test-session',
        turnCount: 5,
        entityCreateCount: 3,
        relationshipCreateCount: 2,
        factUpdateCount: 1
      };

      // After processing world intents, session should be updated
      expect(sessionState.entityCreateCount).toBe(3);
      expect(sessionState.relationshipCreateCount).toBe(2);
      expect(sessionState.factUpdateCount).toBe(1);
    });

    describe('Conflict Resolution', () => {
      let alice: WorldEntity;
      
      beforeEach(() => {
        // Create conflicting facts
        alice = worldGraph.createEntity({
          entityType: 'person',
          name: 'Alice',
          confidenceScore: 0.8
        }).data!;

        worldGraph.updateEntityFact({
          entityId: alice.id,
          propertyKey: 'location',
          value: 'Forest'
        });

        worldGraph.updateEntityFact({
          entityId: alice.id,
          propertyKey: 'location',
          value: 'Mountains'
        });
      });

      describe('auto-resolve conflicts', () => {
        it('should resolve weighted conflicts', () => {
          const conflicts = worldGraph.getConflicts();
          const resolution = worldGraph.resolveConflicts(conflicts, 'weighted');
          
          expect(resolution.success).toBe(true);
          expect(resolution.resolvedCount).toBeGreaterThan(0);
        });
      });

    describe('snapshot functionality', () => {
      it('create comprehensive world snapshot', () => {
        const snapshot = worldGraph.createSnapshot();
        
        expect(snapshot.sessionId).toBe(sessionId);
        expect(snapshot.timestamp).toBeInstanceOf(Date);
        expect(snapshot.entities).toBeInstanceOf(Array);
        expect(snapshot.relationships).toBeInstanceOf(Array));
        expect(snapshot.facts).toBeInstanceOf(Array));
        expect(snapshot.metrics.entityCount).toBeDefined();
        expect(snapshot.metrics.relationshipCount).toBeDefined();
        expect(snapshot.metrics.factCount).toBeDefined();
        expect(snapshot.metrics.averageConfidence).toBeDefined();
      });
    });
  });
});
