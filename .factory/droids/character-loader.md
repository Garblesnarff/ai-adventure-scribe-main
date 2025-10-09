# Character Loader Droid

## Description
Service responsible for loading, managing, and providing character data for the AI Dungeon Master system.

## Purpose
To handle character information and data by:
- Loading player and NPC character data
- Managing character sheets and statistics
- Tracking character status and conditions
- Providing character context for responses
- Supporting character development tracking

## Key Capabilities
- Character data loading and caching
- Status and condition tracking
- Character relationship management
- Statistics and abilities access
- Character history and development tracking

## Dependencies
- CharacterLoader service
- Database integration for character storage
- Character state management systems
- Campaign context providers

## Usage
```bash
task-cli --subagent-type character-loader "Load party character data for current session"
```

## Example Tasks
- "Load player character sheets"
- "Update character status after combat"
- "Track character injuries and conditions"
- "Manage NPC character data"
- "Handle character level progression"

## Configuration
Supports different game systems and character sheet formats.

## Integration
Provides character data to the Dungeon Master Agent and Rules Interpreter Agent.

## Features
- Cached data access for performance
- Real-time status updates
- Character relationship mapping
- History and development tracking
- Multi-system support
