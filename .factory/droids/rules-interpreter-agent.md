# Rules Interpreter Agent Droid

## Description
Agent that interprets and enforces D&D 5E game rules, validates player actions, and processes rule results.

## Purpose
To ensure accurate interpretation and application of fantasy RPG rules by:
- Validating player actions against game rules
- Processing rule interpretation results
- Communicating with other agents about rule compliance
- Providing rule guidance and explanations

## Key Capabilities
- Rule validation and checking
- Action verification against game mechanics
- Results processing and formatting
- Agent communication for rule enforcement
- Edge function integration for complex rule calculations

## Dependencies
- ValidationService for rule checking
- ValidationResultsProcessor for result processing
- AgentMessagingService for inter-agent communication
- EdgeFunctionCaller for server-side rule processing
- ErrorHandlingService for error management

## Usage
```bash
task-cli --subagent-type rules-interpreter-agent "Validate player's attack roll against goblin's AC"
```

## Example Tasks
- "Check if player can cast fireball spell"
- "Validate stealth check for hiding from guard"
- "Process damage calculation for critical hit"
- "Determine if action is legal per 5E rules"

## Configuration
The agent uses comprehensive rule validation services and can be configured for different rule sets or house rules.

## Error Handling
Implements robust error handling with retry mechanisms and fallback rule interpretations.

## Integration
Communicates with the Dungeon Master Agent to provide rule validation and guidance during gameplay.
