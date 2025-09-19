# D&D 5E Spell Selection Test Suite

This directory contains a comprehensive test suite for the D&D 5E spell selection system, ensuring 100% rule compliance and system reliability.

## Test Files Overview

### 1. Data Integrity Tests
**File**: `src/utils/__tests__/spell-data.test.ts`

Tests the core spell data for:
- ✅ Required properties validation
- ✅ Unique spell IDs
- ✅ Valid spell levels (cantrips = 0, spells = 1-9)
- ✅ D&D 5E school names compliance
- ✅ Component breakdown consistency (V, S, M)
- ✅ Valid casting times, ranges, and durations
- ✅ Concentration and ritual spell marking
- ✅ Damage value formats
- ✅ Material component costs
- ✅ Description quality checks
- ✅ Performance validation
- ✅ School distribution balance

### 2. Spell Validation Logic Tests
**File**: `src/utils/__tests__/spell-validation.test.ts`

Tests the validation engine for:
- ✅ Class spellcasting information retrieval
- ✅ Racial spell bonuses (High Elf, Tiefling, etc.)
- ✅ Spell count limits enforcement
- ✅ Known vs prepared spell mechanics
- ✅ Invalid spell rejection
- ✅ Multiclass scenarios
- ✅ Non-spellcaster validation
- ✅ Edge case handling
- ✅ Helpful warning generation
- ✅ Utility function correctness

### 3. Component Tests
**File**: `src/components/spells/__tests__/SpellCard.test.tsx`

Tests the UI components for:
- ✅ Spell information rendering
- ✅ Selection state management
- ✅ Disabled state behavior
- ✅ Component indicators (V, S, M)
- ✅ Tooltip interactions
- ✅ Special property badges (concentration, ritual, damage)
- ✅ School color coding
- ✅ Accessibility features
- ✅ Keyboard navigation
- ✅ Custom styling application
- ✅ Edge case rendering

### 4. Hook Tests
**File**: `src/hooks/__tests__/useSpellSelection.test.ts`

Tests the React hook for:
- ✅ State management
- ✅ Character integration
- ✅ Spell filtering and searching
- ✅ Selection limits enforcement
- ✅ Validation integration
- ✅ Character updates
- ✅ Non-spellcaster handling
- ✅ Racial spell integration
- ✅ Filter combinations
- ✅ Edge case handling

### 5. Integration Tests
**File**: `src/__tests__/integration/spell-selection-flow.test.tsx`

Tests the complete flow for:
- ✅ End-to-end spell selection
- ✅ Search and filtering integration
- ✅ Validation feedback
- ✅ Character creation wizard integration
- ✅ Error state handling
- ✅ User interaction flows
- ✅ Spell property display
- ✅ Selection limits in UI
- ✅ Real-world scenarios

### 6. Performance Tests
**File**: `src/__tests__/performance/spell-performance.test.ts`

Tests system performance for:
- ✅ Validation speed with large datasets
- ✅ Memory usage optimization
- ✅ Algorithm complexity verification
- ✅ Concurrent operation handling
- ✅ Data structure efficiency
- ✅ Edge case performance
- ✅ Regression prevention
- ✅ Baseline performance maintenance

### 7. Test Helpers
**File**: `src/__tests__/helpers/spell-test-helpers.ts`

Provides reusable utilities:
- ✅ Mock character classes (Wizard, Cleric, Fighter, etc.)
- ✅ Mock races and subraces
- ✅ Mock spell data
- ✅ Character creation helpers
- ✅ Validation helpers
- ✅ Performance test data generators
- ✅ Error test cases

## Test Coverage

### D&D 5E Rules Validated
- **Spell Schools**: All 8 D&D schools (Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation)
- **Spellcasting Classes**: Wizard, Cleric, Bard, Sorcerer, Warlock, Paladin, Ranger
- **Non-Spellcasters**: Fighter, Barbarian, Rogue, Monk
- **Racial Spells**: High Elf, Drow, Tiefling, Forest Gnome
- **Spell Types**: Cantrips, 1st level spells, ritual spells, concentration spells
- **Components**: Verbal (V), Somatic (S), Material (M) with costs and consumption
- **Spell Mechanics**: Known vs prepared, spellbooks, pact magic, ritual casting

