# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
```bash
npm run dev              # Start Vite development server
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

### Backend Development  
```bash
npm run server:dev       # Start backend dev server with ts-node-dev
npm run server:build     # Compile TypeScript to JavaScript
npm run server:start     # Run compiled server
npm run server:migrate   # Run database migrations
npm run server:seed      # Seed database with test data
```

### Testing
```bash
npm run server:test      # Run backend tests with Vitest
# Frontend tests use Vitest with jsdom environment (configured in vitest.config.ts)
```

## Architecture Overview

This is a full-stack D&D platform with a sophisticated multi-agent AI Dungeon Master system:

### Frontend (React + TypeScript)
- **Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI
- **State Management**: TanStack Query, React Context
- **Architecture**: Component-based with context providers for character and campaign data

### Backend (Node.js + Express)
- **Tech Stack**: Express, TypeScript, PostgreSQL (via Supabase), WebSocket support
- **Location**: `server/` directory with separate TypeScript config
- **API Structure**: RESTful API with versioned routes (`/v1/`)

### AI Agent System
The core innovation is a multi-agent AI system located in `src/agents/`:

#### Key Components
- **Dungeon Master Agent** (`dungeon-master-agent.ts`): Primary storytelling and game coordination
- **Rules Interpreter Agent** (`rules-interpreter-agent.ts`): D&D 5E rule enforcement and validation
- **CrewAI Integration** (`crewai/`): Multi-agent orchestration and task coordination
- **Messaging System** (`messaging/`): Production-grade agent communication with offline support, message queuing, and synchronization
- **Memory Management** (`services/memory/`): Persistent episodic memory with vector embeddings for semantic retrieval

#### Agent Communication Architecture
- Asynchronous messaging between agents via `AgentMessagingService`
- Offline-first design with IndexedDB persistence
- Message acknowledgment, retry logic, and conflict resolution
- State synchronization across agent interactions

### AI Integrations
- **Google Gemini**: Primary LLM for agent reasoning
- **OpenAI**: Embeddings for semantic memory retrieval
- **ElevenLabs**: Text-to-speech for immersive narration
- **Supabase**: Authentication, database, and real-time features

### Code Standards
This codebase follows specific standards outlined in `CODE_STANDARDS.md`:
- Files should be under 200 lines
- Every directory requires a README.md
- Use descriptive naming: kebab-case for files, camelCase for functions, PascalCase for classes
- Extensive documentation with JSDoc comments
- Type safety with TypeScript throughout

### Memory System
The AI agents implement sophisticated memory management:
- **Episodic Memory**: Long-term storage of campaign events, character interactions, and plot developments
- **Semantic Retrieval**: Vector embeddings enable contextually relevant memory recall
- **Memory Classification**: Events are categorized by importance and type for efficient retrieval

### Key Directories
- `src/agents/`: Multi-agent AI system core
- `src/components/`: React UI components with Shadcn
- `server/src/`: Backend API and services
- `server/src/routes/v1/`: API endpoints for auth, campaigns, characters, sessions, billing, AI

### Database
- **Primary**: Supabase (PostgreSQL) for user data, campaigns, characters, sessions
- **Local**: IndexedDB for agent message persistence and offline capability

### WebSocket Integration
Real-time features implemented via `server/src/ws.ts` for live gameplay sessions.

---

## Documentation & Build-in-Public Strategy

### Documentation Sub-Agent
Use the `doc-builder` sub-agent for all documentation tasks:
```bash
claude --use-agent doc-builder "Document [specific task or milestone]"
```

**The doc-builder agent specializes in:**
- Capturing technical insights and unexpected discoveries
- Creating X posts (1-2 paragraphs) about development breakthroughs  
- Generating comprehensive technical blog posts
- Tracking performance metrics and optimizations
- Positioning you as the expert in "AI-powered multi-agent systems for persistent RPG worlds"

### Daily Documentation Workflow

#### After Every Development Session:
1. **Capture Discovery**: What unexpected challenge or insight emerged?
2. **Record Metrics**: Performance improvements, query speeds, costs
3. **Generate X Post**: Use `/x-insight` command for 1-2 paragraph posts
4. **Update BUILD_LOG**: Use `/progress-report` command with metrics
5. **Track Phase Progress**: Monitor advancement through 9-phase roadmap

#### Custom Slash Commands Available:
- `/x-insight [topic]` - Generate daily X post about technical discoveries
- `/blog-post [topic]` - Create comprehensive technical blog post
- `/progress-report [milestone]` - Update BUILD_LOG with current progress  
- `/linkedin-update [milestone]` - Professional milestone announcements

### Build-in-Public Content Strategy

#### X Platform Focus (Based on X Product Lead Guidance):
- **Medium-form posts**: 1-2 paragraphs, under 5 sentences
- **Daily consistency**: One specific technical insight per day
- **Subject matter expertise**: Multi-agent AI systems for persistent RPG worlds
- **Concrete metrics**: Always include before/after numbers
- **Unexpected discoveries**: Share surprising challenges and clever solutions

#### Content Types to Rotate:
- **Performance Wins**: "Reduced memory queries from 500ms to 12ms by..."
- **Multi-Agent Insights**: "Solved agent message sync by implementing..."  
- **D&D Rule Challenges**: "Turns out handling multi-generational NPCs requires..."
- **Persistent World Discoveries**: "When a player returns after 200 years..."
- **Architecture Breakthroughs**: "Our agent messaging queue now handles..."

### Automation Scripts

#### `scripts/doc-generator.js` Commands:
```bash
# Generate daily X insight
node scripts/doc-generator.js daily-insight "multi-agent coordination"

