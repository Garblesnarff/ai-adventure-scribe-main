# Phase 6: Type Information and Segmentation

Add explicit type annotations and segment code with clear comments.

---

## **Goals**

- Improve type safety and clarity
- Help LLMs and humans understand data structures
- Make code easier to navigate and maintain

---

## **Steps**

### 1. Add Explicit Types

- For **all function parameters and return values**
- For **complex objects and arrays**
- For **React props and state**
- Prefer **interfaces** or **type aliases** for object shapes

### 2. Use JSDoc or Inline Comments

- Describe **object structures** and **expected values**
- Clarify **optional** vs **required** fields
- Add **examples** where helpful

### 3. Segment Code with Comments

- Use clear comment headers to mark:
  - **Constants and configuration**
  - **State definitions**
  - **Lifecycle hooks**
  - **Event handlers**
  - **Helper functions**
  - **Main logic**

### 4. Verify

- Run the type checker (`tsc`) to catch issues
- Ensure all exported functions and components have explicit types

---

## **Example**

```typescript
// ====================================
// Types and Interfaces
// ====================================

interface Player {
  id: string;
  name: string;
  health: number;
  inventory: Item[];
}

// ====================================
// Constants
// ====================================

const MAX_HEALTH = 100;

// ====================================
// Main Functionality
// ====================================

/**
 * Heals a player by a certain amount.
 * @param {Player} player - The player object
 * @param {number} amount - Amount to heal
 * @returns {Player} Updated player object
 */
function healPlayer(player: Player, amount: number): Player {
  // ...
}
```

---

## **Outcome**

A codebase with **clear, explicit types** and **well-segmented code**, improving safety, readability, and LLM compatibility.
