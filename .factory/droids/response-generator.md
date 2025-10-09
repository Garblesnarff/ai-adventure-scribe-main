# Response Generator Droid

## Description
Service responsible for generating coordinated, contextually-rich responses for the AI Dungeon Master system.

## Purpose
To create immersive and engaging game responses by:
- Coordinating multiple response components
- Generating environment descriptions
- Creating character dialogues and interactions
- Producing narrative opportunities for players
- Managing response pipeline and orchestration

## Key Capabilities
- Multi-component response coordination
- Environment and atmosphere description
- Character dialogue generation
- NPC interaction creation
- Opportunity and action suggestion
- Narrative flow management

## Dependencies
- ResponseCoordinator for orchestration
- ResponsePipeline for processing
- EnvironmentGenerator for scene description
- DialogueGenerator for character speech
- CharacterInteractionGenerator for NPC behavior
- OpportunityGenerator for player choices

## Usage
```bash
task-cli --subagent-type response-generator "Create response for player entering tavern"
```

## Example Tasks
- "Generate mysterious forest atmosphere description"
- "Create dialogue for suspicious shopkeeper"
- "Describe combat encounter with bandits"
- "Generate social interaction opportunities"
- "Create environment description for ancient ruins"

## Configuration
Can be configured for different response styles, tones, and complexity levels.

## Integration
Works as the core response generation system for the Dungeon Master Agent.

## Features
- Modular response component system
- Context-aware generation
- Style and tone adaptation
- Multi-character dialogue support
- Dynamic opportunity creation
