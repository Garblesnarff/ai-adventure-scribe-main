# Memory Processing Utilities

## Purpose

This directory contains utility functions that support the memory system, particularly focusing on the processing, classification, and scoring of memory content. These utilities are used by memory management hooks (e.g., `useMemoryCreation`) and AI services that need to understand or rank memories.

## Structure and Important Files

- **`classification.ts`**: Contains the core logic for classifying a piece of text content into a specific `MemoryType` (e.g., location, character, event, item, plot, general). This likely involves using patterns and scoring mechanisms.
    - Key function: `classifySegment()`, `processContent()`.
- **`importance.ts`**: Provides functions to calculate an "importance" score for a memory segment. This score helps in prioritizing memories, for example, when selecting relevant memories for an AI prompt or displaying important events to the user.
    - Key function: `calculateImportance()`.
- **`patterns.ts`**: Defines the keywords, regular expressions, and contextual patterns used by `classification.ts` to determine the type of a memory. It likely exports a structure like `CLASSIFICATION_PATTERNS`.
- **`segmentation.ts`**: Contains functions to split larger blocks of text (e.g., player input, AI narrative) into smaller, manageable segments that can then be individually classified and stored as memories.
    - Key function: `splitIntoSegments()`.

## How Components Interact

- These utilities are primarily used by:
    - **`useMemoryCreation.ts`** (from `src/hooks/memory/`):
        - Uses `segmentation.ts` to break down raw content.
        - Uses `classification.ts` to determine the type for each segment.
        - Uses `importance.ts` to assign an importance score to each segment.
        - The resulting structured memory (content, type, importance) is then saved to the database.
    - **AI Agents/Services** (e.g., `dm-agent-execute` or related memory selection logic): Might use these utilities if they need to re-classify or re-evaluate memories, although often they rely on the pre-processed data from the database.
    - **`memorySelection.ts`** (from `src/utils/`): This utility, which selects relevant memories, might use the output of these processing utilities (like importance scores and types) as criteria for selection.

## Usage Example

```typescript
// Conceptual example, often encapsulated within useMemoryCreation.ts:

import { processContent } from '@/utils/memory/classification'; // processContent uses all others internally
// import { splitIntoSegments } from '@/utils/memory/segmentation';
// import { classifySegment } from '@/utils/memory/classification';
// import { calculateImportance } from '@/utils/memory/importance';

const rawPlayerInput = "The player enters the old tavern and asks the bartender about the hidden treasure map.";

// The processContent function would internally use segmentation, classification, and importance.
const memorySegments = processContent(rawPlayerInput);
// memorySegments would be an array like:
// [
//   { content: "The player enters the old tavern", type: "location", importance: 7 },
//   { content: "asks the bartender about the hidden treasure map", type: "plot", importance: 8 }
// ] (simplified example)

// These segments would then be passed to a function to save them as distinct memories.
// memorySegments.forEach(segment => createMemoryInDatabase(segment));
```

## Notes

- This directory is fundamental to creating a structured and meaningful memory system.
- The quality of classification and importance scoring directly impacts the AI's ability to recall relevant information and maintain narrative consistency.
- `patterns.ts` is a key configuration file that determines how memories are typed.
- See `src/hooks/memory/useMemoryCreation.ts`, `src/utils/memoryClassification.ts` (which might re-export some of these), and `src/utils/memorySelection.ts`.
- The main `/src/utils/README.md` provides an overview of all utilities.
