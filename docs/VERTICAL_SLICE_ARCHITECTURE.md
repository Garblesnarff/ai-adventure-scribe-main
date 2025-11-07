# Vertical Slice Architecture

## Overview

This document defines the vertical slice architecture for the AI Adventure Scribe platform, organizing code by feature rather than technical layer.

## Architecture Principles

### 1. Feature Independence

Each feature slice contains all layers needed for that feature:
- UI Components
- Business Logic (Zustand stores)
- Domain Logic (pure functions)
- API Integration (hooks, services)
- Types and Interfaces

### 2. Dependency Rules

```
┌─────────────────────────────────────┐
│          Features Layer             │
│  (Combat, Character, Campaign...)   │
│  ↓ can depend on                    │
├─────────────────────────────────────┤
│          Shared Layer               │
│  (UI components, utilities, types)  │
│  ↓ can depend on                    │
├─────────────────────────────────────┤
│         Infrastructure             │
│  (Supabase, tRPC, external APIs)   │
└─────────────────────────────────────┘
```

**Rules:**
- ✅ Features can depend on Shared
- ✅ Features can depend on Infrastructure
- ❌ Features CANNOT depend on other Features
- ❌ Shared CANNOT depend on Features
- ✅ Infrastructure is dependency-free (external libraries only)

### 3. Directory Structure

```
src/
├── features/              # Feature slices (business features)
│   ├── combat/
│   │   ├── components/   # Combat-specific UI components
│   │   ├── stores/       # Zustand stores for combat state
│   │   ├── domains/      # Pure business logic
│   │   ├── hooks/        # Combat-specific React hooks
│   │   ├── types/        # Combat-specific types
│   │   ├── utils/        # Combat-specific utilities
│   │   ├── api/          # tRPC/API integration
│   │   └── index.ts      # Public API exports
│   │
│   ├── character/
│   │   ├── components/   # Character creation, sheet, list
│   │   ├── stores/       # Character state management
│   │   ├── domains/      # Character business logic
│   │   ├── hooks/        # useCharacter, useCharacterCreation
│   │   ├── types/        # Character types
│   │   └── index.ts
│   │
│   ├── campaign/
│   │   ├── components/   # Campaign creation, view, list
│   │   ├── stores/       # Campaign state
│   │   ├── domains/      # Campaign business logic
│   │   ├── hooks/        # useCampaign hooks
│   │   └── index.ts
│   │
│   ├── game-session/
│   │   ├── components/   # Chat, voice, audio
│   │   ├── stores/       # Session state
│   │   ├── hooks/        # useGameSession
│   │   └── index.ts
│   │
│   ├── spellcasting/
│   │   ├── components/   # Spell selection, preparation
│   │   ├── stores/       # Spell state
│   │   ├── domains/      # Spell validation logic
│   │   └── index.ts
│   │
│   └── dm-agent/         # DM agent (LangGraph)
│       ├── nodes/        # Graph nodes
│       ├── services/     # DMService
│       ├── persistence/  # Checkpointing
│       └── index.ts
│
├── shared/               # Cross-cutting concerns
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── layout/      # Layout components
│   │   ├── error/       # Error boundaries
│   │   └── skeletons/   # Loading states
│   │
│   ├── hooks/           # Generic React hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useAsync.ts
│   │
│   ├── utils/           # Generic utilities
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── array-helpers.ts
│   │
│   ├── types/           # Shared types
│   │   ├── common.ts
│   │   ├── api.ts
│   │   └── database.ts
│   │
│   └── constants/       # Shared constants
│       ├── game-rules.ts
│       └── config.ts
│
├── infrastructure/      # External integrations
│   ├── supabase/       # Supabase client
│   ├── trpc/           # tRPC client setup
│   ├── ai/             # AI service clients
│   ├── storage/        # LocalStorage, IndexedDB
│   └── routing/        # React Router setup
│
├── data/               # Static data
│   ├── spells/         # D&D spell data
│   ├── srd/            # SRD reference data
│   └── equipment/      # Equipment data
│
└── pages/              # Route components (thin wrappers)
    ├── CampaignPage.tsx
    ├── CharacterPage.tsx
    └── GameSessionPage.tsx
```

