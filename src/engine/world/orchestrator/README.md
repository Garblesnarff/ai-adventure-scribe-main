# World Orchestrator Module

**Status**: Refactored from 884 lines into 8 focused modules (Work Unit 5.3)

## Overview

The World Orchestrator integrates the World Graph system with Scene Orchestration, maintaining consistent world state across game sessions. It processes player intents and DM actions to automatically update entities, relationships, facts, and events in the persistent world model.

## Architecture

### Design Patterns

- **Facade Pattern**: `WorldOrchestrator` provides a unified interface to complex subsystems
- **Strategy Pattern**: Different handlers for different intent types (entity, relationship, event, action)
- **Separation of Concerns**: Each module has focused responsibility

### Module Structure

```
orchestrator/
├── WorldOrchestrator.ts      # Main facade (187 lines)
├── IntentProcessor.ts         # Text parsing & extraction (267 lines)
├── EntityManager.ts           # Entity operations (237 lines)
├── RelationshipManager.ts     # Relationship management (138 lines)
├── EventManager.ts            # Event handling (91 lines)
├── ActionAnalyzer.ts          # Action intent analysis (150 lines)
├── EntityTypeInference.ts     # Entity type detection (100 lines)
├── types.ts                   # Shared types (70 lines)
├── index.ts                   # Public exports (27 lines)
└── README.md                  # This file
```

**Total**: 1,267 lines across 8 modules (vs. 884 lines in single file)
**Average**: 158 lines per module (well within 200-line standard)

## Modules

### WorldOrchestrator (Main Facade)

**Responsibilities**:
- Coordinate between all sub-managers
- Process player intents and DM actions
- Maintain consistent world state
- Provide unified interface

**Usage**:
```typescript
import { WorldOrchestrator } from '@/engine/world/orchestrator';

const orchestrator = new WorldOrchestrator(sessionId);

// Process player intent
const result = orchestrator.processPlayerIntent(intent, sceneState);

// Process DM action
orchestrator.processDMAction(action, sceneState);
```

### IntentProcessor

**Responsibilities**:
- Extract entity names from text
- Parse relationship patterns
- Extract event data from narration
- Identify locations and time expressions

**Key Methods**:
- `extractEntityName(text)` - Find entity mentions
- `extractLocationName(text)` - Find location references
- `parseRelationshipIntent(text, sceneState)` - Parse relationship statements
- `extractEventData(text, sceneState)` - Extract event information
- `inferEntityType(text)` - Determine entity type (delegates to EntityTypeInference)

### EntityManager

**Responsibilities**:
- Create and update entities
- Manage entity descriptions and facts
- Handle entity location changes
- Track entity state changes (health, status)

**Key Methods**:
- `handleEntityDescription(text, sceneState, actions)` - Create/update entity
- `handleLocationStatement(text, sceneState, actions)` - Move entity to location
- `handleItemAcquisition(itemName, playerId)` - Track item ownership
- `updateEntityState(entityId, propertyKey, value)` - Update entity properties

### RelationshipManager

**Responsibilities**:
- Create relationships between entities
- Ensure entities exist before linking
- Track relationship changes

**Key Methods**:
- `handleRelationshipEstablishment(text, sceneState, actions)` - Create relationship
- `createRelationship(subject, object, type, description, ...)` - Link entities

**Supported Relationship Types**:
- `friend_of`, `enemy_of`
- `parent_of`, `child_of`
- `owns`, `works_for`

### EventManager

**Responsibilities**:
- Create event entities from narration
- Track event participants
- Link events to related entities

**Key Methods**:
- `handleEventNarration(text, sceneState, actions)` - Create event entity
- `linkEventParticipants(eventId, participantNames)` - Connect participants

### ActionAnalyzer

**Responsibilities**:
- Detect entity state changes (death, injury)
- Identify item acquisition/loss
- Generate fact updates and relationship changes

**Key Methods**:
- `handleActionIntent(intent, sceneState, actions)` - Process action
- `analyzeActionIntent(text)` - Extract state changes

**Detects**:
- Death/destruction states
- Injury/health changes
- Item acquisition

