# Missing D&D 5E Mechanics Implementation Design

## Overview

This document outlines the implementation plan for the missing D&D 5E mechanics in the AI Adventure Scribe project. Based on analysis of the current codebase, we have a solid foundation with character creation, basic combat, and skill systems already implemented. The missing elements are primarily the more complex mechanical interactions that make D&D 5E's tactical combat and exploration shine.

## Repository Type

Full-Stack Application with D&D 5E game mechanics

## Architecture

The implementation will follow the existing modular, decoupled architecture with frontend-backend separation. The system uses Supabase for backend services and CrewAI for agent orchestration. The core innovation lies in its multi-agent AI system where specialized agents collaborate via a messaging protocol.

Key architectural patterns:
- Multi-Agent System (MCP-based)
- Event-Driven Architecture
- CQRS (Command Query Responsibility Segregation)
- Dependency Injection (via CrewAI)
- Context Propagation

## Priority Implementation Categories

### High Priority (Core D&D Experience)

1. **Damage Types & Resistances**
2. **Attack Roll Automation**
3. **Spell Components & Preparation**
4. **Rest Mechanics**
5. **Class Feature Implementation**

### Medium Priority (Enhanced Experience)

1. **Advanced Combat Options**
2. **Vision & Stealth Mechanics**
3. **Magic Item Properties**
4. **Environmental Hazards**

### Lower Priority (Campaign Features)

1. **Multiclassing Rules**
2. **Downtime Systems**
3. **Mass Combat

## 1. Damage Types & Resistances Implementation

### Data Models

#### Damage Types Classification
- Enumerate all damage types in D&D 5E (acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder)

#### Resistance System Model
- Define resistance levels (resistant, immune, vulnerable)
- Track resistance sources (racial traits, class features, spells, magic items)

### Implementation Plan

1. **Character Data Extension**
   - Extend character data model with damage resistance properties
   - Add resistance tracking to combat participant model

2. **Combat System Integration**
   - Modify damage calculation algorithms to account for resistances
   - Add resistance tracking in combat state management

3. **UI Components**
   - Display resistances on character sheet
   - Show resistance effects during combat

## 2. Attack Roll Automation

### Data Models

#### Attack Action Model
- Define attack action structure with attacker, target, and weapon/spell references
- Include attack bonus calculations
- Define damage structure with dice, type, and modifiers

### Implementation Plan

1. **Combat Action Extension**
   - Add attack action type to combat system
   - Implement attack roll calculation mechanics
   - Add critical hit detection and processing

2. **Weapon Data Enhancement**
   - Enhance weapon definitions with attack bonuses
   - Include weapon properties that affect attacks

3. **UI Components**
   - Attack selection interface
   - Attack roll visualization
   - Critical hit indicators

## 3. Spell Components & Preparation

### Data Models

#### Spell Component System
- Define spell component structure (verbal, somatic, material)
- Include material component details (description, consumption, cost)

#### Spell Preparation Model
- Track spell preparation status
- Handle always-prepared spells for certain class features

### Implementation Plan

1. **Spell Data Enhancement**
   - Add components to spell definitions
   - Add preparation requirements

2. **Character Spell System**
   - Track prepared spells separately from known spells
   - Implement spell preparation mechanics

3. **UI Components**
   - Spell preparation interface
   - Component tracking during casting

## 4. Rest Mechanics

### Data Models

#### Rest System Model
- Define rest types (short, long, extended)
- Structure rest effects (hit dice recovery, spell slot recovery, feature resets)

### Implementation Plan

1. **Character Resource Management**
   - Implement hit dice recovery mechanics
   - Add spell slot recovery algorithms
   - Reset class feature uses

2. **UI Components**
   - Rest action interface
   - Resource recovery visualization

## 5. Class Feature Implementation

### Implementation Plan

1. **Active Class Features**
   - Implement rage mechanics for Barbarian
   - Add sneak attack calculations for Rogue
   - Add divine smite functionality for Paladin

