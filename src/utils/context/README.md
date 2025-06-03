# Context Utilities

## Purpose

This directory provides utility functions and helpers specifically designed to support the management and operation of React Contexts used throughout the application (e.g., `CampaignContext`, `CharacterContext`, `MemoryContext`). These utilities might help with creating default context states, validating context data, or building combined game contexts.

## Structure and Important Files

- **`campaignContext.ts`**: Contains utility functions specifically for `CampaignContext`. This could include functions to format campaign data, merge updates, or validate campaign structures.
- **`characterContext.ts`**: Similar to `campaignContext.ts`, but for `CharacterContext`. It might help with character data transformations or validation specific to the context's needs.
- **`memoryContext.ts`**: Utilities for `MemoryContext`, potentially for formatting memories for display or other context-specific memory operations.
- **`contextDefaults.ts`**: Likely defines default or initial state values for various React Contexts. This helps in providing a consistent starting point when a context is initialized.
- **`contextEnhancement.ts`**: May contain functions to enhance or augment context data, perhaps by combining it with other data sources or deriving computed values.
- **`contextValidation.ts`**: Provides functions to validate the data stored within contexts, ensuring integrity before it's used by components or other services.
- **`gameContextBuilder.ts`**: A utility that likely constructs a comprehensive "game context" object by aggregating data from multiple sources, including various individual contexts (Campaign, Character, Memory, etc.). This built context might be used by AI agents or game logic modules.
- **`index.ts`**: Typically re-exports the key functions or modules from this directory for easier importing elsewhere.

## How Components Interact

- These utilities are not React components themselves but are used by:
    - **Context Providers**: To initialize their state (using `contextDefaults.ts`) or manage updates.
    - **Custom Hooks**: Hooks that interact with contexts might use these utilities to process or validate context data.
    - **AI Agents/Services**: `gameContextBuilder.ts` is particularly relevant for AI agents (like `dm-agent-execute`) which need a snapshot of the overall game state.
    - **Components**: Components consuming context might use validation or formatting utilities before displaying data.

## Usage Example

```typescript
// Conceptual example of using a context utility:
// Within a CampaignContext provider or a related hook

import { validateCampaignData } from '@/utils/context/contextValidation'; // Assuming this function exists
import { DEFAULT_CAMPAIGN_STATE } from '@/utils/context/contextDefaults'; // Assuming this exists

function useMyCampaignContextLogic(initialData) {
  let currentCampaignData = initialData || DEFAULT_CAMPAIGN_STATE;

  function updateCampaign(newData) {
    // const { isValid, errors } = validateCampaignData(newData);
    // if (!isValid) {
    //   console.error("Invalid campaign data:", errors);
    //   return;
    // }
    // currentCampaignData = { ...currentCampaignData, ...newData };
    // Further context update logic...
  }
  // ...
}

// Using gameContextBuilder
// import { buildGameContext } from '@/utils/context/gameContextBuilder';
// const character = /* get from CharacterContext */;
// const campaign = /* get from CampaignContext */;
// const memories = /* get from MemoryContext */;
// const fullGameContext = buildGameContext({ character, campaign, memories, currentTurn: 10 });
// use this fullGameContext for AI calls.
```

## Notes

- This directory plays a crucial role in maintaining organized and reliable state management through contexts.
- `gameContextBuilder.ts` is particularly important for providing a holistic view of the game state to backend services or AI agents.
- See the main `/src/utils/README.md` and the individual context files in `/src/contexts/`.
