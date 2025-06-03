# Session Utility Hooks & Functions

## Purpose

This directory contains custom React hooks and utility functions that are specifically related to game session management, validation, or ancillary session functionalities that might not fit directly into the main `use-game-session.ts` hook.

## Structure and Important Files

- **`session-utils.ts`**: This file likely contains utility functions related to game sessions. Examples could include:
    - Formatting session data for display.
    - Helper functions for calculating session duration or other metrics.
    - Small, reusable pieces of logic related to session properties.
- **`SessionValidator.tsx`** (as seen in `src/components/game/session/` but logically related to session hooks): While this is a component/hook found in the components directory, its logic is closely tied to session validation. It ensures that essential parameters like `sessionId`, `campaignId`, and `characterId` are present and valid before allowing certain game interactions to proceed. If it were purely logic, it might reside here.

*(The main `use-game-session.ts` hook in the parent `src/hooks/` directory handles the core lifecycle and state management of a game session, including its creation, loading, updating, and expiration.)*

## How Components Interact

- Utility functions from `session-utils.ts` could be imported and used by:
    - The main `use-game-session.ts` hook for its internal logic.
    - UI components that display session information (e.g., in a dashboard or game interface).
    - Other hooks that might need to compute something based on session data.
- The logic within `SessionValidator.tsx` (from `src/components/game/session/`) is used by components like `MessageHandler.tsx` to gate interactions based on the validity and presence of session identifiers.

## Usage Example

```typescript
// Conceptual example of using a utility function from session-utils.ts:
// Assuming session-utils.ts has a function like formatSessionDuration

import { formatSessionDuration } from '@/hooks/session/session-utils';

const SessionDisplayComponent = ({ session }) => {
  // const duration = formatSessionDuration(session.start_time, session.end_time);
  
  return (
    <div>
      {/* <p>Session Duration: {duration}</p> */}
    </div>
  );
};


// Conceptual usage of SessionValidator logic (as it's currently in components):
// In MessageHandler.tsx
// const validateSession = useSessionValidator({ sessionId, campaignId, characterId });
// const isValid = await validateSession();
// if (!isValid) return;
// Proceed with message handling...
```

## Notes

- This directory helps keep session-related utilities organized and separate from the main state management logic of `use-game-session.ts`.
- Functions here should be pure and reusable where possible.
- See `src/hooks/use-game-session.ts` for the primary session management hook.
