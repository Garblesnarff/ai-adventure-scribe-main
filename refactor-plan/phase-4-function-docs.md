# Phase 4: Function Documentation

Add detailed JSDoc-style comments to all functions and class methods.

---

## **Goals**

- Make function behavior explicit
- Improve LLM understanding and code navigation
- Clarify parameters, return values, and side effects

---

## **Steps**

1. For **every function and class method**:
   - Add a JSDoc comment block with:
     - **Description** of what it does
     - **Parameters** with types and descriptions
     - **Return value** with type and description
     - **Side effects** (e.g., state changes, network calls)
     - **Example usage** (for complex functions)

---

## **Example**

```typescript
/**
 * Calculates the player's attack damage based on stats and weapon.
 * 
 * @param {number} strength - Player's strength stat
 * @param {number} weaponDamage - Base weapon damage
 * @param {boolean} isCritical - Whether the attack is a critical hit
 * @returns {number} Total damage dealt
 * 
 * @example
 * const dmg = calculateDamage(10, 5, true);
 * console.log(dmg); // 30
 */
function calculateDamage(strength, weaponDamage, isCritical) {
  // ...
}
```

---

## **Tips**

- Be concise but clear.
- Use **`@param`** and **`@returns`** tags consistently.
- For async functions, note if they throw or reject.
- For React components, describe props and output.

---

## **Outcome**

A codebase with **well-documented functions**, improving maintainability and AI assistance.
