# Static Data

This directory contains **static data files** used throughout the AI Dungeon Master app, including character options, backgrounds, classes, equipment, and races.

---

## **Purpose**

Provide **predefined data sets** to populate:

- Character creation forms
- Campaign setup options
- Game logic defaults

---

## **Important Files**

- **`backgroundOptions.ts`**  
  List of character backgrounds (e.g., noble, soldier, outlander).

- **`characterOptions.ts`**  
  General character options and metadata.

- **`classOptions.ts`**  
  List of character classes (e.g., wizard, fighter, rogue).

- **`equipmentOptions.ts`**  
  List of starting equipment and gear.

- **`raceOptions.ts`**  
  List of playable races (e.g., elf, dwarf, human).

---

## **How Data Is Used**

- Imported by **character creation components** and **hooks**.
- Used to **populate dropdowns, selectors, and forms**.
- Can be extended or replaced with **dynamic data** in the future.

---

## **Usage Example**

```typescript
import { classOptions } from '@/data/classOptions';

console.log('Available classes:', classOptions);
```

---

## **Notes**

- Keep data files **simple and declarative** (arrays, objects).
- Avoid embedding logic in data files.
- Follow naming and documentation standards.
