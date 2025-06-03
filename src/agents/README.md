# Agents Module

This directory contains the core AI agent implementations, interfaces, and supporting services for the AI Dungeon Master system.

## Purpose

To encapsulate all logic related to autonomous agents, including the Dungeon Master, rules interpreter, messaging between agents, error handling, and shared agent services.

## Structure and Important Files

- **`dungeon-master-agent.ts`**  
  Main Dungeon Master agent class responsible for guiding gameplay, managing game state, and generating narrative responses.

- **`rules-interpreter-agent.ts`**  
  Agent that interprets and enforces game rules, assists the DM agent.

- **`crewai/`**  
  CrewAI integration components and adapters.

- **`messaging/`**  
  Messaging services enabling communication between agents.

- **`error/`**  
  Error handling types and services for agent operations.

- **`services/`**  
  Shared services used by agents, such as response generation and memory management.

- **`types.ts`**  
  Shared agent-related type definitions.

## How Components Interact

- The **DungeonMasterAgent** coordinates gameplay, delegating rule checks to the **RulesInterpreterAgent**.
- Agents communicate asynchronously via the **AgentMessagingService**.
- Errors are captured and managed by the **ErrorHandlingService**.
- Shared services provide memory management and response generation.

## Usage Example

Instantiate and execute a DM agent task:

```typescript
import { DungeonMasterAgent } from './dungeon-master-agent';

const dmAgent = new DungeonMasterAgent();
const result = await dmAgent.executeTask({
  description: 'Player attacks the goblin',
  context: { sessionId: 'abc123', campaignId: 'xyz789' }
});
console.log(result);
```

## Notes

- See subdirectory README.md files for more details on CrewAI, messaging, and error handling.
- Agents are designed to be modular and composable.
