# D&D Spell System Sub-Agents

This directory contains specialized Claude Code sub-agents designed to help implement a comprehensive D&D 5E spell selection system.

## Overview

These sub-agents work together to fix the current spell selection issues where classes can select spells they shouldn't have access to according to official D&D 5E rules.

## Available Sub-Agents

### 1. `dnd-spell-researcher`
**Purpose**: Research and validate D&D 5E spell rules from official sources
- Researches complete spell lists from PHB/SRD
- Validates spell assignments to classes
- Documents spellcasting mechanics (known vs prepared)
- Identifies racial spell bonuses

### 2. `spell-data-builder`
**Purpose**: Generate TypeScript spell data structures
- Creates comprehensive spell interfaces
- Organizes spell data by class
- Builds filtering and validation functions
- Ensures proper typing throughout

### 3. `spell-validator`
**Purpose**: Enforce D&D 5E spell selection rules
- Validates class spell restrictions
- Checks spell count limits
- Handles racial and feat spell additions
- Tests edge cases and multiclassing

### 4. `react-spell-ui`
**Purpose**: Build intuitive spell selection interfaces
- Creates spell selection components
- Implements filtering and search
- Designs clear cantrip vs spell distinction
- Builds responsive, accessible UI

### 5. `spell-test-writer`
**Purpose**: Create comprehensive test coverage
- Writes unit tests for validation logic
- Creates component tests for UI
- Builds edge case test scenarios
- Ensures 100% rule compliance testing

## Usage Instructions

### For Fresh Claude Code Instance

When working on the spell selection system, use these agents in this recommended order:

```bash
# 1. Start with research to understand the rules
claude --use-agent dnd-spell-researcher "Research complete D&D 5E spell lists and spellcasting rules for all classes"

# 2. Build the data structures
claude --use-agent spell-data-builder "Create TypeScript spell data organized by class with proper validation"

# 3. Implement rule validation
claude --use-agent spell-validator "Add spell selection validation to prevent rule violations"

# 4. Update the UI components
claude --use-agent react-spell-ui "Redesign spell selection interface with better filtering and organization"

# 5. Create comprehensive tests
claude --use-agent spell-test-writer "Build test suite covering all spell selection scenarios"
```

### Parallel Usage

Some agents can work in parallel:

```bash
# Research and data building can happen simultaneously
claude --use-agent dnd-spell-researcher "Research wizard spell rules" &
claude --use-agent spell-data-builder "Create wizard spell TypeScript data"

# UI and testing can be developed in parallel after data is ready
claude --use-agent react-spell-ui "Update SpellSelection component" &
claude --use-agent spell-test-writer "Create SpellSelection tests"
```

## Key Files to Modify

- `src/data/spellOptions.ts` - Replace with comprehensive spell data
- `src/components/character-creation/steps/SpellSelection.tsx` - Major UI overhaul
- `src/data/classOptions.ts` - Verify spellcasting configurations
- `src/types/character.ts` - Enhance spell type definitions

## Success Criteria

After using these agents, the system should achieve:
- ✅ Zero classes can select inappropriate spells
- ✅ Complete D&D 5E spell lists for all classes
- ✅ Proper spell count validation
- ✅ Racial spell bonus integration
- ✅ Intuitive user interface
- ✅ Comprehensive test coverage

## Agent Coordination

These agents are designed to work together:
- **dnd-spell-researcher** provides the foundation rules knowledge
- **spell-data-builder** creates the technical implementation
- **spell-validator** ensures rule compliance
- **react-spell-ui** makes it user-friendly
- **spell-test-writer** validates everything works correctly

Each agent has specialized knowledge and tools optimized for their specific domain, ensuring comprehensive coverage of all aspects of the spell system implementation.