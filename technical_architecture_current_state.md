# Technical Architecture: Current State - AI Dungeon Master

## 1. Overview

The AI Dungeon Master application is a web-based platform designed to facilitate Dungeons & Dragons-style gameplay, with an AI acting as the Dungeon Master. The frontend is built using **React** with **TypeScript**, utilizing **Vite** for the build process and development server. Styling is managed by **Tailwind CSS** and **shadcn/ui** for pre-built components. State management appears to be a combination of React Context API and custom hooks.

The backend is powered by **Supabase**, which provides database services, authentication, and serverless Edge Functions. These functions handle core game logic, AI interactions (likely with external LLM services like Google Gemini, as hinted in function descriptions), and other backend tasks.

**Key Technologies:**

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
*   **Backend:** Supabase (PostgreSQL Database, Edge Functions, Auth)
*   **AI:** External LLMs (details to be confirmed, Gemini mentioned in docs), embedding generation.
*   **Testing:** Vitest, React Testing Library

## 2. Frontend Architecture

The frontend code is organized within the `src/` directory.

### 2.1. Key Directories in `src/`

*   **`agents/`**: Contains logic for AI agents, including the Dungeon Master and Rules Interpreter. This seems to bridge frontend requests with backend AI processing or might contain client-side AI helper logic. Includes sub-modules for `crewai` (a framework for orchestrating AI agents), `messaging`, `error` handling, and shared `services`.
*   **`components/`**: Houses all React UI components. This is further subdivided into:
    *   `campaign-creation/`: Wizard and components for creating new campaigns.
    *   `campaign-list/`: Components for displaying and managing existing campaigns.
    *   `campaign-view/`: Components for detailed views of a campaign.
    *   `character-creation/`: Wizard and components for player character creation.
    *   `character-list/`: Components for listing and selecting characters.
    *   `character-sheet/`: Components for displaying character details.
    *   `game/`: Core gameplay interface elements (chat, memory panel, audio controls).
    *   `layout/`: Navigation, breadcrumbs, and overall page structure components.
    *   `ui/`: Reusable, generic UI primitives (buttons, dialogs, forms, etc.), largely based on shadcn/ui.
*   **`contexts/`**: Contains React Context providers for global state management (e.g., `CampaignContext.tsx`, `CharacterContext.tsx`, `MemoryContext.tsx`, `MessageContext.tsx`).
*   **`data/`**: Stores static data files, such as options for character backgrounds, classes, races, and equipment.
*   **`hooks/`**: Includes custom React hooks for managing complex state, side effects, AI interactions, session management, and audio.
    *   `ai/`: Hooks related to AI utilities.
    *   `memory/`: Hooks for memory creation, filtering, and retrieval.
    *   `session/`: Hooks for game session utilities.
*   **`integrations/`**: Code for integrating with external services, primarily Supabase.
    *   `supabase/`: Contains the Supabase client setup (`client.ts`) and TypeScript definitions for the database schema (`database.types.ts`).
*   **`lib/`**: General utility functions (e.g., `utils.ts`).
*   **`pages/`**: Likely contains top-level page components that assemble layouts and feature components. `Index.tsx` is present.
*   **`services/`**: (Potentially, or this logic might be within `agents/services/` or `hooks/`) Client-side services that encapsulate business logic or API interactions not directly tied to a UI component or hook.
*   **`types/`**: Shared TypeScript type definitions and interfaces for various data structures like agents, campaigns, characters, game state, and memories.
*   **`utils/`**: Utility functions for specific domains like ability scores, character transformations, dice rolling, and memory processing.

### 2.2. Core UI Components & Roles

The `src/components/` directory is well-organized by feature. Here's a summary of key components and their roles:

*   **`GameInterface.tsx`**: (To be renamed `game-interface.tsx`) The main container component for the core gameplay experience. It likely integrates chat, memory display, and other interactive game elements.

*   **`campaign-creation/`**:
    *   `CampaignWizard.tsx`: A multi-step form/wizard to guide users through creating a new D&D campaign.
    *   `steps/`: Contains individual step components for the wizard (e.g., `Step1Name.tsx`, `Step2Details.tsx` - actual names might vary, inferred from structure).
    *   `shared/`: Common components used within the campaign creation process.
