# Shared Agent Services Module

## Purpose

This directory provides a collection of shared services that are utilized by various AI agents (like `DungeonMasterAgent` and `RulesInterpreterAgent`) to perform common tasks. These services encapsulate specific functionalities, promoting code reuse and separation of concerns.

## Structure and Important Files

- **`campaign/`**: Services related to campaign data and context.
    - **`CampaignContextProvider.ts`**: Provides access to campaign details, potentially loading them from a database or cache.
    - **`CampaignContextLoader.ts` / `campaign-context-loader.ts`**: Likely responsible for fetching and structuring campaign context.
    - **`character-loader.ts`**: Handles loading of character data relevant to a campaign.
- **`conversation/`**: Services for managing conversation state.
    - **`ConversationStateManager.ts`**: Tracks the state of conversations, possibly including history, active topics, or emotional tone.
- **`intent/`**: Services for understanding player intent.
    - **`PlayerIntentDetector.ts`**: Detects the intent behind player messages (e.g., dialogue, exploration, combat).
- **`memory/`**: Services related to agent memory management.
    - **`MemoryManager.ts` / `EnhancedMemoryManager.ts`**: Core services for creating, retrieving, and managing agent memories.
    - **`memory-loader.ts`**: Specialized for loading memories.
- **`response/`**: Services involved in generating and structuring AI responses.
    - **`ResponseCoordinator.ts`**: Orchestrates various generators and services to produce a complete AI DM response.
    - **`CharacterInteractionGenerator.ts`**: Generates NPC interactions, dialogue, and reactions. (Files with and without hyphen might be duplicates or variations)
    - **`EnvironmentGenerator.ts`**: Generates descriptions of the game environment.
    - **`MechanicsGenerator.ts`**: Generates information related to game mechanics and rules application in responses.
    - **`OpportunityGenerator.ts`**: Identifies and presents potential actions or plot hooks to the player.
    - Subdirectories like `dialogue/`, `npc/`, `reactions/` contain more specialized generators.
- **`dm-response-generator.ts`**: A high-level generator, possibly a precursor or wrapper around the services in `response/`, specifically for creating the DM's narrative.

## How Components Interact

- Agents (e.g., `DungeonMasterAgent`) delegate tasks to these services. For instance, when generating a response, the `DungeonMasterAgent` might use `ResponseCoordinator.ts`.
- `ResponseCoordinator.ts` would then invoke various generators from `response/` (like `EnvironmentGenerator`, `CharacterInteractionGenerator`) and potentially use `PlayerIntentDetector.ts` and `ConversationStateManager.ts` to tailor the response.
- `CampaignContextProvider.ts` and `MemoryManager.ts` provide necessary data and context to other services and agents.
- These services are designed to be relatively independent, allowing them to be composed or replaced as needed.

## Usage Example

```typescript
// Conceptual example within an Agent class:
import { ResponseCoordinator } from './response/ResponseCoordinator';
import { PlayerIntentDetector } from './intent/PlayerIntentDetector';

class MyAgent {
  private responseCoordinator: ResponseCoordinator;
  private intentDetector: PlayerIntentDetector;

  constructor(campaignId: string, sessionId: string) {
    this.responseCoordinator = new ResponseCoordinator();
    // Initialization of responseCoordinator might be needed, e.g., this.responseCoordinator.initialize(campaignId, sessionId);
    this.intentDetector = new PlayerIntentDetector();
  }

  public async handlePlayerInput(input: string, context: any) {
    const intent = this.intentDetector.detectIntent(input);
    // ... further logic ...
    
    // const agentTask = { description: input, context: { ...context, intent } };
    // const agentResult = await this.responseCoordinator.generateResponse(agentTask);
    // return agentResult.data.narrativeResponse; // Or similar
  }
}
```

## Notes

- This directory is central to the agent's operational logic, abstracting complex tasks into manageable services.
- The granularity of services (e.g., separate generators for environment, characters, mechanics) allows for modularity and easier testing of individual components.
- See the main `/src/agents/README.md` for the overall agent architecture.
