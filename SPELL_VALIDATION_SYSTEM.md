# D&D 5E Spell Validation System

## Overview

This comprehensive spell validation system enforces D&D 5E rules for spell selection during character creation. It ensures 100% rule compliance by validating class spell lists, spell counts, racial bonuses, and spellcasting mechanics.

## Files Created/Modified

### Core Validation System
- **`src/utils/spell-validation.ts`** - Main validation logic and utilities
- **`src/utils/__tests__/spell-validation.test.ts`** - Comprehensive test suite

### Enhanced Data Structures
- **`src/types/character.ts`** - Updated Subrace interface with spell properties
- **`src/data/raceOptions.ts`** - Added racial spell data for High Elf, Drow, Forest Gnome, Tiefling

## Key Features

### 1. Class Spell List Enforcement
- Validates spells against class-specific spell lists
- Prevents selection of inappropriate spells (e.g., cleric spells for wizards)
- Works with existing `getClassSpells()` function and `classSpellMappings`

### 2. Accurate Spell Count Validation
- **Wizard**: 3 cantrips + 6 spells in spellbook
- **Cleric**: 3 cantrips + prepared spells (Wis mod + level, min 1)
- **Bard**: 2 cantrips + 4 known spells
- **Druid**: 2 cantrips + prepared spells (Wis mod + level, min 1)
- **Sorcerer**: 4 cantrips + 2 known spells
- **Warlock**: 2 cantrips + 2 known spells (Pact Magic)
- **Paladin/Ranger**: No spells at level 1

### 3. Known vs Prepared Spell Mechanics
- **Known Casters** (Bard, Sorcerer, Warlock): Fixed spell list
- **Prepared Casters** (Cleric, Druid): Prepare spells daily from full list
- **Spellbook Casters** (Wizard): Record spells, prepare subset daily

### 4. Racial Spell Integration
- **High Elf**: +1 wizard cantrip of choice
- **Drow**: Dancing Lights cantrip (+ higher level spells)
- **Forest Gnome**: Minor Illusion cantrip
- **Tiefling**: Thaumaturgy cantrip (+ higher level spells)
- Works for both spellcasters and non-spellcasters

### 5. Special Spellcasting Features
- **Ritual Casting**: Wizard, Cleric, Druid
- **Spellbook Mechanics**: Wizard spellbook system
- **Pact Magic**: Warlock short rest spell slot recovery
- **Domain Spells**: Framework for cleric domain bonuses

## API Reference

### Main Validation Function
```typescript
validateSpellSelection(
  character: Character,
  selectedCantrips: string[],
  selectedSpells: string[]
): SpellValidationResult
```

### Utility Functions
```typescript
// Get spellcasting info for a class
getSpellcastingInfo(characterClass: CharacterClass, level?: number): SpellcastingInfo | null

// Get racial bonus spells
getRacialSpells(race: string, subrace?: Subrace): RacialSpellsResult

// Check if spell is valid for class
isSpellValidForClass(spellId: string, characterClass: CharacterClass, isCantrip: boolean): boolean

// Get maximum spell counts
getMaxSpellCounts(characterClass: CharacterClass, level?: number): { cantrips: number, spells: number }

// Get validation rules for UI
getSpellValidationRules(characterClass: CharacterClass): string[]
```

### Error Types
- **INVALID_SPELL**: Spell not available to class
- **COUNT_MISMATCH**: Wrong number of spells selected
- **LEVEL_REQUIREMENT**: Class can't cast spells at this level
- **RACIAL_RESTRICTION**: Invalid racial spell selection

## Integration with Character Creation

The validation system integrates seamlessly with the existing character creation flow:

1. **Spell Selection Step**: Use `validateSpellSelection()` to check selections
2. **Real-time Validation**: Validate as user selects spells
3. **Error Display**: Show clear error messages with suggestions
4. **Rules Display**: Use `getSpellValidationRules()` for help text

## Test Coverage

The test suite covers:
-  All spellcasting classes and their rules
-  Non-spellcaster classes
-  Racial spell bonuses
-  Count validation (too few/too many spells)
-  Spell list validation (invalid spells for class)
-  Edge cases (no class, invalid selections)
-  Warning generation for special mechanics

## D&D 5E Rule Compliance

### Validated Rules
-  Class spell list restrictions
-  Cantrips known by class and level
-  Spells known vs prepared distinction
-  Spellcasting ability requirements
-  Ritual casting availability
-  Spellbook mechanics for Wizards
-  Pact Magic for Warlocks
-  Racial spell bonuses
-  Level requirements for spellcasting

### Future Enhancements
- Domain spells for Cleric subclasses
- Patron spells for Warlock subclasses
- Multiclass spellcasting rules
- Higher level spell progression
- Feat-based spell selection (Magic Initiate, etc.)

## Usage Examples

### Basic Validation
```typescript
const character = {
  class: wizardClass,
  race: elfRace,
  subrace: highElfSubrace,
  level: 1
};

const result = validateSpellSelection(
  character,
  ['fire-bolt', 'mage-hand', 'prestidigitation', 'light'], // 3 class + 1 High Elf
  ['magic-missile', 'shield', 'detect-magic', 'mage-armor', 'sleep', 'identify']
);

if (!result.valid) {
  console.log('Errors:', result.errors);
}
```

### Check Available Spells
```typescript
const { cantrips, spells } = getClassSpells('Wizard');
const isValid = isSpellValidForClass('fire-bolt', wizardClass, true);
```

### Get Rules for UI
```typescript
const rules = getSpellValidationRules(wizardClass);
// ["Must select exactly 3 cantrips.", "Must select exactly 6 spells known.", ...]
```

## Performance Considerations

- Validation runs in O(n) time where n is number of selected spells
- Uses efficient Set operations for spell list lookups
- Caches class spell mappings for fast access
- Minimal memory footprint with shared data structures

## Error Handling

The system provides detailed error messages:
- Specific spell IDs that are invalid
- Expected vs actual spell counts
- Clear descriptions of what went wrong
- Suggestions for valid alternatives

This creates a robust foundation for spell validation that ensures all character creation follows official D&D 5E rules while providing clear feedback to users.