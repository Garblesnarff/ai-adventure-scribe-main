# GraphQL API Implementation

This document describes the comprehensive GraphQL API implementation for the AI Adventure Scribe platform, providing unified access to all AI and game functionality through a single, type-safe endpoint.

## Overview

The GraphQL implementation replaces multiple REST endpoints and edge functions with a single, powerful API that provides:

- **Unified API**: Single `/graphql` endpoint for all operations
- **Type Safety**: Full TypeScript integration with code generation
- **Real-time Features**: GraphQL subscriptions for streaming AI responses
- **Efficient Queries**: DataLoader pattern for batching and caching
- **Self-documenting**: Introspection and GraphQL Playground
- **Rich Error Handling**: Structured error responses with context

## Architecture

### Server Components

```
server/src/graphql/
├── schema/           # GraphQL schema definitions
├── resolvers/        # Business logic for queries, mutations, subscriptions
├── types/           # TypeScript type definitions
├── loaders/         # DataLoader implementations for batching
├── middleware/      # Authentication and authorization
├── subscriptions/   # PubSub setup for real-time features
└── server.ts        # Apollo Server configuration
```

### Key Features

#### 1. Comprehensive Schema
- **AI Operations**: Chat responses, DM agent execution, rules interpretation
- **Audio Operations**: Text-to-speech generation with voice customization
- **Memory Operations**: Semantic search, storage, and retrieval
- **Campaign Operations**: Creation, management, and AI-generated descriptions
- **Character Operations**: Full character sheet management
- **Rules Operations**: D&D 5e rule lookup and validation

#### 2. Real-time Subscriptions
```graphql
subscription StreamChatResponse($messages: [ChatMessageInput!]!, $sessionId: String!) {
  streamChatResponse(messages: $messages, sessionId: $sessionId) {
    text
    sender
    context
  }
}
```

#### 3. Efficient Data Loading
- DataLoader pattern prevents N+1 query problems
- Automatic batching and caching within request lifecycle
- Optimized for memory, campaign, and character lookups

#### 4. Error Handling
- Structured GraphQL errors with extension codes
- Development vs production error formatting
- Specific error types for different failure scenarios

## API Usage

### Queries

#### Memory Search
```graphql
query SearchMemories($input: MemorySearchInput!) {
  searchMemories(input: $input) {
    memories {
      id
      content
      type
      importance
      created_at
    }
    totalCount
    relevanceScores
  }
}
```

#### Campaign Management
```graphql
query GetCampaigns($userId: String!) {
  getCampaigns(userId: $userId) {
    id
    name
    description
    genre
    thematic_elements
  }
}
```

### Mutations

#### AI Chat Response
```graphql
mutation GenerateChatResponse(
  $messages: [ChatMessageInput!]!
  $sessionId: String!
  $context: JSON
) {
  generateChatResponse(messages: $messages, sessionId: $sessionId, context: $context) {
    text
    sender
    context
    metadata
  }
}
```

#### DM Agent Execution
```graphql
mutation ExecuteDMAgent(
  $task: TaskInput!
  $agentContext: AgentContextInput!
  $voiceContext: VoiceContextInput
  $combatContext: CombatContextInput
) {
  executeDMAgent(
    task: $task
    agentContext: $agentContext
    voiceContext: $voiceContext
    combatContext: $combatContext
  ) {
    response
    narrationSegments {
      text
      voice_id
      voice_settings {
        stability
        similarity_boost
      }
    }
  }
}
```

## Frontend Integration

### Apollo Client Setup
```typescript
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';

// Configured with authentication, error handling, and WebSocket support
export const apolloClient = new ApolloClient({
  link: splitLink, // Routes queries/mutations to HTTP, subscriptions to WebSocket
  cache: new InMemoryCache({
    typePolicies: {
      // Optimized caching strategies for different entity types
    }
  })
});
```

### React Hooks
```typescript
const { sendMessage, messages, isLoading } = useGraphQLChat({
  sessionId: 'session-123',
  enableRealTime: true
});

// Send a message and get streaming response
await sendMessage('I want to explore the ancient ruins');
```

### Code Generation
```bash
npm run codegen  # Generate TypeScript types from GraphQL schema
```

## Performance Features

### DataLoader Batching
- **Memory Loader**: Batch loads memories by ID
- **Session Memory Loader**: Loads all memories for multiple sessions
- **User Campaign Loader**: Loads campaigns for multiple users
- **Character Loader**: Efficiently loads character data

### Caching Strategy
- **Query-level**: Cache-and-network policy for real-time data
- **Entity-level**: Normalized cache with merge strategies
- **Subscription**: Real-time updates invalidate relevant cache entries

### Query Complexity Analysis
- Depth limiting prevents deeply nested queries
- Cost analysis prevents expensive operations
- Rate limiting and query timeout protection

## Security Features

### Authentication
- JWT token extraction from Authorization header
- Supabase integration for user authentication
- Context-based authorization in resolvers

### Validation
- Input validation using GraphQL schema
- Query depth and complexity limits
- Rate limiting for expensive operations

### Error Handling
- Sanitized error messages in production
- Detailed error context in development
- Specific error codes for client handling

## Monitoring and Debugging

### Development Tools
- GraphQL Playground for interactive queries
- Apollo Studio integration for schema inspection
- Real-time query monitoring and profiling

### Logging
- Structured logging for all GraphQL operations
- Performance metrics for resolver execution
- Error tracking with stack traces

## API Endpoints

### HTTP GraphQL
- **Development**: `http://localhost:4000/graphql`
- **Production**: `https://your-domain.com/graphql`

### WebSocket Subscriptions
- **Development**: `ws://localhost:4000/graphql`
- **Production**: `wss://your-domain.com/graphql`

### Health Check
- **Endpoint**: `/health`
- **Returns**: Server status, uptime, and configuration

## Migration from Edge Functions

This GraphQL implementation provides equivalent functionality to the following edge functions:

- ✅ `chat-ai` → `generateChatResponse` mutation
- ✅ `dm-agent-execute` → `executeDMAgent` mutation  
- ✅ `rules-interpreter-execute` → `executeRulesInterpreter` mutation
- ✅ `text-to-speech` → `generateSpeech` mutation
- ✅ `generate-embedding` → `generateEmbedding` mutation
- ✅ `generate-campaign-description` → `generateCampaignDescription` mutation

### Benefits of GraphQL Migration

1. **Single Endpoint**: Replace 6+ edge functions with 1 GraphQL endpoint
2. **Type Safety**: Full TypeScript integration with automatic type generation
3. **Real-time**: Native subscription support for streaming AI responses
4. **Efficiency**: DataLoader batching eliminates N+1 queries
5. **Flexibility**: Clients request exactly the data they need
6. **Developer Experience**: Self-documenting schema with introspection
7. **Error Handling**: Rich, structured error responses with context
8. **Caching**: Intelligent caching at query, entity, and field levels

## Getting Started

### Start GraphQL Server
```bash
npm run graphql:dev  # Development server with hot reload
npm run graphql:start  # Production server
```

### Generate Types
```bash
npm run codegen  # Generate TypeScript types from schema
```

### Test Queries
Open `http://localhost:4000/graphql` in your browser to access GraphQL Playground for interactive testing.

## Future Enhancements

- [ ] GraphQL Federation for microservices architecture
- [ ] Advanced caching with Redis for production deployments
- [ ] Query whitelisting for production security
- [ ] Automatic persisted queries for performance
- [ ] GraphQL schema stitching for external API integration