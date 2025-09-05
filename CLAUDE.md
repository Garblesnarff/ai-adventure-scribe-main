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