# Player Intent Detector Droid

## Description
Service that analyzes player input to detect and categorize player intentions for appropriate game responses.

## Purpose
To understand player actions and intentions by:
- Analyzing natural language player input
- Categorizing intent types (combat, social, exploration, etc.)
- Extracting action parameters and targets
- Providing structured intent data for other agents
- Supporting context-aware intent interpretation

## Key Capabilities
- Natural language intent recognition
- Action categorization and classification
- Parameter extraction from player input
- Context-aware intent resolution
- Confidence scoring for intent detection

## Dependencies
- PlayerIntentDetector core service
- Contextual analysis tools
- Pattern matching and NLP services
- Game state integration

## Usage
```bash
task-cli --subagent-type player-intent-detector "Analyze player intent for 'I want to attack the goblin with my sword'"
```

## Example Tasks
- "Detect combat intent from player dialogue"
- "Parse social interaction intentions"
- "Identify exploration and search actions"
- "Extract spell casting parameters"
- "Analyze negotiation or persuasion attempts"

## Configuration
Can be trained on specific player groups and campaign styles for improved accuracy.

## Integration
Provides structured intent data to the Dungeon Master Agent for appropriate response generation.

## Features
- Multi-intent detection
- Contextual disambiguation
- Fuzzy matching capabilities
- Real-time intent processing
- Confidence-based validation
