# Character List Components

## Purpose

This directory contains React components used for displaying lists of player characters. It allows users to see their created characters, select them for viewing details, or choose a character to join a campaign.

## Structure and Important Files

- **`character-list.tsx`**: The main component responsible for fetching and rendering a list of characters. It likely uses `character-card.tsx` for each character.
- **`character-card.tsx`**: A component that displays summary information for a single character (e.g., name, race, class, level, avatar). It's typically interactive, allowing selection or navigation.
- **`campaign-card.tsx`**: (Potentially a typo or shared component) If this is specific to character listing, it might be used when characters are displayed in the context of a campaign they belong to. Otherwise, it might be a generic campaign card.
- **`campaign-selection-modal.tsx`**: A modal component that might be used in conjunction with character selection to assign a character to a campaign or choose a campaign to play with the selected character.
- **`empty-state.tsx`**: A component displayed if no characters are available, usually prompting the user to create a new character.

## How Components Interact

- A page or section of the application (e.g., "My Characters", "Select Character for Campaign") would render `character-list.tsx`.
- `character-list.tsx` fetches character data (e.g., for the logged-in user from Supabase).
    - It might display a loading state (e.g., using a skeleton component, not explicitly listed but good practice) while data is fetched.
    - If no characters exist, it renders `empty-state.tsx`.
    - Otherwise, it maps over the character data and renders a `character-card.tsx` for each.
- `character-card.tsx` displays individual character details and handles click events, which might:
    - Navigate to a character sheet page.
    - Select the character for an action (e.g., triggering `campaign-selection-modal.tsx`).
- `campaign-selection-modal.tsx` would handle the UI and logic for associating a character with a campaign.

## Usage Example

```typescript
// Example conceptual usage within a "My Characters" page:
// src/pages/MyCharactersPage.tsx

import { CharacterList } from '@/components/character-list/character-list';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const MyCharactersPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Characters</h1>
        <Link to="/create-character">
          <Button>Create New Character</Button>
        </Link>
      </div>
      <CharacterList />
    </div>
  );
};

export default MyCharactersPage;
```

## Notes

- This module is key for users to manage their created characters.
- Data fetching for characters is typically tied to the authenticated user.
- Consider pagination or infinite scrolling if a user can have a very large number of characters.
- See the main `/src/components/README.md` for the overall component architecture.
