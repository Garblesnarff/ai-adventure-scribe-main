# External Integrations

This directory contains **integrations with external services** used by the AI Dungeon Master app, primarily Supabase.

---

## **Purpose**

Provide **API clients, types, and helpers** to interact with:

- Supabase database and authentication
- Supabase Edge Functions
- Other third-party services (future)

---

## **Important Files**

- **`supabase/client.ts`**  
  Initializes and exports the Supabase client instance.

- **`supabase/database.types.ts`**  
  Type definitions for Supabase database schema.

- **`supabase/types.ts`**  
  Additional Supabase-related types.

---

## **How Integrations Are Used**

- Imported by **hooks** (e.g., `useGameSession`) to perform database operations.
- Used by **services** and **agents** to store and retrieve data.
- Can be extended to support **authentication**, **file storage**, or **serverless functions**.

---

## **Usage Example**

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.from('game_sessions').select('*');
```

---

## **Notes**

- Keep integration code **isolated** from business logic.
- Follow coding standards for naming, documentation, and modularity.
- Add new integrations in **separate subfolders**.