### Edge Cases Covered
- ✅ Null/undefined character handling
- ✅ Missing class or race data
- ✅ Malformed spell data
- ✅ Empty selections
- ✅ Exceeding selection limits
- ✅ Invalid spell choices
- ✅ Very long spell names/descriptions
- ✅ Performance with large datasets (5000+ spells)
- ✅ Concurrent operations
- ✅ Memory leak prevention

### Performance Benchmarks
- **Single Validation**: < 10ms
- **Batch Validation (100 characters)**: < 100ms
- **Large Dataset Processing (1000 spells)**: < 50ms
- **Complex Filtering**: < 25ms
- **Memory Usage**: < 10MB for 5000 spells
- **Concurrent Operations**: 50 simultaneous validations < 200ms

## Running Tests

### All Tests
```bash
npx vitest run
```

### Specific Test Suites
```bash
# Data integrity
npx vitest run src/utils/__tests__/spell-data.test.ts

# Validation logic
npx vitest run src/utils/__tests__/spell-validation.test.ts

# Component tests
npx vitest run src/components/spells/__tests__/SpellCard.test.tsx

# Hook tests
npx vitest run src/hooks/__tests__/useSpellSelection.test.ts

# Integration tests
npx vitest run src/__tests__/integration/spell-selection-flow.test.tsx

# Performance tests
npx vitest run src/__tests__/performance/spell-performance.test.ts
```

### Watch Mode (Development)
```bash
npx vitest watch
```

### Coverage Report
```bash
npx vitest run --coverage
```

## Test Philosophy

### Rule Compliance First
Every test ensures 100% compliance with D&D 5E rules. The system prevents invalid character builds and enforces proper spell selection according to official rules.

### Comprehensive Edge Cases
Tests cover not just happy paths but also every conceivable edge case, error condition, and boundary scenario.

### Performance Assurance
Performance tests ensure the system remains responsive even with large spell datasets and concurrent usage.

### User Experience Validation
Integration tests verify that the complete user experience works smoothly from spell search to character finalization.

### Accessibility Compliance
Component tests ensure the interface is fully accessible with proper ARIA labels, keyboard navigation, and screen reader support.

## Mock Data Structure

The test suite uses comprehensive mock data that mirrors real D&D 5E content:

### Classes Tested
- **Full Casters**: Wizard (spellbook), Cleric (prepared), Bard (known), Sorcerer (known), Warlock (pact magic)
- **Half Casters**: Paladin, Ranger (no spells at level 1)
- **Non-Casters**: Fighter

### Racial Features Tested
- **High Elf**: Bonus wizard cantrip
- **Drow**: Dancing Lights + leveled spells
- **Tiefling**: Thaumaturgy + leveled spells
- **Forest Gnome**: Minor Illusion

### Spell Properties Tested
- **Components**: Verbal, Somatic, Material (with costs)
- **Duration**: Instantaneous, concentration, timed
- **Range**: Touch, self, distance, area effects
- **Special**: Ritual, concentration, damage dealing
- **Schools**: All 8 D&D schools represented

## Success Criteria

✅ **100% D&D 5E Rule Compliance**: All spell selection rules properly enforced
✅ **Comprehensive Coverage**: Every component, hook, and utility function tested
✅ **Edge Case Handling**: All error conditions and boundary cases covered
✅ **Performance Requirements**: All benchmarks met
✅ **Accessibility Standards**: Full WCAG compliance verified
✅ **Integration Validation**: Complete user flows tested end-to-end
✅ **Memory Efficiency**: No memory leaks or excessive usage
✅ **Concurrency Safety**: Multiple simultaneous operations supported

## Continuous Integration

This test suite is designed to run in CI/CD pipelines and provides:
- Fast execution (< 5 minutes for full suite)
- Clear failure reporting
- Performance regression detection
- Coverage threshold enforcement
- Accessibility validation
- Cross-browser compatibility verification

The tests serve as both validation and documentation, ensuring the spell selection system maintains 100% D&D 5E compliance while providing an excellent user experience.