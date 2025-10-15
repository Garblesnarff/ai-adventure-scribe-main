# AGENTS.md

This file provides guidance to all AI Agents when working with code in this repository.

## Project: InfiniteRealms (AI Adventure Scribe)

A solo fantasy RPG platform with persistent worlds, multi-agent AI storytelling, and long-term memory. Players create campaigns and characters that evolve across generations in their own personal universe.

## Development Commands

We track work in Beads instead of Markdown. Run \`bd quickstart\` to see how.

bd - Dependency-Aware Issue Tracker

Issues chained together like beads.

GETTING STARTED
  bd init   Initialize bd in your project
            Creates .beads/ directory with project-specific database
            Auto-detects prefix from directory name (e.g., myapp-1, myapp-2)

  bd init --prefix api   Initialize with custom prefix
            Issues will be named: api-1, api-2, ...

CREATING ISSUES
  bd create "Fix login bug"
  bd create "Add auth" -p 0 -t feature
  bd create "Write tests" -d "Unit tests for auth" --assignee alice

VIEWING ISSUES
  bd list       List all issues
  bd list --status open  List by status
  bd list --priority 0  List by priority (0-4, 0=highest)
  bd show bd-1       Show issue details

MANAGING DEPENDENCIES
  bd dep add bd-1 bd-2     Add dependency (bd-2 blocks bd-1)
  bd dep tree bd-1  Visualize dependency tree
  bd dep cycles      Detect circular dependencies

DEPENDENCY TYPES
  blocks  Task B must complete before task A
  related  Soft connection, doesn't block progress
  parent-child  Epic/subtask hierarchical relationship
  discovered-from  Auto-created when AI discovers related work

READY WORK
  bd ready       Show issues ready to work on
            Ready = status is 'open' AND no blocking dependencies
            Perfect for agents to claim next work!

UPDATING ISSUES
  bd update bd-1 --status in_progress
  bd update bd-1 --priority 0
  bd update bd-1 --assignee bob

CLOSING ISSUES
  bd close bd-1
  bd close bd-2 bd-3 --reason "Fixed in PR #42"

DATABASE LOCATION
  bd automatically discovers your database:
    1. --db /path/to/db.db flag
    2. $BEADS_DB environment variable
    3. .beads/*.db in current directory or ancestors
    4. ~/.beads/default.db as fallback

AGENT INTEGRATION
  bd is designed for AI-supervised workflows:
    • Agents create issues when discovering new work
    • bd ready shows unblocked work ready to claim
    • Use --json flags for programmatic parsing
    • Dependencies prevent agents from duplicating effort

DATABASE EXTENSION
  Applications can extend bd's SQLite database:
    • Add your own tables (e.g., myapp_executions)
    • Join with issues table for powerful queries
    • See EXTENDING.md for integration patterns

GIT WORKFLOW (AUTO-SYNC)
  bd automatically keeps git in sync:
    • ✓ Export to JSONL after CRUD operations (5s debounce)
    • ✓ Import from JSONL when newer than DB (after git pull)
    • ✓ Works seamlessly across machines and team members
    • No manual export/import needed!
  Disable with: --no-auto-flush or --no-auto-import

Ready to start!
Run bd create "My first issue" to create your first issue.

Tip: Use the wrapper for reliability
```bash
# Always call bd via the repo wrapper to avoid PATH issues
bash ./scripts/bd.sh list --status open
bash ./scripts/bd.sh create "Example issue"
```

### Frontend & Backend
```bash
# Full multi-service dev (frontend + backend + CrewAI service)
npm run dev

# Individual services
npm run dev:frontend   # frontend (Vite, port 3000)
npm run dev:backend    # server build + start (port 8888)
npm run dev:crewai     # CrewAI FastAPI (uvicorn, port 8000)

# Note: package.json has dev:full referencing dev:database (not defined).
# Use `npm run dev` instead.
```

### Building & Testing
```bash
# Build frontend for production
npm run build

