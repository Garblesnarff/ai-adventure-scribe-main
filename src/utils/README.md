# Utility Functions

This directory contains **utility modules** providing reusable functions for validation, data transformation, dice rolling, and other common operations in the AI Dungeon Master app.

---

## **Purpose**

Centralize **reusable, stateless helper functions** to:

- Validate user input and data
- Transform character and campaign data
- Handle dice roll logic
- Manage memory classification and selection
- Support context and state management

---

## **Important Files**

- **`abilityScoreUtils.ts`**  
  Functions for calculating and validating character ability scores.

- **`characterTransformations.ts`**  
  Functions to transform character data structures.

- **`diceRolls.ts`**  
  Dice rolling logic, including randomization and modifiers.

- **`edgeFunctionHandler.ts`**  
  Helper for calling Supabase Edge Functions.

- **`memoryClassification.ts`**  
  Classifies memories by importance or type.

- **`memorySelection.ts`**  
  Selects relevant memories for context or AI input.

- **`validation.ts`**  
  General input validation utilities.

- **`context/`**  
  Utilities for managing React context defaults, enhancement, and validation.

- **`memory/`**  
  Utilities for memory processing, importance scoring, and segmentation.

---

## **How Utilities Are Used**

- Imported by **hooks**, **components**, and **agents** to perform common logic.
- Used in **form validation**, **game logic**, **AI input preparation**, and **data transformation**.
- Designed to be **pure functions** with no side effects.

---

## **Usage Example**

```typescript
import { rollDice } from '@/utils/diceRolls';

const result = rollDice('2d6+3');
console.log(`You rolled: ${result}`);
```

---

## **Notes**

- Follow the coding standards for naming, documentation, and modularity.
- Keep utility functions **pure and stateless**.
- Add JSDoc comments for all exported functions.