## Feature Slice Template

Each feature follows this structure:

```typescript
// src/features/{feature-name}/index.ts
// Public API - only export what other features need

// Components
export { FeatureComponent } from './components/FeatureComponent';

// Hooks
export { useFeature } from './hooks/useFeature';

// Types
export type { FeatureState, FeatureAction } from './types';

// Store (if needed by other features)
export { useFeatureStore } from './stores/featureStore';
```

### Internal Organization

```
features/feature-name/
├── components/           # UI components
│   ├── FeatureMain.tsx
│   ├── FeatureForm.tsx
│   ├── FeatureList.tsx
│   └── __tests__/
│
├── stores/              # Zustand stores
│   ├── featureStore.ts
│   └── __tests__/
│
├── domains/             # Pure business logic
│   ├── calculations.ts
│   ├── validators.ts
│   └── __tests__/
│
├── hooks/               # Feature-specific hooks
│   ├── useFeature.ts
│   ├── useFeatureQuery.ts
│   └── __tests__/
│
├── api/                 # API integration
│   ├── queries.ts       # TanStack Query hooks
│   └── mutations.ts
│
├── types/               # Feature types
│   ├── state.ts
│   ├── actions.ts
│   └── models.ts
│
├── utils/               # Feature utilities
│   └── helpers.ts
│
└── index.ts            # Public API
```

## Import Rules (Enforced by ESLint)

### ✅ Allowed Imports

**From Features:**
```typescript
// Feature can import from shared
import { Button } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

// Feature can import from infrastructure
import { supabase } from '@/infrastructure/supabase';
import { trpc } from '@/infrastructure/trpc';

// Feature can import static data
import { spellData } from '@/data/spells';
```

**From Shared:**
```typescript
// Shared can import from infrastructure
import { supabase } from '@/infrastructure/supabase';

// Shared can import from data
import { GAME_CONSTANTS } from '@/data/constants';
```

### ❌ Forbidden Imports

```typescript
// ❌ Feature CANNOT import from other features
import { useCombat } from '@/features/combat';  // FORBIDDEN

// ❌ Shared CANNOT import from features
import { CharacterSheet } from '@/features/character';  // FORBIDDEN

// ❌ Infrastructure CANNOT import from features or shared
import { Button } from '@/shared/components/ui';  // FORBIDDEN
```

## ESLint Configuration

Add to `eslint.config.js`:

```javascript
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['../features/*', '../../features/*'],
          message: 'Features cannot import from other features. Use shared layer instead.'
        },
        {
          group: ['@/features/*'],
          message: 'Do not import features directly. Import from shared or use composition.'
        }
      ]
    }]
  },
  overrides: [
    {
      // Shared layer restrictions
      files: ['src/shared/**/*'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@/features/*', '../features/*'],
              message: 'Shared layer cannot depend on features.'
            }
          ]
        }]
      }
    },
    {
      // Infrastructure restrictions
      files: ['src/infrastructure/**/*'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@/features/*', '@/shared/*'],
              message: 'Infrastructure cannot depend on features or shared.'
            }
          ]
        }]
      }
    }
  ]
}
```

## Migration Strategy

### Phase 1: Create Structure (Done in Phase 8)
1. ✅ Create feature directories
2. ✅ Move existing code to appropriate slices
3. ✅ Update imports
4. ✅ Verify build

### Phase 2: Enforce Boundaries
1. ✅ Add ESLint rules
2. ✅ Run lint and fix violations
3. ✅ Document patterns
4. ✅ Add to CI/CD

### Phase 3: Refine
1. Extract shared utilities
2. Eliminate circular dependencies
3. Optimize public APIs
4. Add feature documentation

## Feature Slice Examples

### Combat Feature