### EntityTypeInference

**Responsibilities**:
- Classify entities by type
- Pattern matching for entity categories

**Key Methods**:
- `inferEntityType(text)` - Determine entity classification
- `isPersonName(name)` - Check if name is a person
- `isPlaceName(name)` - Check if name is a location
- `isItemName(name)` - Check if name is an item
- etc.

**Entity Types Supported**:
- `person` - Characters, NPCs
- `place` - Locations, buildings
- `item` - Equipment, objects
- `organization` - Guilds, factions
- `event` - Historical events
- `creature` - Monsters, animals
- `concept` - Abstract ideas

## Types

### Result<T>
Generic result type for operations:
```typescript
interface Result<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### RelationshipPattern
Parsed relationship data:
```typescript
interface RelationshipPattern {
  relationshipType: RelationshipType;
  subjectName: string;
  subjectType?: EntityType;
  objectName: string;
  objectType?: EntityType;
}
```

### EventData
Extracted event information:
```typescript
interface EventData {
  name: string;
  occurredAt: Date;
  participants: string[];
}
```

### ActionAnalysis
Result of action intent analysis:
```typescript
interface ActionAnalysis {
  entityUpdates: FactUpdateRequest[];
  relationshipChanges: RelationshipCreateRequest[];
}
```

## Integration

### Scene Orchestrator Integration

The WorldOrchestrator is designed to work alongside the Scene Orchestrator:

```typescript
// In scene processing
const worldResult = worldOrchestrator.processPlayerIntent(intent, sceneState);

if (worldResult.success && worldResult.data) {
  // World graph was updated, DM action generated
  actions.push(worldResult.data);
}
```

### World Graph Access

Each manager has direct access to the World Graph:
- Query entities: `worldGraph.queryEntities(query)`
- Create entities: `worldGraph.createEntity(request)`
- Update facts: `worldGraph.updateEntityFact(request)`
- Create relationships: `worldGraph.createRelationship(request)`

## Intent Processing Flow

1. **Player Intent** → `WorldOrchestrator.processPlayerIntent()`
2. **Intent Classification** → Determine intent type (entity, relationship, location, event, action)
3. **Manager Delegation** → Route to appropriate manager (Entity, Relationship, Event, Action)
4. **Text Processing** → IntentProcessor extracts structured data
5. **World Graph Update** → Manager updates entities/relationships/facts
6. **DM Action Generation** → Actions added to scene state
7. **Result Return** → Success/failure result with optional DM action

## Performance Considerations

- **Text Parsing**: Multiple regex patterns per intent (optimize if needed)
- **Entity Queries**: Direct map lookups in WorldGraph (O(1) for ID, O(n) for name search)
- **Manager Overhead**: Minimal - managers are lightweight coordinators
- **Memory**: Each manager instance holds reference to WorldGraph (shared state)

## Testing

Test each module independently:

```typescript
// Test IntentProcessor
const processor = new IntentProcessor();
const entityName = processor.extractEntityName("The dragon Smaug");
expect(entityName).toBe("Smaug");

// Test EntityManager
const entityManager = new EntityManager(mockWorldGraph, mockIntentProcessor);
entityManager.handleEntityDescription("John is a knight", sceneState, actions);
expect(actions).toHaveLength(1);
```

## Future Improvements

1. **NLP Integration**: Replace regex patterns with proper NLP for better extraction
2. **Confidence Scoring**: Improve confidence calculation based on context
3. **Caching**: Cache frequently queried entities
4. **Event Sourcing**: Track all world changes for replay/debugging
5. **Parallel Processing**: Process independent intents concurrently

## Refactoring Notes

**Original**: Single 884-line file with all logic intertwined
**Refactored**: 8 focused modules with clear responsibilities

**Benefits**:
- Easier to test individual components
- Clearer code organization
- Better separation of concerns
- Modules can be improved independently
- Each file meets 200-line standard (with 2 acceptable exceptions)

**Backward Compatibility**:
The original `orchestrator.ts` now re-exports from `orchestrator/index.ts`, maintaining all existing imports.