# Update progress tracking  
node scripts/doc-generator.js progress-update "Memory system optimization"

# Mark phase complete
node scripts/doc-generator.js phase-complete 1

# Generate metrics report
node scripts/doc-generator.js metrics

# Create blog post draft
node scripts/doc-generator.js blog-draft "persistent-worlds-architecture"
```

### Documentation Requirements

#### After EVERY Task:
1. Update `docs/progress/BUILD_LOG.md` with technical details
2. Document performance metrics and improvements
3. Capture unexpected challenges and solutions
4. Generate X post about key discoveries
5. Commit changes with descriptive messages

#### After EVERY Phase:
1. Generate comprehensive blog post using `/blog-post` command
2. Create X thread summarizing major achievements
3. Update LinkedIn with professional milestone
4. Document lessons learned and next steps
5. Tag phase completion in git

### Key Metrics to Track & Document

#### Performance Targets by Phase:
- **Phase 1**: World memory retrieval < 100ms
- **Phase 4**: Semantic memory search < 50ms  
- **Phase 7**: 60fps with 10,000+ 3D objects
- **Phase 9**: Cost < $0.05 per session

#### Development Metrics:
- Lines of code and architecture decisions
- Database query optimization results
- Multi-agent coordination improvements
- AI cost reduction strategies
- User experience enhancements

### Content Calendar by Phase

**Phase 1-2**: Persistent worlds & database architecture insights
**Phase 3**: Timeline evolution & consequence propagation discoveries
**Phase 4-5**: Memory systems & fiction generation breakthroughs
**Phase 6-7**: Visual generation & 3D rendering optimizations
**Phase 8-9**: World simulation & technical scaling achievements

### Success Metrics

#### Build-in-Public Goals:
- **Daily X posts**: Technical insights with specific metrics
- **Weekly blog posts**: Comprehensive phase documentation
- **Monthly milestones**: Phase completions with measurable results
- **Community building**: Position as expert in AI game development
- **Technical authority**: 1000+ followers learning from your journey

### Hashtag Strategy
Always include: `#BuildInPublic #AIAgents #DnD #GameDev #MultiAgent`

Rotate based on content: `#Performance #MemoryArchitecture #WebGL #TechInnovation #PersistentWorlds`

---

## Sub-Agent Integration

### Proactive Documentation
The `doc-builder` sub-agent is configured to **automatically activate** when significant development occurs. It will:

- ✅ **Monitor file changes** and detect new features
- ✅ **Analyze performance improvements** and technical breakthroughs  
- ✅ **Generate X posts** about discoveries without interrupting development
- ✅ **Update BUILD_LOG** with progress and metrics
- ✅ **Publish to X** using the X MCP server integration

### Expected Workflow
1. **You work on development**: "Implement persistent world database schema"
2. **Claude Code builds features**: Creates migrations, APIs, tests
3. **doc-builder activates automatically**: Detects significant changes
4. **Auto-documentation happens**: X post created and published, BUILD_LOG updated
5. **You continue development**: Seamless, non-interrupting workflow

### Manual Triggers (When Needed)
```bash
# Force documentation of current session
claude --use-agent doc-builder "Document current development session and post to X"

# End-of-day comprehensive update
claude --use-agent doc-builder "Create comprehensive update about today's Phase 1 progress and publish to X"
```

## Remember: Document Everything
You're not just building a product - you're creating a comprehensive technical record of building the world's first AI-powered persistent universe platform. The doc-builder sub-agent will help capture every challenge solved as content, every optimization as a teachable moment, and every breakthrough as industry innovation worth sharing.

**The sub-agent works alongside you, not interrupting your flow, but ensuring nothing worth sharing gets missed.**