2. **Passive Class Features**
   - Implement unarmored defense for Barbarian/Monk
   - Add fighting style benefits

3. **UI Components**
   - Class feature tracking
   - Resource consumption interfaces

## 6. Advanced Combat Mechanics

### Implementation Plan

1. **Opportunity Attacks**
   - Implement reaction system
   - Add opportunity attack triggers

2. **Two-Weapon Fighting**
   - Add off-hand weapon tracking
   - Implement two-weapon fighting rules

3. **Grappling Mechanics**
   - Add grapple action
   - Implement grappled condition effects

## 7. Vision & Stealth Mechanics

### Data Models

#### Vision System Model
- Define vision types (normal, darkvision, blindsight, truesight)
- Include vision range properties

### Implementation Plan

1. **Vision Tracking**
   - Add vision types to characters
   - Implement visibility calculations

2. **Stealth System**
   - Add stealth action
   - Implement hiding mechanics

## 8. Magic Items & Equipment

### Implementation Plan

1. **Magic Item Properties**
   - Extend equipment data model with magical properties
   - Add magical effects system

2. **Attunement System**
   - Implement attunement tracking
   - Add attunement requirements

## Data Models & ORM Mapping

### Character Extensions
- Extend character data model with damage resistance properties
- Add spell preparation tracking
- Include rest history tracking
- Add magic item and attunement tracking

### Combat Extensions
- Extend combat participant model with damage resistances
- Add vision system properties
- Include stealth tracking mechanisms

## Business Logic Layer

### Combat Damage Calculation Service
- Service for calculating damage with resistance adjustments
- Critical hit processing
- Damage modifier application

### Spell Preparation Service
- Validation of spell preparation requirements
- Class restriction checking
- Component requirement verification

### Rest Management Service
- Hit dice recovery processing
- Spell slot restoration
- Class feature reset management

## API Endpoints Reference

### Combat Endpoints
- POST /api/combat/attack (Process attack actions)
- POST /api/combat/damage (Apply damage calculations)
- POST /api/combat/rest (Process rest actions)

### Character Endpoints
- PUT /api/character/spell-preparation (Update spell preparation)
- PUT /api/character/rest (Process character rest)

## Middleware & Interceptors

### Damage Calculation Middleware
- Intercept damage application requests
- Apply resistance calculations
- Handle critical hits processing

### Spell Validation Middleware
- Validate spell components before casting
- Check preparation status
- Verify casting requirements

## Testing

### Unit Tests

1. **Damage Calculation Tests**
   - Test resistance calculations
   - Test critical hit damage processing
   - Test vulnerability/damage interactions

2. **Spell Preparation Tests**
   - Test preparation limits
   - Test component requirements
   - Test class restrictions

3. **Rest Mechanics Tests**
   - Test hit dice recovery
   - Test spell slot recovery
   - Test feature reset mechanisms

### Integration Tests

1. **Combat Flow Tests**
   - Test attack resolution workflows
   - Test damage application processes
   - Test condition application

2. **Character Management Tests**
   - Test spell preparation workflow
   - Test rest processing
   - Test feature usage tracking

## Implementation Roadmap

### Phase 1: Core Combat Mechanics (Weeks 1-2)
- Damage types and resistances
- Attack roll automation
- Critical hit system

### Phase 2: Spell System Enhancement (Weeks 3-4)
- Spell components
- Spell preparation
- Ritual casting

### Phase 3: Resource Management (Weeks 5-6)
- Rest mechanics
- Hit dice system
- Class feature tracking

### Phase 4: Advanced Features (Weeks 7-8)
- Vision and stealth
- Opportunity attacks
- Two-weapon fighting

### Phase 5: Magic Items (Weeks 9-10)
- Magic item properties
- Attunement system
- Cursed items

## Conclusion

This implementation plan addresses the core missing mechanics that are essential for a complete D&D 5E experience. The modular approach allows for incremental implementation while maintaining system integrity. Each feature builds upon existing systems and follows established architectural patterns.