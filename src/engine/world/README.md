# World Graph System

**Location**: `src/engine/world/`

## Overview

The World Graph System provides persistent world state management for D&D campaigns. It maintains a consistent knowledge graph of entities, relationships, facts, and temporal information across multiple game sessions.

## Architecture

### Core Components

```
world/
├── graph.ts              # WorldGraph class - core graph engine (640 lines)
├── types.ts              # Type definitions (362 lines)
├── orchestrator.ts       # Backward-compatible export (30 lines)
├── orchestrator/         # Refactored orchestration modules
│   ├── WorldOrchestrator.ts      # Main facade (187 lines)
│   ├── IntentProcessor.ts        # Text parsing (267 lines)
│   ├── EntityManager.ts          # Entity operations (237 lines)
│   ├── RelationshipManager.ts    # Relationship management (138 lines)
│   ├── EventManager.ts           # Event handling (91 lines)
│   ├── ActionAnalyzer.ts         # Action analysis (150 lines)
│   ├── EntityTypeInference.ts    # Type detection (100 lines)
│   ├── types.ts                  # Shared types (70 lines)
│   └── README.md                 # Orchestrator documentation
└── __tests__/            # Unit tests
```

## World Graph (`graph.ts`)

The core graph engine that stores and manages world state.

### Key Features

- **Entity Management**: Create, query, and update world entities
- **Relationship Tracking**: Maintain connections between entities
- **Fact Storage**: Store and query temporal facts about entities
- **Consistency Engine**: Detect and resolve conflicts
- **Temporal Tracking**: Track entity states over time

### Usage

```typescript
import { WorldGraph } from '@/engine/world/graph';

const graph = new WorldGraph(sessionId);

// Create entity
const result = graph.createEntity({
  entityType: 'person',
  name: 'Aragorn',
  description: 'Ranger from the North',
  confidenceScore: 0.9
});

// Query entities
const entities = graph.queryEntities({
  entityType: 'person',
  name: 'Aragorn'
});

// Create relationship
graph.createRelationship({
  subjectId: entity1.id,
  objectId: entity2.id,
  relationshipType: 'knows',
  confidenceScore: 0.8
});

// Update facts
graph.updateEntityFact({
  entityId: entity.id,
  propertyKey: 'location',
  value: 'Rivendell',
  confidenceScore: 0.9
});
```

## World Orchestrator (`orchestrator/`)

Integrates the World Graph with Scene Orchestration, automatically extracting world information from player intents and DM actions.

### Key Features

- **Intent Processing**: Extract entities, relationships, and events from text
- **Automatic Updates**: Update world state based on game events
- **Entity Type Inference**: Classify entities intelligently
- **Action Analysis**: Track state changes (death, injury, item acquisition)

### Usage

```typescript
import { WorldOrchestrator } from '@/engine/world/orchestrator';

const orchestrator = new WorldOrchestrator(sessionId);

// Process player intent
const result = orchestrator.processPlayerIntent(intent, sceneState);

// Process DM action
orchestrator.processDMAction(action, sceneState);
```

See [`orchestrator/README.md`](./orchestrator/README.md) for detailed documentation.

## Entity Types

The system supports 7 entity types:

1. **person** - Characters, NPCs, individuals
2. **place** - Locations, buildings, regions
3. **item** - Equipment, objects, artifacts
4. **organization** - Guilds, factions, governments
5. **event** - Historical events, battles, meetings
6. **creature** - Monsters, animals, beasts
7. **concept** - Abstract ideas, magic systems

## Relationship Types

Supported relationship types include:

- **Social**: `knows`, `friend_of`, `enemy_of`, `married_to`
- **Familial**: `parent_of`, `child_of`
- **Organizational**: `member_of`, `works_for`, `leads`
- **Spatial**: `located_in`, `lives_in`
- **Ownership**: `owns`, `carries`, `controls`
- **Action**: `guards`, `serves`, `follows`, `hunts`, `protects`
- **Emotional**: `fears`, `hates`, `respects`, `trusts`

## Fact Types

Facts represent temporal knowledge about entities:

- `entity_property` - Properties of entities (name, description, etc.)
- `entity_location` - Location tracking
- `relationship_property` - Relationship attributes
- `event_occurrence` - Event timestamps
- `world_state` - Global world facts
- `rule_fact` - Rule-derived facts
- `derived_fact` - Inferred facts

## Consistency Engine

The Consistency Engine detects and resolves conflicts:

### Conflict Types

- **Property Conflicts**: Contradictory entity properties
- **Relationship Conflicts**: Incompatible relationships
- **Location Conflicts**: Entity in multiple places
- **Temporal Conflicts**: Timeline inconsistencies

### Resolution Methods

- `manual` - Requires DM intervention
- `automatic` - System resolves automatically
- `weighted` - Use confidence scores
- `most_recent` - Prefer newer information
- `dm_override` - DM decision takes precedence

## Temporal Tracking

Track entity states over time:

```typescript
// Entity with lifespan
const entity = {
  ...
  lifespanStart: new Date('1990-01-01'),
  lifespanEnd: new Date('2020-12-31'),
  status: 'inactive'
};

// Facts with validity periods
const fact = {
  ...
  validFrom: new Date('2000-01-01'),
  validUntil: new Date('2010-01-01')
};
```

## Query System

Powerful query capabilities:

```typescript
// Query entities
graph.queryEntities({
  entityTypes: ['person', 'creature'],
  status: 'active',
  tags: ['hostile'],
  locationId: 'tavern-123',
  minConfidence: 0.7,
  validAt: new Date()
});

// Query relationships
graph.queryRelationships({
  subjectId: 'entity-123',
  relationshipTypes: ['knows', 'friend_of'],
  mutual: true,
  minConfidence: 0.5
});

// Query facts
graph.queryFacts({
  factTypes: ['entity_property'],
  subjectId: 'entity-123',
  propertyKey: 'health',
  validAt: new Date(),
  minConfidence: 0.6
});
```

## Confidence Scoring

All world information has confidence scores (0-1):

- **0.9-1.0**: Verified facts (DM statements, explicit player actions)
- **0.7-0.9**: High confidence (clear player intent)
- **0.5-0.7**: Medium confidence (inferred from context)
- **0.3-0.5**: Low confidence (mentioned entities, unclear intent)
- **0.0-0.3**: Very low confidence (automatic inference)

## Source Types

Track information sources:

- `player_action` - From player intents
- `dm_statement` - From DM narration
- `rule_derivation` - Derived from game rules
- `external_fact` - From external sources
- `inferred` - System inference
- `automatic` - Automatic detection
- `manual` - Manual entry

## Performance

- **Entity Lookups**: O(1) by ID, O(n) by name
- **Relationship Queries**: O(n) filtered search
- **Fact Storage**: In-memory maps with temporal indexing
- **Consistency Checks**: Run on-demand or scheduled

## Testing

Run world graph tests:

```bash
npm run server:test -- world
```

## Integration Points

### Scene Orchestrator
`orchestrator/` handles integration with scene processing

### Agent Memory System
World Graph can feed into agent episodic memory

### Campaign Database
Persistent storage via Supabase integration

## Refactoring History

**Work Unit 5.3**: Refactored `orchestrator.ts` from 884 lines into 8 focused modules
- Main facade: `WorldOrchestrator` (187 lines)
- Text processing: `IntentProcessor` (267 lines)
- Entity operations: `EntityManager` (237 lines)
- Relationship management: `RelationshipManager` (138 lines)
- Event handling: `EventManager` (91 lines)
- Action analysis: `ActionAnalyzer` (150 lines)
- Type inference: `EntityTypeInference` (100 lines)
- Shared types: `types.ts` (70 lines)

**Benefits**:
- Clearer separation of concerns
- Easier to test components individually
- Each module under or near 200-line standard
- Maintained backward compatibility

## Future Enhancements

1. **Vector Embeddings**: Semantic entity search
2. **Graph Visualization**: Visual world graph explorer
3. **Conflict Resolution UI**: DM interface for resolving conflicts
4. **Timeline Branching**: Support alternate timelines
5. **Import/Export**: World graph serialization
6. **Performance Optimization**: Caching, indexing improvements
7. **NLP Integration**: Better entity extraction with proper NLP
