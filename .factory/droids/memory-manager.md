# Memory Manager Droid

## Description
Comprehensive memory management service for AI agents that handles storage, retrieval, and organization of campaign memories.

## Purpose
To provide persistent memory capabilities for the AI Dungeon Master system by:
- Storing episodic memories of campaign events
- Retrieving contextually relevant memories
- Managing memory importance and categorization
- Supporting semantic search through embeddings
- Maintaining conversation history and character development

## Key Capabilities
- Episodic memory storage and retrieval
- Semantic search using vector embeddings
- Memory importance scoring and prioritization
- Character and location memory tracking
- Conversation state management
- Scene state tracking and context maintenance

## Dependencies
- EnhancedMemoryManager for advanced memory operations
- MemoryRepository for data persistence
- MemoryImportanceService for memory scoring
- SceneStateTracker for context tracking
- Vector embedding service for semantic search

## Usage
```bash
task-cli --subagent-type memory-manager "Store player's heroic battle against dragon in memory"
```

## Example Tasks
- "Store important dialogue with the king"
- "Retrieve memories about the ancient artifact"
- "Find relevant memories for current location"
- "Track character development over campaign"
- "Manage scene transitions and context"

## Configuration
Supports different memory timeframes (recent, session, campaign) and importance levels.

## Integration
Works closely with the Dungeon Master Agent to provide contextual memories for response generation.

## Features
- Automatic importance scoring
- Semantic similarity matching
- Temporal memory organization
- Character relationship tracking
- Location-based memory clustering
