# CrewAI Service

## Overview

This is a **Python FastAPI service** that provides D&D Dungeon Master functionality for the main AI Adventure Scribe application. 

**Important**: This is currently a *heuristic D&D DM service* rather than true multi-agent CrewAI coordination. The service provides structured responses with dice roll handling and skill parsing.

## Current Functionality

### Working Features
- **D&D Skill Detection**: Automatically detects skill checks (stealth, perception, athletics, etc.)
- **Dice Roll Parsing**: Handles player dice roll results and provides outcomes
- **Combat Flow**: Supports attack rolls, saving throws, and initiative
- **Structured Responses**: Returns narration segments and roll requests in a standardized format
- **Fallback Logic**: Works without external APIs using hardcoded heuristics

### Rate Endpoints
- `POST /dm/respond` - Generate DM response to player messages
- `POST /dm/options` - Generate 3 lettered options for player choices
- `GET /health` - Health check endpoint

## Architecture

### Current Implementation
```
┌─────────────────┐    HTTP    ┌──────────────────┐
│ Main App (TS)   │◀──────────▶│ CrewAI Service   │
│                 │            │ (Python)         │
│ - ai-service.ts │            │ - main.py        │
│ - crewai-client │            │ - heuristic DM   │
└─────────────────┘            └──────────────────┘
```

### Multi-Agent Status
The agents in `crewai_app/agents.py` are currently **stubs**:
- `NarrativeDirector` - Returns placeholder text
- `RulesArbiter` - Returns placeholder text  
- `ContinuityScribe` - Returns placeholder text

**Future Enhancement**: These could be replaced with true CrewAI agents for coordinated multi-agent storytelling.

## Development

### Running the Service
```bash
# From project root
npm run dev:crewai

# Or directly
cd crewai-service
.venv/bin/uvicorn main:app --reload --port 8000
```

### Environment Variables
- `OPENROUTER_API_KEY` - Optional: For enhanced AI responses
- `OPENROUTER_MODEL` - Optional: Custom model selection
- `OPENROUTER_SITE_URL` - Optional: Referer for OpenRouter
- `OPENROUTER_TITLE` - Optional: App title for OpenRouter
- `INLINE_OPTIONS` - Optional: Enable inline options (true/false)

### Testing
```bash
cd crewai-service
.venv/bin/python -m pytest tests/
```

## Integration with Main App

The service integrates with the main TypeScript application through:

1. **CrewAIClient** (`src/services/crewai/crewai-client.ts`)
   - HTTP client for API communication
   - Handles timeouts and error cases

2. **AgentOrchestrator** (`src/services/crewai/agent-orchestrator.ts`)
   - Validates and normalizes responses
   - Provides type safety for the UI

3. **StateAdapter** (`src/services/crewai/state-adapter.ts`)
   - Converts between app state and CrewAI payload format

## Response Format

```typescript
{
  text: string,                    // Main DM response text
  narration_segments?: [{          // Structured narration parts
    type: 'dm' | 'character' | 'transition',
    text: string,
    character?: string,
    voice_category?: string
  }],
  roll_requests?: [{              // Dice roll prompts
    type: 'check' | 'save' | 'attack' | 'damage' | 'initiative',
    formula?: string,
    purpose?: string,
    dc?: number,
    ac?: number,
    advantage?: boolean,
    disadvantage?: boolean
  }]
}
```

## Future Development Paths

### Option 1: Keep Current (Recommended)
- Maintain simple heuristic service (low complexity, good value)
- Add more skill detection rules
- Improve narrative variety

### Option 2: True Multi-Agent CrewAI
- Replace stub agents with coordinated CrewAI agents
- Implement agent communication and memory sharing
- Higher complexity but more sophisticated storytelling

### Option 3: Remove External Service
- Move heuristic logic into main TypeScript service
- Simpler deployment (single service)
- Lose some Python D&D logic flexibility

## Dependencies

- **FastAPI**: Web framework
- **Pydantic**: Data validation
- **httpx**: HTTP client (for OpenRouter integration)
- **uvicorn**: ASGI server

## Team Notes

- This service was originally planned as a full CrewAI multi-agent system
- The complex multi-agent implementation was moved to `archive/` and later removed
- Current implementation provides good baseline D&D DM functionality
- Consider true multi-agent approach only if additional storytelling sophistication is needed
