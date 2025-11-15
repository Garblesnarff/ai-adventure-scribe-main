# InfiniteRealms Architecture

> Last Updated: 2025-11-14

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Module Structure](#module-structure)
6. [Data Flow](#data-flow)
7. [AI Agent System](#ai-agent-system)
8. [Database Architecture](#database-architecture)
9. [API Architecture](#api-architecture)
10. [Frontend Architecture](#frontend-architecture)
11. [Security Architecture](#security-architecture)
12. [Performance & Scalability](#performance--scalability)
13. [Integration Points](#integration-points)
14. [Design Decisions](#design-decisions)

---

## System Overview

InfiniteRealms is a full-stack web application that provides an AI-powered fantasy RPG experience. The system uses a multi-agent AI architecture to simulate a human Game Master, maintaining persistent campaign memory and handling complex D&D 5E game rules.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React SPA)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Character  │  │  Campaign  │  │    Game    │            │
│  │ Creation   │  │ Management │  │   Chat     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API / tRPC / WebSocket
┌──────────────────────┴──────────────────────────────────────┐
│                    Backend (Express.js)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Auth     │  │   Rules    │  │    AI      │            │
│  │ Middleware │  │   Engine   │  │  Service   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              Supabase (Database & Auth)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │  Auth.js   │  │  Storage   │            │
│  │  Database  │  │            │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   External AI Services                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Gemini   │  │  OpenAI    │  │ ElevenLabs │            │
│  │    API     │  │ Embeddings │  │    TTS     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Separation of Concerns
- **Frontend**: UI rendering and user interaction
- **Backend**: Business logic, rules engine, and orchestration
- **Database**: Data persistence and authentication
- **AI Services**: External AI model integration

### 2. Domain-Driven Design
- Code organized by domain (characters, campaigns, combat, spells)
- Each domain has clear boundaries and responsibilities
- Rich domain models with business logic encapsulation

### 3. Type Safety
- TypeScript throughout the stack
- Shared type definitions between frontend and backend
- Zod schemas for runtime validation

### 4. Performance First
- Database query optimization (83-95% query reduction)
- Strategic indexing and caching
- Batch operations and JOINs
- Client-side state management with TanStack Query

### 5. Resilience & Reliability
- Circuit breaker pattern for external APIs
- Fallback mechanisms for AI services
- Offline-first capabilities with IndexedDB
- Comprehensive error handling

---

## Technology Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.5** - Type safety
- **Vite 5.4** - Build tool and dev server
- **TailwindCSS 3.4** - Styling
- **Shadcn UI** - Component library
- **TanStack Query 5.72** - Server state management
- **Zustand 5.0** - Client state management
- **React Router 6.26** - Routing
- **React Three Fiber** - 3D rendering for maps

### Backend
- **Node.js 22** - Runtime
- **Express.js 4.19** - Web framework
- **TypeScript 5.5** - Type safety
- **tRPC 11.7** - Type-safe API
- **Winston 3.18** - Logging
- **Helmet 7.1** - Security headers
- **Morgan 1.10** - HTTP logging
- **Compression** - Response compression

### Database & Auth
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Drizzle ORM 0.44** - Type-safe ORM
- **Supabase Auth** - Authentication
- **Row Level Security** - Authorization

### AI & ML
- **Google Gemini** - Primary AI model
- **OpenAI** - Embeddings and fallback
- **Anthropic Claude** - Alternative AI model
- **LangChain Core** - AI orchestration
- **LangGraph** - Multi-agent workflows
- **ElevenLabs** - Text-to-speech

### Testing & Quality
- **Vitest 2.0** - Unit and integration testing
- **Playwright 1.47** - E2E testing
- **ESLint 9.9** - Code linting
- **Prettier 3.6** - Code formatting
- **Type Coverage** - Type safety metrics

### DevOps & Monitoring
- **Prometheus** (prom-client) - Metrics
- **Gitleaks** - Secrets scanning
- **Trivy** - Vulnerability scanning
- **Lighthouse** - Performance auditing

---

## System Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base components (Shadcn)
│   ├── character/      # Character-specific components
│   ├── combat/         # Combat UI components
│   └── game/           # Game session components
├── pages/              # Route pages
├── features/           # Feature-based modules
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── contexts/           # React contexts
├── services/           # API service clients
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── agents/             # AI agent integration
│   └── langgraph/      # LangGraph implementation
├── engine/             # Game rules engine
│   ├── combat/         # Combat system
│   ├── spells/         # Spell system
│   └── dice/           # Dice rolling
└── integrations/       # External service integrations
```

### Backend Architecture

```
server/
├── src/
│   ├── routes/         # API route handlers
│   │   ├── v1/         # Versioned API routes
│   │   └── trpc/       # tRPC routes
│   ├── services/       # Business logic services
│   │   ├── character/  # Character management
│   │   ├── campaign/   # Campaign management
│   │   ├── combat/     # Combat orchestration
│   │   └── ai/         # AI service integration
│   ├── middleware/     # Express middleware
│   │   ├── auth.ts     # Authentication
│   │   ├── rate-limit.ts  # Rate limiting
│   │   └── error.ts    # Error handling
│   ├── lib/            # Shared libraries
│   │   ├── supabase.ts # Database client
│   │   ├── circuit-breaker.ts  # Resilience
│   │   └── logger.ts   # Winston logger
│   ├── rules/          # D&D 5E rules engine
│   │   ├── combat/     # Combat rules
│   │   ├── spells/     # Spell rules
│   │   └── checks/     # Ability checks
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── config/         # Configuration
└── tests/              # Test suites
```

---

## Module Structure

### Character Domain

**Responsibilities:**
- Character creation and management
- Attribute calculation (ability scores, modifiers)
- Level progression and experience
- Inventory management
- Spell preparation and casting

**Key Files:**
- `src/pages/CharacterCreation.tsx` - Character creation wizard
- `src/components/character/` - Character UI components
- `server/src/services/character/` - Character business logic
- `server/src/routes/v1/characters/` - Character API endpoints

### Campaign Domain

**Responsibilities:**
- Campaign creation and management
- Session tracking
- Player management (multiplayer support)
- Campaign settings and configuration

**Key Files:**
- `src/pages/CampaignManagement.tsx` - Campaign management UI
- `server/src/services/campaign/` - Campaign business logic
- `server/src/routes/v1/campaigns/` - Campaign API endpoints

### Combat Domain

**Responsibilities:**
- Initiative tracking and turn order
- Combat actions (attack, defend, spell casting)
- Condition management (poisoned, stunned, etc.)
- Damage calculation and application
- Opportunity attacks and reactions

**Key Files:**
- `src/engine/combat/` - Frontend combat engine
- `server/src/rules/combat/` - Backend combat rules
- `server/src/services/combat/` - Combat orchestration
- Database: `combat_encounters`, `combat_participants`

### Spell System

**Responsibilities:**
- Spell database and lookup
- Spell slot management
- Casting validation (components, range, targets)
- Spell effect application
- Concentration tracking

**Key Files:**
- `src/engine/spells/` - Spell casting logic
- `server/src/rules/spells/` - Spell validation rules
- Database: `spells` table with 300+ D&D 5E spells

### AI Agent System

**Responsibilities:**
- Natural language understanding
- Story generation and narration
- Rules interpretation and adjudication
- Context-aware NPC dialogue
- Memory management (persistent campaign state)

**Key Files:**
- `src/agents/langgraph/` - LangGraph agent implementation
- `src/agents/langgraph/dm-service.ts` - DM agent service
- `src/agents/langgraph/checkpointer.ts` - State persistence
- Database: `agent_checkpoints` table

---

## Data Flow

### Character Creation Flow

```
1. User fills character creation form
   └─> CharacterCreation.tsx
       │
2. Frontend validates input
   └─> Zod schema validation
       │
3. API request sent
   └─> POST /api/v1/characters
       │
4. Backend validates and processes
   └─> CharacterService.create()
       │
5. Database transaction
   └─> INSERT INTO characters, character_abilities, character_spells
       │
6. Response returned
   └─> Character ID and full character data
       │
7. Frontend updates
   └─> TanStack Query cache updated
   └─> Redirect to character sheet
```

### Game Session Flow

```
1. User sends message in game chat
   └─> SimpleGameChat.tsx
       │
2. Message dispatched to DM service
   └─> DMService.sendMessage()
       │
3. Load previous context
   └─> SupabaseCheckpointer.get(threadId)
       │
4. AI agent invoked
   └─> LangGraph agent with conversation history
       │
5. AI generates response
   └─> Rules validation → Story generation
       │
6. State persisted
   └─> SupabaseCheckpointer.put(newState)
       │
7. Response returned to UI
   └─> Message displayed in chat
   └─> State synchronized
```

### Combat Flow

```
1. Combat initiated
   └─> CombatService.startEncounter()
       │
2. Roll initiative for all participants
   └─> InitiativeService.rollInitiative()
       │
3. Determine turn order
   └─> Sort by initiative (highest first)
       │
4. Player action on their turn
   └─> Action validated by rules engine
       │
5. Apply action effects
   └─> Update HP, conditions, spell slots
       │
6. Check for end conditions
   └─> All enemies defeated / players downed
       │
7. End encounter or continue to next turn
```

---

## AI Agent System

### Multi-Agent Architecture

InfiniteRealms uses LangGraph to orchestrate multiple specialized AI agents:

```
┌─────────────────────────────────────────────────────────────┐
│                      User Input                              │
│             "I attack the goblin with my sword"              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Intent Detection Agent                          │
│  Analyzes user input and determines intent:                 │
│  - Combat action                                             │
│  - Movement                                                  │
│  - Dialogue                                                  │
│  - Item use                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Rules Interpreter Agent                         │
│  Validates action against D&D 5E rules:                     │
│  - Check if action is legal                                  │
│  - Determine required rolls                                  │
│  - Calculate modifiers                                       │
│  - Check resource availability (spell slots, etc.)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               Dungeon Master Agent                           │
│  Generates narrative response:                               │
│  - Describes action outcome                                  │
│  - Updates world state                                       │
│  - Generates NPC reactions                                   │
│  - Advances story                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response Output                           │
│    "You swing your sword at the goblin. Roll 1d20+5         │
│     for your attack roll. [Attack Button]"                  │
└─────────────────────────────────────────────────────────────┘
```

### Memory System

The AI maintains persistent memory using vector embeddings and importance scoring:

- **Short-term Memory**: Recent conversation history (last 10-20 messages)
- **Long-term Memory**: Vector embeddings of important events stored in database
- **Working Memory**: Current scene context (location, NPCs present, active combat)
- **Episodic Memory**: Key campaign milestones and character decisions

### Checkpointing

State is persisted using the LangGraph checkpoint system:

```typescript
interface Checkpoint {
  id: string;
  thread_id: string;              // "session-{sessionId}"
  checkpoint_id: string;          // Unique checkpoint ID
  parent_checkpoint_id: string;  // Previous checkpoint
  state: {
    messages: BaseMessage[];     // Conversation history
    worldContext: {              // Current game state
      campaignId: string;
      characterId: string;
      location: string;
      activeNPCs: string[];
    };
  };
  metadata: {
    turnNumber: number;
    lastAction: string;
  };
}
```

**Benefits:**
- Enable conversation history across sessions
- Support for "time travel" (rolling back to previous states)
- Branching storylines (future feature)
- Crash recovery

See [LangGraph Architecture](/home/user/ai-adventure-scribe-main/src/agents/langgraph/ARCHITECTURE.md) for detailed implementation.

---

## Database Architecture

### Schema Overview

```sql
-- Users & Auth (Supabase Auth)
users (managed by Supabase Auth)

-- Characters
characters
  ├── character_abilities
  ├── character_spells
  ├── character_inventory
  └── character_proficiencies

-- Campaigns
campaigns
  ├── campaign_members
  ├── sessions
  │   └── session_messages
  └── world_state

-- Combat
combat_encounters
  ├── combat_participants
  └── combat_turns

-- Spells & Rules
spells
classes
races
backgrounds
conditions

-- AI & Memory
agent_checkpoints
memory_embeddings

-- Observability
error_logs
performance_metrics
```

### Key Design Patterns

#### 1. Row Level Security (RLS)

All tables use RLS policies to ensure users can only access their own data:

```sql
CREATE POLICY "Users can read own characters"
  ON characters FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  USING (auth.uid() = player_id);
```

#### 2. Composite Keys

Related data uses composite foreign keys for referential integrity:

```sql
CREATE TABLE character_spells (
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  spell_id uuid REFERENCES spells(id),
  PRIMARY KEY (character_id, spell_id)
);
```

#### 3. JSONB for Flexible Data

Complex nested data uses JSONB for flexibility:

```sql
CREATE TABLE combat_participants (
  id uuid PRIMARY KEY,
  current_conditions jsonb,  -- Array of condition effects
  temporary_modifiers jsonb, -- Dynamic stat changes
  metadata jsonb             -- Additional combat state
);
```

#### 4. Indexes for Performance

Strategic indexes optimize common queries:

```sql
-- Character lookup by user
CREATE INDEX idx_characters_player_id ON characters(player_id);

-- Session messages by session
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);

-- Spell lookup by class and level
CREATE INDEX idx_spells_class_level ON spells(class, level);
```

See [DATABASE_SCHEMA.md](/home/user/ai-adventure-scribe-main/docs/DATABASE_SCHEMA.md) for complete schema documentation.

---

## API Architecture

### API Versioning Strategy

APIs are versioned to support backward compatibility:

```
/api/v1/characters      # Version 1 API
/api/v2/characters      # Future version (breaking changes)
```

### REST API Endpoints

**Characters:**
- `POST /api/v1/characters` - Create character
- `GET /api/v1/characters` - List user's characters
- `GET /api/v1/characters/:id` - Get character details
- `PUT /api/v1/characters/:id` - Update character
- `DELETE /api/v1/characters/:id` - Delete character

**Campaigns:**
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns` - List user's campaigns
- `GET /api/v1/campaigns/:id` - Get campaign details
- `POST /api/v1/campaigns/:id/sessions` - Start new session

**Combat:**
- `POST /api/v1/combat/encounters` - Start combat
- `POST /api/v1/combat/encounters/:id/actions` - Submit action
- `GET /api/v1/combat/encounters/:id` - Get combat state

**Spells:**
- `GET /api/v1/spells` - List spells (with filters)
- `GET /api/v1/spells/:id` - Get spell details
- `POST /api/v1/spells/validate` - Validate spell casting

### tRPC API

Type-safe alternative to REST using tRPC:

```typescript
// Define procedure
export const characterRouter = router({
  create: protectedProcedure
    .input(CreateCharacterSchema)
    .mutation(async ({ input, ctx }) => {
      return await characterService.create(input, ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await characterService.getById(input.id, ctx.user.id);
    }),
});

// Use on frontend (type-safe!)
const character = await trpc.character.getById.query({ id: '...' });
//    ^ TypeScript knows the exact return type
```

### WebSocket API

Real-time updates for multiplayer features:

```typescript
// Server-side
wss.on('connection', (ws, req) => {
  const sessionId = getSessionId(req);

  ws.on('message', (data) => {
    // Broadcast to all players in session
    broadcastToSession(sessionId, data);
  });
});

// Client-side
const ws = new WebSocket('ws://localhost:8888');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateGameState(update);
};
```

See [FRONTEND_INTEGRATION.md](/home/user/ai-adventure-scribe-main/docs/FRONTEND_INTEGRATION.md) for API usage examples.

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Router
│   ├── AuthPage
│   ├── CharacterCreation
│   │   ├── StepIndicator
│   │   ├── RaceSelection
│   │   ├── ClassSelection
│   │   ├── AbilityScores
│   │   └── SpellSelection
│   ├── CampaignManagement
│   │   ├── CampaignList
│   │   ├── CampaignCard
│   │   └── CreateCampaignDialog
│   ├── GameSession
│   │   ├── SimpleGameChat
│   │   ├── CharacterSheet
│   │   ├── CombatTracker
│   │   └── GameContent
│   └── CharacterSheet
│       ├── AbilitiesTab
│       ├── SpellsTab
│       ├── InventoryTab
│       └── NotesTab
└── Providers
    ├── SupabaseProvider
    ├── TanStackQueryProvider
    ├── ThemeProvider
    └── ToastProvider
```

### State Management Strategy

**Server State (TanStack Query):**
- Character data
- Campaign data
- Spell lists
- Combat state

**Client State (Zustand):**
- UI state (modals, sidebars)
- Form state
- Temporary selections
- User preferences

**Local State (React.useState):**
- Component-specific UI state
- Form inputs
- Transient data

### Component Patterns

#### Container/Presenter Pattern

```typescript
// Container (logic)
function CharacterListContainer() {
  const { data: characters, isLoading } = useCharacters();

  if (isLoading) return <Spinner />;

  return <CharacterListPresenter characters={characters} />;
}

// Presenter (UI only)
function CharacterListPresenter({ characters }: Props) {
  return (
    <div className="grid gap-4">
      {characters.map(char => (
        <CharacterCard key={char.id} character={char} />
      ))}
    </div>
  );
}
```

#### Custom Hooks

```typescript
// Encapsulate complex logic
function useCharacterCreation() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CharacterFormData>({});
  const createMutation = useCreateCharacter();

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  const updateFormData = (data: Partial<CharacterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const submit = async () => {
    await createMutation.mutateAsync(formData);
  };

  return { step, formData, nextStep, prevStep, updateFormData, submit };
}
```

---

## Security Architecture

### Authentication Flow

```
1. User enters credentials
   └─> Supabase Auth
       │
2. Supabase validates
   └─> Returns JWT token
       │
3. Frontend stores token
   └─> localStorage or memory
       │
4. API requests include token
   └─> Authorization: Bearer <token>
       │
5. Backend validates token
   └─> JWT signature verification
       │
6. User identity extracted
   └─> Request context populated
```

### Authorization Layers

**Layer 1: Database (RLS)**
```sql
-- Most critical: enforced at database level
CREATE POLICY "users_read_own" ON characters
  FOR SELECT USING (auth.uid() = player_id);
```

**Layer 2: Backend Middleware**
```typescript
// Secondary validation
router.use(requireAuth);
router.get('/:id', async (req, res) => {
  // Verify ownership through JOIN
  const character = await db
    .from('characters')
    .select('*')
    .eq('id', req.params.id)
    .eq('player_id', req.user.userId)
    .single();
});
```

**Layer 3: Frontend Guards**
```typescript
// UI convenience (not security)
if (!isOwner) {
  return <Redirect to="/unauthorized" />;
}
```

### Input Validation

**Frontend Validation (UX):**
```typescript
const schema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().min(1).max(20),
});

const form = useForm({ resolver: zodResolver(schema) });
```

**Backend Validation (Security):**
```typescript
router.post('/', validateRequest(CreateCharacterSchema), async (req, res) => {
  // Schema validation already passed
  const character = await characterService.create(req.body);
  res.json(character);
});
```

See [SECURITY.md](/home/user/ai-adventure-scribe-main/SECURITY.md) for comprehensive security guidelines.

---

## Performance & Scalability

### Database Optimization

**Query Optimization:**
- Reduced queries by 83-95% through batching and JOINs
- Strategic indexing on foreign keys and lookup columns
- Connection pooling with max 20 connections

**Caching Strategy:**
- TanStack Query caches API responses (5 minutes default)
- Static data (spells, classes) cached longer (1 hour)
- Stale-while-revalidate for better UX

**Batch Operations:**
```typescript
// BAD: N+1 queries
for (const spellId of spellIds) {
  await db.from('spells').select('*').eq('id', spellId).single();
}

// GOOD: Single batch query
const spells = await db
  .from('spells')
  .select('*')
  .in('id', spellIds);
```

### Frontend Performance

**Code Splitting:**
```typescript
// Lazy load heavy components
const GameSession = lazy(() => import('./pages/GameSession'));
const CharacterCreation = lazy(() => import('./pages/CharacterCreation'));
```

**Image Optimization:**
- Use WebP format
- Lazy loading with Intersection Observer
- Responsive images with srcset

**Bundle Optimization:**
- Tree shaking with Vite
- Dynamic imports for routes
- Minification and compression

### Scalability Considerations

**Horizontal Scaling:**
- Stateless backend servers (can run multiple instances)
- Database connection pooling
- Load balancer ready (NGINX/Cloudflare)

**Vertical Scaling:**
- Efficient queries minimize database load
- In-memory caching reduces repeated queries
- Async operations prevent blocking

**Database Scaling:**
- Supabase handles database scaling
- Read replicas for read-heavy workloads
- Partitioning for large tables (future)

See [PERFORMANCE_DASHBOARD.md](/home/user/ai-adventure-scribe-main/docs/PERFORMANCE_DASHBOARD.md) for metrics.

---

## Integration Points

### External Services

**Google Gemini (Primary AI):**
- Story generation
- NPC dialogue
- Rules interpretation
- Fallback to OpenAI/Anthropic on failure

**OpenAI:**
- Embeddings for memory system
- Fallback for story generation
- Vector similarity search

**Anthropic Claude:**
- Alternative AI model
- Better for structured output
- Used for complex rules adjudication

**ElevenLabs:**
- Text-to-speech for narration
- Multiple voice options
- Streaming audio support

**Supabase:**
- PostgreSQL database
- Authentication & authorization
- File storage
- Edge functions

### Service Resilience

**Circuit Breaker Pattern:**
```typescript
const response = await withCircuitBreaker(
  'gemini-api',
  () => gemini.generateContent(prompt),
  {
    failureThreshold: 5,
    resetTimeout: 60000,
  }
);
```

**Fallback Chain:**
```
Gemini → OpenAI → Anthropic → Local fallback
```

**Rate Limiting:**
- Plan-aware limits (Free: 100/min, Pro: 500/min)
- Per-endpoint limits for abuse prevention
- Graceful degradation

---

## Design Decisions

### Why React + Express (not Next.js)?

**Rationale:**
- Separate frontend/backend allows independent scaling
- Express provides more control over backend architecture
- Real-time features (WebSocket) easier to implement
- Can host frontend and backend separately (CDN + server)

### Why Supabase (not custom backend)?

**Rationale:**
- Built-in authentication reduces security risks
- Row Level Security enforced at database level
- Real-time subscriptions out of the box
- Excellent developer experience
- Focus on business logic, not infrastructure

### Why tRPC + REST (not GraphQL)?

**Rationale:**
- tRPC provides type safety without code generation
- REST for public APIs and third-party integrations
- Simpler than GraphQL for our use cases
- No schema definition language to maintain

### Why TanStack Query (not Redux)?

**Rationale:**
- Server state management built-in (caching, invalidation)
- Less boilerplate than Redux
- Automatic background refetching
- Better TypeScript support

### Why Multi-Agent AI (not single model)?

**Rationale:**
- Separation of concerns (storytelling vs rules)
- Better accuracy with specialized agents
- Easier to debug and improve individual agents
- Mimics human GM cognitive process

### Why TypeScript (not JavaScript)?

**Rationale:**
- Catch errors at compile time, not runtime
- Better IDE support (autocomplete, refactoring)
- Self-documenting code with types
- Easier to maintain large codebase

---

## Related Documentation

- [Database Schema](/home/user/ai-adventure-scribe-main/docs/DATABASE_SCHEMA.md) - Complete database documentation
- [Frontend Integration](/home/user/ai-adventure-scribe-main/docs/FRONTEND_INTEGRATION.md) - API usage guide
- [LangGraph Architecture](/home/user/ai-adventure-scribe-main/src/agents/langgraph/ARCHITECTURE.md) - AI agent system details
- [Security Guidelines](/home/user/ai-adventure-scribe-main/SECURITY.md) - Security best practices
- [Performance Monitoring](/home/user/ai-adventure-scribe-main/docs/PERFORMANCE_DASHBOARD.md) - Metrics and optimization
- [Error Handling](/home/user/ai-adventure-scribe-main/docs/ERROR_HANDLING.md) - Error patterns and recovery

---

## Future Architecture Improvements

### Planned Enhancements

1. **Microservices**: Split backend into smaller services
   - Character service
   - Campaign service
   - AI service
   - Rules engine service

2. **Event-Driven Architecture**: Use message queue for async operations
   - RabbitMQ or Redis Pub/Sub
   - Decouple AI processing from API responses
   - Better scalability for long-running operations

3. **CDN Integration**: Serve static assets from CDN
   - Cloudflare or AWS CloudFront
   - Faster load times globally
   - Reduced server bandwidth

4. **Database Sharding**: Partition data by user/campaign
   - Improved performance at scale
   - Better resource isolation
   - Horizontal database scaling

5. **Kubernetes Deployment**: Container orchestration
   - Auto-scaling based on load
   - Better resource utilization
   - Simplified deployments

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
