# Spell Selection UI Components

This directory contains the enhanced spell selection UI components for D&D 5E character creation. These components provide an intuitive, accessible, and comprehensive interface for selecting spells during character creation.

## Components Overview

### SpellCard.tsx
Individual spell display component with comprehensive spell information.

**Features:**
- Clear spell identification with level and school
- Component indicators (V, S, M) with informative tooltips
- Visual indicators for concentration, ritual, and damage spells
- Interactive selection state with validation feedback
- School-based color coding for visual organization
- Mobile-responsive design with touch-friendly interactions
- Full accessibility support with ARIA labels

**Props:**
- `spell`: Spell object with all spell data
- `isSelected`: Current selection state
- `isDisabled`: Whether the spell can be selected
- `onToggle`: Callback for selection toggle
- `showLevel`: Whether to display spell level badge
- `className`: Additional CSS classes

### SpellSearchBar.tsx
Search input component for filtering spells.

**Features:**
- Real-time search functionality
- Clear search button
- Keyboard navigation support
- Accessible with proper ARIA labels
- Responsive design

**Props:**
- `value`: Current search term
- `onChange`: Search term change handler
- `placeholder`: Custom placeholder text
- `className`: Additional CSS classes

### SpellFilterPanel.tsx
Advanced filtering interface for spells.

**Features:**
- Multi-select school filtering with color-coded badges
- Component requirement filters (Verbal, Somatic, Material)
- Special property filters (Concentration, Ritual, Damage)
- Clear all filters functionality
- Active filter summary
- Collapsible design for mobile optimization

**Props:**
- `filters`: Current filter state object
- `onChange`: Filter change handler
- `availableSchools`: Array of spell schools to show
- `isOpen`: Whether the panel is expanded
- `className`: Additional CSS classes

### SpellCategorySection.tsx
Organized section for different spell categories (cantrips, spells, racial).

**Features:**
- Clear category identification with appropriate icons
- Progress tracking toward selection limits
- Spell list with integrated filtering
- Educational information about spell types
- Visual feedback for selection status and limits
- Empty state handling

**Props:**
- `title`: Section title
- `description`: Section description
- `spells`: Array of spells to display
- `selectedSpells`: Array of selected spell IDs
- `maxSpells`: Maximum selectable spells
- `onToggleSpell`: Spell selection handler
- `icon`: Icon type ('cantrip', 'spell', 'racial')
- `showProgress`: Whether to show progress bar
- `info`: Additional information text
- `className`: Additional CSS classes

## Custom Hook

### useSpellSelection.ts
Comprehensive hook for managing spell selection state and validation.

**Features:**
- Centralized spell selection state management
- Real-time validation with D&D 5E rules
- Search and filtering functionality
- Integration with character context
- Racial spell handling
- Validation feedback
- Auto-save functionality

**Returns:**
- Character and spellcasting information
- Available spells and racial spells
- Current selections and selection actions
- Search and filter state management
- Validation results and save functionality

## Enhanced SpellSelection Component

The main `SpellSelection.tsx` component has been completely redesigned with:

### Key Features:
1. **Tabbed Interface**: Separate tabs for cantrips, 1st level spells, and racial spells
2. **Advanced Search & Filtering**: Real-time search with school, component, and property filters
3. **Real-time Validation**: Integration with comprehensive spell validation system
4. **Visual Spell Indicators**: Color-coded schools, component icons, and special property badges
5. **Mobile-Responsive Design**: Optimized for all screen sizes with touch-friendly interactions
6. **Accessibility**: Full ARIA support, keyboard navigation, and screen reader compatibility
7. **Progressive Disclosure**: Collapsible filters and detailed tooltips for complex information

### Integration Requirements:
- Uses existing Shadcn UI components for consistency
- Integrates with `useCharacter` context for state management
- Connects to spell validation system from `src/utils/spell-validation.ts`
- Uses spell data from `src/data/spellOptions.ts`
- Maintains backward compatibility with existing character creation flow

### Validation Features:
- Real-time spell count validation
- Class spell list restrictions
- Racial spell integration
- Known vs prepared spell mechanics
- Spellbook mechanics for Wizards
- Clear error messages and helpful guidance

## Usage Example

```tsx
import { SpellSelection } from '@/components/character-creation/steps/SpellSelection';

// The component automatically integrates with the character creation flow
// No additional props required - it uses the character context
<SpellSelection />
```

## Design Principles

### Clarity and Guidance:
- Clear visual distinction between cantrips and leveled spells
- Color-coded spell schools for quick identification
- Progress indicators showing selection limits
- Helpful tooltips explaining D&D mechanics
- Educational content about spellcasting rules

### User Experience:
- Intuitive selection patterns with immediate feedback
- Logical grouping with efficient search and filtering
- Professional D&D aesthetic with modern UI patterns
- Error states that guide users toward valid selections
- Auto-save functionality to prevent data loss

### Performance:
- Efficient filtering algorithms for large spell lists
- Memoized components to prevent unnecessary re-renders
- Optimized for fast interaction and smooth scrolling
- Lazy loading of detailed spell information

## Accessibility Features

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Descriptive text for all visual elements
- **High Contrast**: Compatible with high contrast display modes
- **Focus Management**: Clear focus indicators and logical tab order
- **Touch Targets**: Appropriately sized for touch interaction

## Mobile Optimization

- **Responsive Design**: Adapts to all screen sizes
- **Touch-Friendly**: Large interaction targets for mobile devices
- **Collapsible Sections**: Efficient use of limited screen space
- **Swipe Navigation**: Natural gesture support for tab switching
- **Progressive Disclosure**: Complex information revealed as needed

This spell selection system provides a comprehensive, user-friendly interface that makes D&D 5E spell selection intuitive for both new and experienced players while maintaining strict adherence to the game's rules.