*   **`campaign-list/`**:
    *   `CampaignList.tsx`: Displays a list of available campaigns.
    *   `CampaignCard.tsx`: A card component to represent a single campaign in the list.
    *   `EmptyState.tsx`: Shown when no campaigns are available.
    *   `CampaignSkeleton.tsx`: Loading state for campaign cards.
*   **`campaign-view/`**:
    *   `CampaignView.tsx`: Main component for viewing the details of a selected campaign.
    *   `sections/`: Sub-components for different parts of the campaign view (e.g., overview, NPCs, lore - inferred).
*   **`character-creation/`**:
    *   `CharacterWizard.tsx`: A multi-step form/wizard for creating player characters.
    *   `steps/`: Individual step components for the character wizard (e.g., class selection, ability scores, background - inferred).
    *   `shared/`: Common components used within character creation.
*   **`character-list/`**:
    *   `CharacterList.tsx`: Displays a list of player characters.
    *   `CharacterCard.tsx`: A card component for a single character.
    *   `CampaignSelectionModal.tsx`: A modal to select a campaign for a character (or vice-versa).
    *   `EmptyState.tsx`: Shown when no characters are available.
*   **`character-sheet/`**:
    *   `CharacterSheet.tsx`: Displays the full details of a character (stats, inventory, abilities, etc.).
    *   `sections/`: Sub-components for different parts of the character sheet.
*   **`game/`**: Contains components specific to the active gameplay interface:
    *   `ChatInput.tsx`: Input field for players to type commands/dialogue.
    *   `MessageList.tsx`: Displays the history of messages (DM narration, player actions).
    *   `MemoryPanel.tsx`: Displays relevant memories or context to the player.
    *   `AudioControls.tsx`: UI for managing audio input/output (e.g., text-to-speech, voice input).
    *   `VoiceHandler.tsx`: Logic for handling voice input.
    *   `audio/`, `memory/`, `message/`, `session/`: Subdirectories likely containing more specialized components for these features.
*   **`layout/`**:
    *   `Navigation.tsx`: Main site navigation (e.g., sidebar or top bar).
    *   `Breadcrumbs.tsx`: Navigational aid showing the user's current location in the app.
*   **`ui/`**: (shadcn/ui based)
    *   A comprehensive suite of reusable UI primitives. Examples observed from `ls` output include:
        *   `Accordion.tsx`, `AlertDialog.tsx`, `Alert.tsx`, `AspectRatio.tsx`, `Avatar.tsx`, `Badge.tsx`, `Breadcrumb.tsx`, `Button.tsx`, `Calendar.tsx`, `Card.tsx`, `Carousel.tsx`, `Chart.tsx`, `Checkbox.tsx`, `Collapsible.tsx`, `Command.tsx`, `ContextMenu.tsx`, `Dialog.tsx`, `Drawer.tsx`, `DropdownMenu.tsx`, `Form.tsx`, `HoverCard.tsx`, `InputOtp.tsx`, `Input.tsx`, `Label.tsx`, `Menubar.tsx`, `NavigationMenu.tsx`, `Pagination.tsx`, `Popover.tsx`, `Progress.tsx`, `RadioGroup.tsx`, `Resizable.tsx`, `ScrollArea.tsx`, `Select.tsx`, `Separator.tsx`, `Sheet.tsx`, `Sidebar.tsx`, `Skeleton.tsx`, `Slider.tsx`, `Sonner.tsx` (for toasts), `Switch.tsx`, `Table.tsx`, `Tabs.tsx`, `Textarea.tsx`, `Toast.tsx`, `Toaster.tsx`, `ToggleGroup.tsx`, `Toggle.tsx`, `Tooltip.tsx`.
    *   These components are used extensively throughout the application to build consistent user interfaces.

### 2.3. State Management Strategy

