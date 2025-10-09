# Dungeon Master Agent Droid

## Description
AI Dungeon Master agent that guides gameplay, manages game state, coordinates responses, interacts with memory, and communicates with other agents.

## Purpose
To serve as the core game master for D&D campaigns by:
- Managing game state and narrative flow
- Generating engaging responses to player actions
- Coordinating with other agents (rules interpreter, etc.)
- Maintaining memory of campaign events
- Providing immersive storytelling experiences

## Key Capabilities
- Game state management and tracking
- Narrative response generation
- Memory management for campaign continuity
- Agent communication and coordination
- Character and environment description
- Dialogue generation
- Opportunity and action suggestion

## Dependencies
- AgentMessagingService for inter-agent communication
- ResponseCoordinator for response orchestration
- EnhancedMemoryManager for memory persistence
- CampaignContextProvider for campaign context
- ConversationStateStore for conversation tracking
- ErrorHandlingService for error management

## Usage
```bash
task-cli --subagent-type dungeon-master-agent "Guide players through combat encounter with goblins"
```

## Example Tasks
- "Player attacks the goblin with their longsword"
- "Party enters the ancient dungeon chamber"
- "NPC wants to negotiate with the players"
- "Describe the atmosphere of the enchanted forest"

## Configuration
The agent initializes with default game state and can be customized through task context parameters.

## Error Handling
Implements comprehensive error handling with retry logic and graceful degradation for network failures.
