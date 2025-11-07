# Character Creation Components

## Purpose

This directory contains all React components, logic, and associated types for the multi-step character creation wizard. It enables users to define their player characters for D&D campaigns, including attributes, race, class, background, equipment, and more.

## Structure and Important Files

- **`character-wizard.tsx`**: The main container component that orchestrates the character creation process. It manages the overall state of the character being built and the current step in the wizard.
- **`shared/`**: UI components that are reused across various steps of the character creation wizard.
    - **`ProgressIndicator.tsx`**: Displays the user's current progress through the character creation steps.
    - **`StepNavigation.tsx`**: Provides "Next" and "Previous" buttons for navigating between steps.
- **`steps/`**: Individual components, each representing a distinct step in the character creation process.
    - **`BasicInfo.tsx`**: For setting the character's name and optional personality notes.
    - **`RaceSelection.tsx`**: For choosing the character's race.
    - **`ClassSelection.tsx`**: For choosing the character's class.
    - **`AbilityScoresSelection.tsx`** (and its subfolder `ability-scores/`): For determining the character's ability scores (e.g., using point buy, standard array, or rolling).
        - `ability-scores/AbilityScoreCard.tsx`: Displays a single ability score.
    - **`BackgroundSelection.tsx`**: For selecting the character's background.
    - **`EquipmentSelection.tsx`**: For choosing starting equipment.
    - **`CharacterFinalization.tsx`**: Final step for reviewing character choices, generating AI description and portrait.
    - *(Other steps, if any, would follow this pattern).*
- **`wizard/`**: Core logic, types, and hooks specifically for the character wizard functionality.
    - **`WizardContent.tsx`**: Responsible for rendering the content of the currently active step.
    - **`constants.ts`**: Defines constants relevant to character creation (e.g., step definitions, point buy limits).
    - **`types.ts`**: TypeScript type definitions for character creation state, props, and intermediate data structures.
    - *(Potentially hooks like `useCharacterSave.ts` or validation logic if not shared from a higher level context like `CharacterContext`)*.

## How Components Interact

- `character-wizard.tsx` acts as the central controller. It maintains the character object being built and the active step.
- Based on the active step, `character-wizard.tsx` renders the appropriate component from the `steps/` directory.
- User interactions within a step component (e.g., selecting a race) update the character state managed by `character-wizard.tsx` (often via callbacks or a shared context like `CharacterContext`).
- `StepNavigation.tsx` components trigger transitions between steps, managed by `character-wizard.tsx`.
- `ProgressIndicator.tsx` reflects the current stage in the wizard.
- Data is progressively built up, and upon completion, `character-wizard.tsx` would typically trigger a save operation (e.g., using a hook like `useCharacterSave` from `CharacterContext` or a similar wizard-specific hook).

## Usage Example

The `character-wizard.tsx` component is usually rendered on a dedicated character creation page.

```typescript
// Example conceptual usage within a page component:
// src/pages/CreateCharacterPage.tsx

import { CharacterWizard } from '@/components/character-creation/character-wizard';

const CreateCharacterPage = () => {
  return (
    <div>
      <h1>Forge Your Hero</h1>
      <CharacterWizard />
    </div>
  );
};

export default CreateCharacterPage;
```

## Notes

- This module is a critical part of the player experience, allowing for detailed character customization.
- State management for the character object as it's being built is key. This might involve React Context (`CharacterContext`), local state in `character-wizard.tsx`, or a state management library.
- Validation of choices at each step is important.
- See the main `/src/components/README.md` for the overall component architecture.