*   **React Context API:** Used for global state that needs to be accessible by many components across different levels of the component tree. Key contexts include `CampaignContext`, `CharacterContext`, `MemoryContext`, and `MessageContext`.
*   **Custom Hooks (`src/hooks/`)**: Encapsulate reusable stateful logic and side effects. These hooks often consume the aforementioned contexts and interact with Supabase or AI services. Examples: `useGameSession`, `useMemories`, `useMessages`, `useAgentSystem`.
*   **Local Component State (`useState`, `useReducer`)**: Used for component-specific UI state that doesn't need to be shared globally.
*   **React Hook Form**: Used for managing form state, validation, and submissions (inferred from dependencies like `@hookform/resolvers` and typical usage with shadcn/ui forms).
*   **TanStack Query (@tanstack/react-query)**: Likely used for server state management: fetching, caching, synchronizing, and updating server data, especially from Supabase.

## 3. Backend Architecture (Supabase)

The backend logic and data persistence are handled by Supabase.

### 3.1. Database

*   **Schema Source:** The primary source for understanding the database schema is `src/integrations/supabase/database.types.ts`. This file contains TypeScript definitions generated from the Supabase database.
*   **Technology:** Supabase utilizes PostgreSQL.
*   **Key Tables and Columns:** (Based on `database.types.ts`)

    *   **`campaigns`**: Stores information about different game campaigns.
        *   `id` (string, PK)
        *   `name` (string)
        *   `description` (string, nullable)
        *   `user_id` (string, nullable, FK to users - implicit)
        *   `status` (string, nullable)
        *   `genre`, `tone`, `era`, `location`, `atmosphere`, `difficulty_level`, `campaign_length` (string, nullable)
        *   `setting_details`, `thematic_elements` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`characters`**: Stores player character data.
        *   `id` (string, PK)
        *   `user_id` (string, nullable, FK to users - implicit)
        *   `name` (string)
        *   `class` (string)
        *   `race` (string)
        *   `level` (number, nullable)
        *   `experience_points` (number, nullable)
        *   `alignment` (string, nullable)
        *   `background` (string, nullable)
        *   `description` (string, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`character_stats`**: Stores detailed stats for characters (likely one-to-one with `characters`).
        *   `id` (string, PK)
        *   `character_id` (string, nullable, FK to `characters.id`) - Marked as OneToOne
        *   `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma` (number)
        *   `max_hit_points`, `current_hit_points`, `temporary_hit_points` (number, nullable for temp)
        *   `armor_class` (number)
        *   `initiative_bonus` (number, nullable)
        *   `speed` (number, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`character_equipment`**: Manages equipment for characters (one-to-many with `characters`).
        *   `id` (string, PK)
        *   `character_id` (string, nullable, FK to `characters.id`)
        *   `item_name` (string)
        *   `item_type` (string)
        *   `quantity` (number, nullable)
        *   `equipped` (boolean, nullable)
        *   `description` (string, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`game_sessions`**: Tracks individual game play sessions.
        *   `id` (string, PK)
        *   `campaign_id` (string, nullable, FK to `campaigns.id`)
        *   `character_id` (string, nullable, FK to `characters.id`)
        *   `session_number` (number, nullable)
        *   `start_time`, `end_time` (string, nullable)
        *   `status` (string, nullable)
        *   `summary` (string, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`dialogue_history`**: Stores messages exchanged during a game session.
        *   `id` (string, PK)
        *   `session_id` (string, nullable, FK to `game_sessions.id`)
        *   `speaker_id` (string, nullable - could be character, NPC, or DM)
        *   `speaker_type` (string, nullable - e.g., "player", "dm", "npc")
        *   `message` (string)
        *   `timestamp` (string, nullable)
        *   `context` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`memories`**: Stores memories or contextual information for the AI.
        *   `id` (string, PK)
        *   `session_id` (string, nullable, FK to `game_sessions.id`)
        *   `content` (string)
        *   `type` (string) - Nature of the memory
        *   `importance` (number, nullable) - Relevance score
        *   `embedding` (string, nullable) - Vector embedding for semantic search
        *   `category` (string, nullable)
        *   `metadata` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`worlds`**: Defines game worlds, potentially linked to campaigns.
        *   `id` (string, PK)
        *   `campaign_id` (string, nullable, FK to `campaigns.id`)
        *   `name` (string)
        *   `description` (string, nullable)
        *   `magic_level`, `technology_level`, `climate_type` (string, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`locations`**: Specific locations within a world.
        *   `id` (string, PK)
        *   `world_id` (string, nullable, FK to `worlds.id`)
        *   `name` (string)
        *   `description` (string, nullable)
        *   `location_type` (string, nullable)
        *   `parent_location_id` (string, nullable, FK to `locations.id` - self-referencing for hierarchy)
        *   `coordinates` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`npcs`**: Non-player characters.
        *   `id` (string, PK)
        *   `world_id` (string, nullable, FK to `worlds.id`)
        *   `current_location_id` (string, nullable, FK to `locations.id`)
        *   `name` (string)
        *   `description`, `personality` (string, nullable)
        *   `race`, `class` (string, nullable)
        *   `level` (number, nullable)
        *   `stats` (Json, nullable) - Could store NPC-specific stats
        *   `created_at`, `updated_at` (string, nullable)

    *   **`quests`**: Information about quests within a campaign.
        *   `id` (string, PK)
        *   `campaign_id` (string, nullable, FK to `campaigns.id`)
        *   `title` (string)
        *   `description` (string, nullable)
        *   `status` (string, nullable)
        *   `quest_type`, `difficulty` (string, nullable)
        *   `prerequisites`, `rewards` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`quest_progress`**: Tracks character progress on quests.
        *   `id` (string, PK)
        *   `quest_id` (string, nullable, FK to `quests.id`)
        *   `character_id` (string, nullable, FK to `characters.id`)
        *   `status` (string, nullable)
        *   `current_objective` (string, nullable)
        *   `progress_data` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`combat_encounters`**: Details about combat situations.
        *   `id` (string, PK)
        *   `session_id` (string, nullable, FK to `game_sessions.id`)
        *   `location_id` (string, nullable, FK to `locations.id`)
        *   `description` (string, nullable)
        *   `status`, `difficulty` (string, nullable)
        *   `initiative_order`, `combat_log` (Json, nullable)
        *   `created_at`, `updated_at` (string, nullable)

    *   **`timelines`, `events`, `historical_media`**: These tables suggest a system for managing historical events and timelines within a game world, potentially for lore generation or dynamic storytelling.
        *   `timelines`: `id`, `name`, `description`, `base_timeline_id` (self-referencing), `user_id`.
        *   `events`: `id`, `timeline_id` (FK), `title`, `date`, `description`, `category` (Enum: `Technology`, `Political`, etc.), `confidence_score`, `impact_analysis`.
        *   `historical_media`: `id`, `event_id` (FK), `type` (Enum: `Newspaper`, `Document`, etc.), `content`.

    *   **`categories`, `translations`**: These tables (`categories`, `translations`) seem related to a different domain, possibly content management for a knowledge base or documentation, rather than core D&D gameplay. The columns `tibetan_title`, `source_file_path`, `translation_file_path` are strong indicators.
        *   `categories`: `id`, `title`, `description`.
        *   `translations`: `id`, `category_id` (FK), `title`, `tibetan_title`, `source_file_path`, `translation_file_path`.

    *   **`world_factions`, `world_history`**: Further details world-building elements.
        *   `world_factions`: `id`, `world_id` (FK), `name`, `description`, `faction_type`, `influence_level`, `relationships`.
        *   `world_history`: `id`, `world_id` (FK), `event_name`, `event_date`, `description`, `significance_level`, `affected_factions`.

    *   **`Oversight`**: A simple table with `id` and `created_at`. Its purpose is unclear from the schema alone.

*   **Relationships:** The `database.types.ts` file explicitly defines relationships (foreign keys) between tables, which are crucial for data integrity and querying. Examples:
    *   `character_stats.character_id` -> `characters.id` (OneToOne)
    *   `game_sessions.campaign_id` -> `campaigns.id`
    *   `memories.session_id` -> `game_sessions.id`
*   **Enums:** Custom enum types are defined for certain fields:
    *   `media_type`: "Newspaper", "Document", "Photo", "Video", "Audio" (used in `historical_media`)
    *   `timeline_category`: "Technology", "Political", "Cultural", "Economic", "Military", "Scientific" (used in `events`)
*   **JSON Fields:** Several tables use `Json` type fields (e.g., `campaigns.setting_details`, `memories.metadata`) to store flexible, unstructured, or semi-structured data.

### 3.2. Supabase Edge Functions

Located in the `supabase/functions/` directory. Each subdirectory typically represents a distinct serverless function. These functions are written in TypeScript and run in a Deno environment.

*   **`chat-ai/`**: Handles chat interactions, potentially using an LLM.
*   **`dm-agent-execute/`**: Core function for the AI Dungeon Master. Processes player actions, interacts with an LLM (Google Gemini mentioned) to generate narrative and game state changes.
*   **`generate-campaign-description/`**: AI-powered function to create descriptions for new campaigns.
*   **`generate-embedding/`**: Generates vector embeddings for text (memories, dialogue) to support semantic search for the memory system.
*   **`get-secret/`**: Utility to securely access secrets (e.g., API keys) within the Supabase environment.
*   **`rules-interpreter-execute/`**: Executes logic for interpreting and enforcing game rules.
*   **`text-to-speech/`**: Provides text-to-speech functionality.

### 3.3. API Endpoints (Supabase Edge Functions)

API endpoints are provided by Supabase Edge Functions, located in `supabase/functions/`. These are invoked from the client using `supabase.functions.invoke('function-name', { body: payload })`. The function's directory name typically serves as the endpoint name.

Based on the directory structure and READMEs, here are the identified endpoints and their likely purposes:

*   **`chat-ai`**
    *   **Purpose:** Handles real-time chat interactions, possibly for non-DM conversational AI, or a more generic AI chat feature.
    *   **Inputs (Likely):** User message, session ID, context.
    *   **Outputs (Likely):** AI-generated chat response.

*   **`dm-agent-execute`**
    *   **Purpose:** Core function for the AI Dungeon Master. Processes player actions, interacts with the primary LLM (e.g., Google Gemini) to generate narrative, game state updates, and NPC responses. This is central to gameplay.
    *   **Inputs (Likely):** Player action/command (text), current game session ID, campaign ID, character ID, relevant game context (e.g., recent dialogue, character state, memories). The `dm-agent-execute.test.ts` and `promptBuilder.ts` within its directory would provide more specific details.
    *   **Outputs (Likely):** DM narration, updates to game state, NPC actions/dialogue, outcomes of player actions.

*   **`generate-campaign-description`**
    *   **Purpose:** AI-powered function to automatically generate compelling descriptions for new campaigns based on user inputs or selections during campaign creation.
    *   **Inputs (Likely):** Campaign parameters (name, genre, themes, key elements chosen by the user).
    *   **Outputs (Likely):** A string containing the generated campaign description.

*   **`generate-embedding`**
    *   **Purpose:** Generates vector embeddings for text content. This is crucial for the memory system, enabling semantic search and similarity calculations for retrieving relevant memories or dialogue.
    *   **Inputs (Likely):** Text content (string or array of strings).
    *   **Outputs (Likely):** Vector embedding(s) for the input text.

*   **`get-secret`**
    *   **Purpose:** A utility function to securely retrieve sensitive secrets (like API keys for LLMs or other services) from environment variables within the Supabase environment. This is used by other Edge Functions.
    *   **Inputs (Likely):** Name of the secret to retrieve.
    *   **Outputs (Likely):** The secret value.

*   **`rules-interpreter-execute`**
    *   **Purpose:** Interprets and enforces game rules. This might involve checking the validity of player actions against D&D rules, determining outcomes of dice rolls, or providing rule clarifications.
    *   **Inputs (Likely):** Player action, current game state, relevant character stats, dice roll results (or it might perform rolls).
    *   **Outputs (Likely):** Outcome of the rule check (success/failure), adjudicated results of actions, rule explanations.

*   **`text-to-speech`**
    *   **Purpose:** Converts text (e.g., AI DM narration, NPC dialogue) into audible speech, enhancing immersion.
    *   **Inputs (Likely):** Text to synthesize, voice selection parameters (optional).
    *   **Outputs (Likely):** Audio data (e.g., URL to an audio file, or binary audio stream).

**Note:** The exact request/response schemas for these functions would be defined within their respective `types.ts` or handler files. Further examination of those files would be needed for precise details, but this provides a good overview based on their naming and documented purposes.

## 4. Data Flow (High-Level)

1.  **User Interaction:** User interacts with the React UI (e.g., inputs a command in the chat, creates a character).
2.  **Client-Side Logic:**
    *   React components handle UI rendering and event capture.
    *   Custom hooks and contexts manage local and global UI state.
    *   For actions requiring backend processing or data, client-side services/hooks make calls to Supabase.
3.  **Supabase Interaction:**
    *   **Database:** Direct queries/mutations for CRUD operations on data like campaigns, characters (via Supabase JS client).
    *   **Edge Functions:** For complex logic, AI processing, or secure operations, the client invokes a Supabase Edge Function.
4.  **Edge Function Processing:**
    *   The invoked Edge Function executes its logic.
    *   This may involve:
        *   Reading/writing from the Supabase database.
        *   Calling external AI services (e.g., LLMs for narrative generation, embedding services).
        *   Performing computations.
    *   The function returns a response to the client.
5.  **Client-Side Update:**
    *   The client receives the response from Supabase.
    *   State is updated (via hooks, contexts, TanStack Query), leading to UI re-renders to reflect changes.

## 5. Technical Debt & Refactor Plans

*   A significant refactor is planned and documented in the `refactor-plan/` directory. This indicates that the team is aware of areas needing improvement. The plan covers:
    *   Directory Documentation
    *   File Naming Conventions (e.g., `GameInterface.tsx` to `game-interface.tsx`)
    *   File Headers and Import Organization
    *   Function Documentation (JSDoc)
    *   Splitting Large Files and Functions
    *   Type Information and Segmentation
    *   Implementation Notes and References
    *   Testing and Validation
*   Specific areas of technical debt are not explicitly listed in a single "debt log" but can be inferred from the existence of this comprehensive refactor plan. Common areas might include:
    *   Inconsistent naming conventions (addressed in Phase 2).
    *   Lack of documentation (addressed in Phases 1, 3, 4, 7).
    *   Large, unwieldy files or functions (addressed in Phase 5).
    *   Potentially insufficient type coverage or clarity (addressed in Phase 6).
    *   Gaps in test coverage (addressed in Phase 8).
*   **Code Comments:** A search for `TODO` or `FIXME` comments in `.ts`, `.tsx`, `.js`, `.jsx` files within `src/` and `supabase/` directories yielded no results. This indicates that developers are not currently using these tags to mark known issues or immediate tasks directly in the code.
*   **General Observations (High-Level):**
    *   **Complexity:** While the project is well-structured, some areas, particularly around AI agent orchestration (`src/agents/`) and complex UI wizards (`src/components/campaign-creation/`, `src/components/character-creation/`), might harbor complexity that could be simplified or further broken down as outlined in Phase 5 of the refactor plan.
    *   **Testing:** The refactor plan (Phase 8) explicitly mentions "Run tests and add missing tests." This implies that current test coverage might not be comprehensive. Key areas for ensuring robust test coverage would include:
        *   Core game logic in Supabase functions.
        *   AI agent interactions and response parsing.
        *   State management logic in custom hooks and contexts.
        *   Complex UI components and user flows.
    *   **Modularity:** The codebase demonstrates good modularity. However, as the application grows, continuous evaluation will be needed to ensure components and services remain focused and maintainable, aligning with the goals of the refactor plan.
    *   **Dependencies:** While `package.json` lists current dependencies, ongoing monitoring for outdated or vulnerable packages is a standard part of managing technical debt.
    *   **Documentation:** The `refactor-plan/` itself is a form of acknowledging the need for better documentation across various aspects (directory READMEs, file headers, function JSDocs).

**Conclusion on Technical Debt:**
The primary source of information regarding technical debt is the `refactor-plan/` directory. This plan proactively identifies areas for improvement across the codebase, from naming conventions and documentation to code structure and testing. The absence of `TODO/FIXME` comments suggests that these planned refactoring activities are the main avenue for addressing existing debt. The project appears to be in a state where debt is acknowledged and a strategy to mitigate it is in place.
