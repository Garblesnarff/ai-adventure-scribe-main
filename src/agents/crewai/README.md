# CrewAI Integration Module

## Purpose

This directory integrates CrewAI concepts and provides a framework for defining and managing AI agents, tasks, and tools within a crew-like structure. It facilitates complex interactions and collaborative task execution among different AI agent specializations (e.g., Dungeon Master, Rules Interpreter).

## Structure and Important Files

- **`dungeon-master-agent.ts`**: Defines the CrewAI-style Dungeon Master agent, its role, goals, and specific tools.
- **`rules-interpreter-agent.ts`**: Defines the CrewAI-style Rules Interpreter agent, responsible for game rule understanding and validation.
- **`adapters/`**: Contains adapters for integrating existing services or types with the CrewAI framework (e.g., `memory-adapter.ts`).
- **`handlers/`**: Includes handlers for specific CrewAI interactions, like message processing (`message-handler.ts`).
- **`memory/`**: Manages memory for CrewAI agents, potentially with specialized memory managers for different roles (e.g., `dm-memory-manager.ts`, `rules-memory-manager.ts`).
- **`services/`**: Provides services tailored for the CrewAI setup, such as message routing and state updates (e.g., `message-handler-service.ts`, `query-router-service.ts`, `state-update-service.ts`).
- **`tasks/`**: Defines task execution logic for CrewAI agents (e.g., `dm-task-executor.ts`, `rules-task-executor.ts`).
- **`tools/`**: Contains tools that CrewAI agents can use to perform actions or retrieve information (e.g., `dm-agent-tools.ts`, `rules-interpreter-tools.ts`).
- **`types/`**: Holds all TypeScript type definitions specific to the CrewAI integration (e.g., `messages.ts`, `tasks.ts`).
- **`utils/`**: Utility functions supporting the CrewAI framework (e.g., `state-validator.ts`).

## How Components Interact

- `dungeon-master-agent.ts` and `rules-interpreter-agent.ts` are the primary agents.
- They utilize services from `services/` for communication and state management.
- Tasks defined in `tasks/` are executed by these agents using tools from `tools/`.
- `memory/` components provide memory capabilities to the agents.
- `handlers/` and `adapters/` ensure smooth data flow and integration.

## Usage Example

```typescript
// Conceptual example of using a CrewAI agent
import { DungeonMasterAgent } from './dungeon-master-agent';
import { DMTaskExecutor } from './tasks/dm-task-executor';

const dmAgent = new DungeonMasterAgent();
const taskExecutor = new DMTaskExecutor(dmAgent); // Simplified

// Assuming a task is defined and needs execution
const taskToExecute = { type: 'NARRATE_SCENE', details: 'Player enters a dark cave.' };
const result = await taskExecutor.execute(taskToExecute);

console.log(result);
```

## Notes

This structure aims to emulate the CrewAI framework's organization, allowing for clear separation of concerns and extensibility when adding more specialized agents or tools. Refer to the main `/src/agents/README.md` for how these CrewAI agents might fit into the broader agent system.