```typescript
// src/features/combat/index.ts
export { CombatInterface } from './components/CombatInterface';
export { InitiativeTracker } from './components/InitiativeTracker';
export { useCombatStore } from './stores/combatStore';
export type { CombatState, CombatParticipant } from './types';

// src/features/combat/components/CombatInterface.tsx
import { Button } from '@/shared/components/ui';  // ✅ Allowed
import { useCombatStore } from '../stores/combatStore';  // ✅ Internal

export function CombatInterface() {
  const { startCombat } = useCombatStore();
  // ...
}
```

### Character Feature

```typescript
// src/features/character/index.ts
export { CharacterSheet } from './components/CharacterSheet';
export { CharacterCreationWizard } from './components/CharacterCreationWizard';
export { useCharacter } from './hooks/useCharacter';
export type { Character, CharacterState } from './types';

// src/features/character/hooks/useCharacter.ts
import { trpc } from '@/infrastructure/trpc';  // ✅ Allowed
import type { Character } from '../types';  // ✅ Internal

export function useCharacter(characterId: string) {
  return trpc.characters.getById.useQuery({ id: characterId });
}
```

## Page Composition

Pages become thin wrappers that compose features:

```typescript
// src/pages/GameSessionPage.tsx
import { GameChat } from '@/features/game-session';
import { CombatInterface } from '@/features/combat';
import { CharacterSheet } from '@/features/character';

export function GameSessionPage() {
  return (
    <div className="game-session">
      <CharacterSheet />
      <GameChat />
      <CombatInterface />
    </div>
  );
}
```

## Benefits

### 1. Maintainability
- Clear boundaries between features
- Easy to locate code
- Changes isolated to feature slice

### 2. Scalability
- Add new features without affecting existing ones
- Team members can work on different features independently
- Easier to understand codebase structure

### 3. Testability
- Features are self-contained
- Easy to test in isolation
- Mock dependencies at feature boundary

### 4. Reusability
- Shared components explicitly defined
- Features can be extracted as packages
- Clear public API for each feature

## Anti-Patterns to Avoid

### ❌ Feature-to-Feature Dependencies

```typescript
// ❌ BAD: Direct feature dependency
import { useCombat } from '@/features/combat';

function CharacterSheet() {
  const combat = useCombat();  // Creates tight coupling
}
```

**Solution:** Use composition or events:
```typescript
// ✅ GOOD: Composition at page level
<Page>
  <CharacterSheet />
  <CombatInterface />
</Page>
```

### ❌ Shared Importing Features

```typescript
// ❌ BAD: Shared depends on feature
// src/shared/hooks/useGameState.ts
import { useCombat } from '@/features/combat';
```

**Solution:** Move to feature or use inversion of control:
```typescript
// ✅ GOOD: Feature provides its own hook
// src/features/combat/hooks/useCombatGameState.ts
```

### ❌ God Components

```typescript
// ❌ BAD: Component knows about everything
function GamePage() {
  const combat = useCombat();
  const character = useCharacter();
  const campaign = useCampaign();
  // 500 lines of logic mixing all features
}
```

**Solution:** Separate components per feature:
```typescript
// ✅ GOOD: Feature components
<GamePage>
  <CombatSection />
  <CharacterSection />
  <CampaignSection />
</GamePage>
```

## FAQ

**Q: Where do I put code that's used by multiple features?**
A: In the `shared/` directory. If only 2 features need it, consider if those features should be merged or if you need an abstraction.

**Q: Can features communicate?**
A: Yes, through:
1. Props (parent component passes data)
2. Global state (Zustand stores in shared)
3. Events (custom events, event bus)
4. URL state (React Router)

**Q: What about code that doesn't fit a feature?**
A: Use these layers:
- `shared/` - Generic, reusable code
- `infrastructure/` - External integrations
- `data/` - Static data
- `utils/` - Pure utility functions

**Q: How do I refactor existing code?**
A: Incrementally:
1. Create new feature directory
2. Move related files
3. Update imports
4. Fix any violations
5. Repeat for next feature

---

**Last Updated:** Phase 8 - Vertical Slice Architecture
**Status:** In Progress