# Development build
npm run build:dev

# Lint
npm run lint

# Preview production build locally
npm run preview

# Server tests
npm run server:test

# Frontend/services tests (on demand)
npx vitest run
```

### Backend Server (Express + TypeScript)
```bash
# Build & run
npm run server:dev          # builds then starts on port 8888
npm run server:build
npm run server:start

# Migrations & seeds (via ts-node)
npx ts-node --project server/tsconfig.json server/src/scripts/migrate.ts
npx ts-node --project server/tsconfig.json server/src/scripts/run-all-migrations.ts
npx ts-node --project server/tsconfig.json server/src/scripts/seed.ts
npx ts-node --project server/tsconfig.json server/src/scripts/comprehensive-seed.ts
npx ts-node --project server/tsconfig.json server/src/scripts/seed-bard-spells.ts

# Supabase-specific seed
npm run server:seed-bard-spells-supabase
```

### Test Data & Utilities
```bash
# Seed test data for development
npm run seed:test-data

# Check for unused dependencies
npm run check-deps

# Find unused exports
npm run check-unused-exports
```

## Architecture Overview

### Multi-Agent AI System (Core Innovation)
The application uses a **collaborative multi-agent architecture** where specialized AI agents work together:

- **Dungeon Master Agent** (`src/agents/dungeon-master-agent.ts`): Storytelling, narrative generation, NPC behavior
- **Rules Interpreter Agent** (`src/agents/rules-interpreter-agent.ts`): D&D 5E rule enforcement, combat mechanics, spell validation
- **Agent Communication**: Asynchronous messaging via `src/agents/messaging/` using production-grade message queues
- **Error Recovery**: Resilient offline-first messaging with state synchronization (`src/agents/error/`)

### Memory Architecture (Long-term Persistence)
InfiniteRealms implements sophisticated episodic memory beyond simple context windows:

- **Memory Classification**: Events, dialogue, and actions stored with importance scores (`src/agents/services/memory/MemoryImportanceService.ts`)
- **Vector Embeddings**: Semantic search via OpenAI embeddings for contextual retrieval
- **Hierarchical Storage**: World → Campaign → Session memory scoping
- **Memory Context**: `src/contexts/MemoryContext.tsx` for state management
- **Memory Hooks**: `src/hooks/memory/` for retrieval and persistence

### State Management Patterns
- **React Contexts** (`src/contexts/`): Campaign, Character, Memory, Message state
- **TanStack Query**: Server state synchronization with Supabase
- **Custom Hooks** (`src/hooks/`): Encapsulate complex logic (AI responses, game sessions, combat)

### Backend Services (Dual Architecture)

#### Supabase Edge Functions (`supabase/functions/`)
Serverless Deno functions for AI and core operations:
- `dm-agent-execute/`: Main DM agent execution with Gemini LLM
- `rules-interpreter-execute/`: Rules validation and enforcement
- `chat-ai/`: Real-time conversational AI
- `generate-embedding/`: Vector embedding generation
- `text-to-speech/`: ElevenLabs TTS integration
- `generate-campaign-description/`: AI campaign description generation
 - `get-secret/`: Secret retrieval helper

#### Express Backend Server (`server/src/`)
Backup REST API with PostgreSQL:
- JWT authentication (`/v1/auth/*`)
- Campaign/Character CRUD (`/v1/campaigns/*`, `/v1/characters/*`)
- WebSocket chat per session (`/ws`)
- AI provider endpoints (`/v1/ai/respond`)
- Stripe billing (`/v1/billing/*`)

### Frontend Component Organization

**Feature-Based Structure** (`src/components/`):
- `auth/`: Authentication UI
- `campaign-creation/`, `campaign-list/`, `campaign-view/`: Campaign management
- `character-creation/`, `character-list/`, `character-sheet/`: Character management
- `game/`: Core gameplay interface and messaging
- `combat/`: Combat system with D&D 5E mechanics
- `spellcasting/`: Spell selection and casting UI
- `ui/`: Shadcn UI components (Radix + Tailwind)

### Type System (`src/types/`)
Strongly-typed contracts for:
- `agent.ts`: AI agent interfaces and tasks
- `campaign.ts`, `character.ts`: Core game entities
- `gameState.ts`: Location, NPCs, scene status
- `memory.ts`: Memory storage and classification
- `dialogue.ts`: Message history formats

### AI Service Integration (`src/services/`)
- **Gemini API Manager** (`gemini-api-manager.ts`, `gemini-api-manager-singleton.ts`)
- **Character Generators**: Background, description, image generation
- **Combat AI** (`combat/`): Combat flow with AI narration
- **Image Generation** (`gemini-image-service.ts`): Character and campaign visuals
- **CrewAI Orchestrator** (`crewai/*`): Agent orchestration adapters
- **Spell System** (`localSpellService.ts`, `characterSpellApi.ts`): D&D spell management

## Key Technical Patterns

### 1. Agent Messaging Protocol (MCP)
Agents communicate via structured messages with retry logic and error recovery. See `src/agents/messaging/agent-messaging-service.ts`.

### 2. Memory Retrieval Flow
```typescript
// Memory importance scoring → Semantic search → Context assembly
// See: src/hooks/memory/useMemoryRetrieval.ts
// See: src/agents/services/memory/MemoryImportanceService.ts
```

### 3. AI Response Generation
```typescript
// Multi-step: Player action → Intent detection → Rule validation → Narrative generation
// See src/hooks/use-ai-response.ts for full implementation
```

### 4. Campaign State Persistence
All state changes sync to Supabase real-time database with optimistic updates via TanStack Query.

## Testing Strategy

**Test Coverage** (Vitest + React Testing Library):
- Server: `server/tests/*.test.ts`
- Frontend components: `src/components/**/__tests__/*.test.tsx`
- Services/hooks: `src/services/**/__tests__/*.test.ts` (and colocated feature tests)
- Agents: targeted tests like `src/agents/services/intent/PlayerIntentDetector.test.ts`

**Run Tests**:
```bash
npm run server:test           # Server tests
npx vitest run                # Frontend/services tests
```

## Environment Configuration

### Frontend (.env.local)
```bash
VITE_SUPABASE_URL=            # Supabase project URL
VITE_SUPABASE_ANON_KEY=       # Public anon key
VITE_GEMINI_API_KEYS=         # Comma-separated Gemini keys
VITE_ELEVENLABS_API_KEY=      # TTS service
VITE_OPENROUTER_API_KEY=      # Image generation
```

### Server (server/.env)
```bash
DATABASE_URL=                 # PostgreSQL connection
JWT_SECRET=                   # Auth token secret
OPENAI_API_KEY=              # Embeddings
ANTHROPIC_API_KEY=           # Optional Claude API
STRIPE_SECRET_KEY=           # Billing
STRIPE_WEBHOOK_SECRET=       # Webhook verification
```

## Supabase Schema Patterns

**Core Tables**:
- `campaigns`: Campaign metadata with genre/setting
- `characters`: D&D 5E character sheets with stats/inventory
- `campaign_sessions`: Individual gameplay sessions
- `memories`: Classified memory storage with embeddings
- `game_messages`: Message history with AI/player attribution
- `spells`, `classes`, `races`: D&D reference data

**RLS Policies**: Row-level security ensures user data isolation

## D&D 5E Implementation Notes

### Spell System Architecture
- **Data Source**: `src/data/spellOptions.ts` - Complete D&D 5E spell lists
- **Validation**: Class restrictions, spell level limits, cantrip vs prepared distinction
- **Racial Bonuses**: Handled in character creation wizard
- **Multiclass**: Edge cases tested in `src/__tests__/edge-cases/multiclass-spell-validation.test.ts`

### Combat System
- **Initiative Tracking**: `src/services/combat/` with turn order management
- **Dice Rolling**: `@dice-roller/rpg-dice-roller` for D20 system
- **AI Integration**: `use-combat-ai-integration.ts` for narrative combat flow

## Code Standards & Refactoring

**Active Refactor Plan** (`refactor-plan/`):
- Phase 1: Directory documentation (README.md files) ✓
- Phase 2: File naming (kebab-case conversion)
- Phase 3: File headers and import organization
- Phase 4: Function documentation (JSDoc)
- Phase 5: Code segmentation and splitting
- Phase 6: Type safety improvements
- Phase 7: Implementation notes
- Phase 8: Test coverage expansion

**Naming Conventions**:
- Files: `kebab-case.ts/tsx` (in progress)
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

## Specialized Agent System

**Custom Claude Agents** (`.claude/agents/`):
General-purpose engineering agent profiles (e.g., `frontend-engineer.md`, `backend-architect.md`, `test-engineer.md`, `security-engineer.md`, `ai-integration-specialist.md`).

Domain-specific logic for spells, rules, and narration is implemented by code-based agents under `src/agents/*`.

## Persistent Worlds Roadmap

**Next Major Features** (`roadmaps/`):
1. **Phase 1**: User-owned worlds with cross-campaign persistence
2. **Phase 2**: Family lineage and generational NPCs
3. **Phase 3**: Timeline evolution (medieval→steampunk→cyberpunk)
4. **Phase 4**: Hierarchical memory (World→Campaign→Session)
5. **Phase 5**: Campaign-to-fiction compilation
6. **Phase 6**: Visual generation (1000 daily free images)
7. **Phase 7**: 3D world visualization (deck.gl)

## Important Development Notes

### AI Integration Limits
- **Gemini Flash**: Primary model, supports 2M token context for long memory
- **Rate Limiting**: API key rotation via comma-separated `VITE_GEMINI_API_KEYS`
- **Fallback**: Express server can use Anthropic/OpenAI as backup

### Performance Considerations
- **Memory Retrieval**: Vector search limited to top-k=10 for response speed
- **Image Generation**: Async queue to prevent UI blocking
- **WebSocket**: One connection per session, auto-reconnect on disconnect

### Security
- **JWT Tokens**: 24-hour expiry, refresh via Supabase Auth
- **RLS Policies**: All Supabase tables enforce user ownership
- **API Keys**: Never exposed to client, proxied via Edge Functions

## Debugging & Development Tools

### Server Logs
```bash
# View server console
PORT=8888 node server/dist/index.js

# Run migrations (verbose)
npx ts-node --project server/tsconfig.json server/src/scripts/migrate.ts -- --verbose
```

### Supabase CLI
```bash
# Local development
npx supabase start
npx supabase db diff

# Deploy functions
npx supabase functions deploy dm-agent-execute
```

### Browser DevTools
- React DevTools: Component hierarchy and state
- TanStack Query DevTools: Server state inspection
- Network tab: Edge Function invocations and responses

## Common Workflows

### Adding a New AI Agent
1. Create agent file in `src/agents/`
2. Implement `AgentInterface` from `src/types/agent.ts`
3. Register with messaging service
4. Add Edge Function wrapper in `supabase/functions/`
5. Update frontend hook in `src/hooks/ai/`

### Adding D&D Content
1. Update data in `src/data/` (e.g., `spellOptions.ts`)
2. Run seed script: `npx ts-node --project server/tsconfig.json server/src/scripts/seed.ts` (or `npm run server:seed-bard-spells-supabase` for Bard data)
3. Verify in Supabase dashboard
4. Update validation in `src/agents/rules/*`
5. Add tests in `src/__tests__/`

### Creating New Components
1. Place in feature directory (`src/components/[feature]/`)
2. Use Shadcn UI primitives from `src/components/ui/`
3. Add TypeScript types in `src/types/`
4. Create tests in `src/components/[feature]/__tests__/`

