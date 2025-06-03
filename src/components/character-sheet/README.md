# Character Sheet Components

## Purpose

This directory contains React components designed to display the detailed information of a player character, much like a traditional D&D character sheet. It provides a comprehensive view of a character's attributes, abilities, skills, equipment, and other relevant details.

## Structure and Important Files

- **`character-sheet.tsx`**: The main container component for the character sheet. It fetches or receives the character data and orchestrates the display of various sections.
- **`sections/`**: Contains sub-components, each dedicated to rendering a specific part of the character sheet.
    - **`BasicInfo.tsx`**: Displays fundamental character information like name, race, class, level, background, alignment, and description.
    - **`AbilityScores.tsx`**: Shows the character's ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) and their corresponding modifiers.
    - **`CombatStats.tsx`**: Displays combat-related statistics such as Armor Class (AC), Hit Points (HP), speed, initiative bonus, etc.
    - **`Equipment.tsx`**: Lists the character's inventory, including weapons, armor, and other gear.
    - *(Other potential sections: Skills, Spells, Feats, Proficiencies, Personality Traits, etc.)*

## How Components Interact

- A page, often routed with a dynamic character ID (e.g., `/characters/:characterId/sheet`), would render `character-sheet.tsx`.
- `character-sheet.tsx` is responsible for fetching the complete data for the specified character (likely using a custom hook or context that interacts with Supabase, pulling from `characters`, `character_stats`, `character_equipment` tables, etc.).
- It then passes the relevant slices of character data as props to the various sub-components within the `sections/` directory.
    - For example, `BasicInfo.tsx` receives general character details.
    - `AbilityScores.tsx` receives the ability score data.
    - `CombatStats.tsx` receives HP, AC, etc.
    - `Equipment.tsx` receives the character's inventory list.
- Each section component formats and displays its specific piece of information.

## Usage Example

```typescript
// Example conceptual usage within a dynamic route page:
// src/pages/ViewCharacterSheetPage.tsx
import { useParams } from 'react-router-dom';
import { CharacterSheet } from '@/components/character-sheet/character-sheet';

const ViewCharacterSheetPage = () => {
  const { characterId } = useParams<{ characterId: string }>();

  if (!characterId) return <p>Character not found.</p>;

  return (
    <div>
      {/* CharacterSheet component fetches data based on characterId */}
      <CharacterSheet characterId={characterId} />
    </div>
  );
};

export default ViewCharacterSheetPage;
```

## Notes

- This module is crucial for players to view and understand their characters' capabilities.
- Data fetching and structuring are key aspects. The `character-sheet.tsx` component often needs to aggregate data from multiple database tables.
- The design should aim for clarity and ease of information retrieval, similar to a physical character sheet.
- Consider print-friendly styles if users might want to print their character sheets.
- See the main `/src/components/README.md` for the overall component architecture.
