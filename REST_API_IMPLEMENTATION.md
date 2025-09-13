# RESTful API Implementation (v3)

A comprehensive RESTful API following Richardson Maturity Model Level 3 with full HATEOAS support, designed for enterprise-grade D&D campaign management.

## 🌟 Key Features

### Richardson Maturity Model Level 3
- **Level 0**: HTTP as transport mechanism ✅
- **Level 1**: Individual resources with unique URIs ✅
- **Level 2**: Proper HTTP methods and status codes ✅
- **Level 3**: HATEOAS (Hypermedia as the Engine of Application State) ✅

### Enterprise-Grade Features
- 🔗 **HATEOAS**: Full hypermedia support with HAL+JSON
- 📊 **Advanced Filtering**: Comprehensive query parameters for all resources
- 📄 **Pagination**: Cursor-based and offset-based pagination
- 💾 **Caching**: ETags, conditional requests, and intelligent cache management
- ✅ **Validation**: JSON Schema validation for all requests/responses
- 🚨 **Error Handling**: RFC 7807 Problem Details for HTTP APIs
- 🔄 **Content Negotiation**: Multiple response formats
- ⚡ **Performance**: Sparse fieldsets and optimistic updates
- 🔄 **Batch Operations**: Efficient bulk resource operations
- ⏱️ **Rate Limiting**: Per-resource rate limits with retry guidance

## 📁 Architecture Overview

```
server/src/
├── routes/v3/                    # API v3 routes
│   ├── conversations/           # Conversations resource
│   │   ├── index.ts            # Router with nested resources
│   │   ├── conversations-resource.ts  # Main resource logic
│   │   └── messages-resource.ts # Nested messages resource
│   └── index.ts                # Main v3 router
├── lib/
│   ├── rest/                   # REST infrastructure
│   │   ├── base-resource.ts    # Abstract base class
│   │   └── rest-errors.ts      # Error handling
│   ├── hypermedia/             # HATEOAS support
│   │   └── hypermedia-builder.ts
│   ├── validation/             # Request/response validation
│   │   └── schema-validator.ts
│   └── cache/                  # Caching system
│       └── cache-manager.ts
└── docs/openapi/              # API documentation
    └── openapi.yaml           # OpenAPI 3.0 specification
```

## 🚀 Quick Start

### Server Setup

```bash
# Install dependencies
npm install ajv ajv-formats node-cache

# Start development server
npm run server:dev
```

### Client Setup

```typescript
import { RestClient } from './src/lib/rest-client/rest-client';

// Initialize client
const client = new RestClient({
  baseUrl: 'http://localhost:3000/api/v3',
  defaultHeaders: {
    'Authorization': 'Bearer your-token-here'
  }
});

// Discover API capabilities
const apiRoot = await client.discover();
console.log('Available resources:', apiRoot._links);
```

## 📖 API Usage Examples

### 1. Resource Discovery with HATEOAS

```typescript
// Start from API root - no hardcoded URLs!
const apiRoot = await client.discover();

// Follow hypermedia links to navigate
const conversationsLink = apiRoot._links.conversations;
const conversations = await client.follow(conversationsLink);

// Create a new conversation using hypermedia
const createLink = conversations._links.create;
const newConversation = await client.follow(createLink, {
  title: "Dragon's Lair Exploration",
  type: "dm_chat",
  campaign_id: "550e8400-e29b-41d4-a716-446655440000"
});
```

### 2. Advanced Filtering and Pagination

```typescript
// Use React hooks for seamless integration
const { data: conversations, meta, fetchNextPage, hasNextPage } = useRestCollection(
  client,
  '/conversations',
  {
    campaign_id: campaignId,
    type: 'dm_chat',
    status: 'active',
    search: 'dragon',
    limit: 20,
    sort: '-updated_at'
  }
);

// Automatic pagination with hypermedia links
if (hasNextPage) {
  await fetchNextPage();
}
```

### 3. Optimistic Updates with ETags

```typescript
const updateMutation = useUpdateResource(client, {
  onMutate: async (variables) => {
    // Optimistic update
    const previousData = queryClient.getQueryData(['conversation', variables.id]);
    queryClient.setQueryData(['conversation', variables.id], {
      ...previousData,
      ...variables
    });
    return { previousData };
  },
  onError: (error, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['conversation', variables.id], context.previousData);
  }
});

// Update with ETag for conflict detection
await updateMutation.mutateAsync({
  id: 'conv_123',
  title: 'Updated Title',
  etag: '"abc123def456"' // From previous response
});
```

### 4. Nested Resource Management

```typescript
// Working with conversation messages (nested resource)
const { data: messages } = useRestCollection(
  client,
  `/conversations/${conversationId}/messages`,
  {
    sender_type: 'user',
    message_type: 'action',
    has_dice_rolls: true
  }
);

// Add message using hypermedia
const conversation = await client.get(`/conversations/${conversationId}`);
const addMessageLink = conversation._links['add-message'];

const newMessage = await client.follow(addMessageLink, {
  sender_id: 'user_123',
  content: 'I cast fireball!',
  message_type: 'action',
  dice_rolls: [
    { type: 'd20', result: 18, modifier: 5 }
  ]
});
```

### 5. Error Handling with Problem Details

```typescript
try {
  await client.post('/conversations', invalidData);
} catch (error: RestError) {
  console.log('Error type:', error.type);
  console.log('Status:', error.status);
  console.log('Title:', error.title);
  console.log('Detail:', error.detail);
  
  // Handle validation errors
  if (error.validationErrors) {
    error.validationErrors.forEach(({ field, message }) => {
      console.log(`${field}: ${message}`);
    });
  }
}
```

## 🎯 Resource Endpoints

### Conversations (`/api/v3/conversations`)

#### Collection Operations
- `GET /conversations` - List conversations with filtering
- `POST /conversations` - Create new conversation

#### Resource Operations
- `GET /conversations/{id}` - Get conversation details
- `PUT /conversations/{id}` - Update entire conversation
- `PATCH /conversations/{id}` - Partial conversation update
- `DELETE /conversations/{id}` - Delete conversation

#### Nested Resources
- `GET /conversations/{id}/messages` - List messages
- `POST /conversations/{id}/messages` - Add message
- `GET /conversations/{id}/messages/{messageId}` - Get message
- `PUT /conversations/{id}/messages/{messageId}` - Update message
- `PATCH /conversations/{id}/messages/{messageId}` - Partial message update
- `DELETE /conversations/{id}/messages/{messageId}` - Delete message

#### Sub-Resources
- `GET /conversations/{id}/participants` - List participants
- `POST /conversations/{id}/participants` - Add participant
- `DELETE /conversations/{id}/participants/{participantId}` - Remove participant

## 🔍 Query Parameters

### Pagination
- `limit` - Number of items per page (1-100, default: 20)
- `offset` - Number of items to skip (default: 0)
- `page` - Page number for pagination (1-based, default: 1)

### Sorting
- `sort` - Sort fields, prefix with `-` for descending
  - Examples: `sort=created`, `sort=-updated`, `sort=title,-created`

### Field Selection
- `fields` - Comma-separated list of fields to include
  - Example: `fields=id,title,status`

### Filtering (Conversations)
- `campaign_id` - Filter by campaign
- `type` - Filter by conversation type (`dm_chat`, `player_chat`, `narrative`, `combat`)
- `status` - Filter by status (`active`, `paused`, `completed`, `archived`)
- `participant_id` - Filter by participant
- `search` - Search in titles and content
- `created_after` / `created_before` - Date range filtering
- `has_messages` - Filter conversations with/without messages

## 📝 Request/Response Format

### Request Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "etag-value"  # For conditional updates
If-None-Match: "etag-value"  # For conditional gets
```

### Response Headers
```http
Content-Type: application/hal+json
ETag: "resource-etag"
Cache-Control: max-age=300
Location: /api/v3/conversations/conv_123  # For created resources
```

### HAL+JSON Response Format
```json
{
  "data": {
    "id": "conv_123",
    "title": "Dragon's Lair Exploration",
    "type": "dm_chat",
    "status": "active",
    "participants": ["user_123", "char_456"],
    "metadata": {
      "total_messages": 15,
      "last_message_at": "2024-01-15T10:30:00Z",
      "tags": ["exploration", "combat"]
    },
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "_links": {
    "self": {
      "href": "/api/v3/conversations/conv_123",
      "title": "This conversation"
    },
    "collection": {
      "href": "/api/v3/conversations",
      "title": "All conversations"
    },
    "edit": {
      "href": "/api/v3/conversations/conv_123",
      "method": "PUT",
      "type": "application/json",
      "title": "Update conversation"
    },
    "edit-form": {
      "href": "/api/v3/conversations/conv_123",
      "method": "PATCH",
      "type": "application/json",
      "title": "Partially update conversation"
    },
    "delete": {
      "href": "/api/v3/conversations/conv_123",
      "method": "DELETE",
      "title": "Delete conversation"
    },
    "messages": {
      "href": "/api/v3/conversations/conv_123/messages",
      "title": "Messages in this conversation"
    },
    "add-message": {
      "href": "/api/v3/conversations/conv_123/messages",
      "method": "POST",
      "type": "application/json",
      "title": "Add message to conversation"
    },
    "participants": {
      "href": "/api/v3/conversations/conv_123/participants",
      "title": "Conversation participants"
    },
    "campaign": {
      "href": "/api/v3/campaigns/550e8400-e29b-41d4-a716-446655440000",
      "title": "Related campaign"
    }
  }
}
```

### Collection Response Format
```json
{
  "data": [
    // Array of conversation objects
  ],
  "meta": {
    "totalCount": 150,
    "count": 20,
    "pagination": {
      "current": 1,
      "limit": 20,
      "offset": 0,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "_links": {
    "self": {
      "href": "/api/v3/conversations?page=1&limit=20"
    },
    "next": {
      "href": "/api/v3/conversations?page=2&limit=20",
      "title": "Next page"
    },
    "last": {
      "href": "/api/v3/conversations?page=8&limit=20",
      "title": "Last page"
    },
    "create": {
      "href": "/api/v3/conversations",
      "method": "POST",
      "type": "application/json",
      "title": "Create new conversation"
    }
  }
}
```

## 🚨 Error Handling

### Problem Details Format (RFC 7807)
```json
{
  "type": "https://httpstatuses.com/422",
  "title": "Unprocessable Entity",
  "detail": "Validation failed",
  "status": 422,
  "instance": "/api/v3/conversations",
  "validationErrors": [
    {
      "field": "title",
      "message": "must not be empty",
      "value": ""
    },
    {
      "field": "type",
      "message": "must be one of: dm_chat, player_chat, narrative, combat",
      "value": "invalid_type",
      "allowedValues": ["dm_chat", "player_chat", "narrative", "combat"]
    }
  ]
}
```

### HTTP Status Codes
- `200` - OK (successful GET, PUT, PATCH)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `304` - Not Modified (conditional GET with matching ETag)
- `400` - Bad Request (malformed request)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `405` - Method Not Allowed (method not supported)
- `409` - Conflict (resource conflict, ETag mismatch)
- `412` - Precondition Failed (If-Match failed)
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## 🔧 Development

### Running the API

```bash
# Start server in development mode
npm run server:dev

# API will be available at:
# http://localhost:3000/api/v3

# Interactive documentation:
# http://localhost:3000/api/v3/docs
```

### Testing with cURL

```bash
# Discover API capabilities
curl -H "Accept: application/hal+json" \
  http://localhost:3000/api/v3

# List conversations
curl -H "Accept: application/hal+json" \
  -H "Authorization: Bearer your-token" \
  "http://localhost:3000/api/v3/conversations?limit=5&sort=-updated"

# Create conversation
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/hal+json" \
  -H "Authorization: Bearer your-token" \
  -d '{"title":"New Adventure","type":"dm_chat"}' \
  http://localhost:3000/api/v3/conversations

# Update with ETag
curl -X PATCH \
  -H "Content-Type: application/json" \
  -H "If-Match: \"abc123def456\"" \
  -H "Authorization: Bearer your-token" \
  -d '{"status":"completed"}' \
  http://localhost:3000/api/v3/conversations/conv_123
```

## 📚 Documentation

- **Interactive API Docs**: `/api/v3/docs` - Swagger UI interface
- **OpenAPI Specification**: `/api/v3/openapi.yaml` - Complete API specification
- **API Root**: `/api/v3` - Hypermedia discovery endpoint
- **Health Check**: `/api/v3/health` - Service health status
- **Metrics**: `/api/v3/metrics` - Performance and usage statistics

## 🎯 Best Practices

### Client Implementation
1. **Always start from API root** - Don't hardcode URLs
2. **Follow hypermedia links** - Use `_links` for navigation
3. **Handle ETags properly** - Use for caching and conflict detection
4. **Implement retry logic** - Handle rate limits and temporary failures
5. **Cache responses** - Respect cache headers and TTL
6. **Use sparse fieldsets** - Request only needed fields for performance

### Server Implementation
1. **Consistent resource patterns** - Follow the base resource class
2. **Comprehensive validation** - Use JSON Schema for all inputs
3. **Proper error handling** - Return Problem Details format
4. **Include hypermedia links** - Make the API discoverable
5. **Support conditional requests** - Implement ETag handling
6. **Monitor and log** - Track API usage and performance

## 🚀 Production Considerations

### Performance
- Enable HTTP/2 for multiplexing
- Implement CDN caching for static resources
- Use connection pooling for database
- Add response compression (gzip/brotli)
- Implement proper database indexing

### Security
- Use HTTPS in production
- Implement rate limiting per user/IP
- Validate all inputs with JSON Schema
- Use proper authentication and authorization
- Sanitize error messages in production

### Monitoring
- Track API response times
- Monitor cache hit rates
- Log all error responses
- Set up alerting for high error rates
- Monitor database connection pool

### Scaling
- Implement horizontal scaling with load balancing
- Use Redis for distributed caching
- Consider API versioning strategies
- Implement circuit breakers for external dependencies
- Use database read replicas for scaling reads

## 🤝 Contributing

When adding new resources:

1. Extend `BaseRestResource` class
2. Implement all abstract methods
3. Add JSON Schema validation
4. Include comprehensive hypermedia links
5. Write OpenAPI documentation
6. Add React hooks for client integration
7. Create comprehensive tests

## 📋 Roadmap

- [ ] Additional resource implementations (campaigns, characters, etc.)
- [ ] Real-time updates with Server-Sent Events
- [ ] Advanced caching with Redis
- [ ] API rate limiting with sliding windows
- [ ] Comprehensive monitoring and metrics
- [ ] Client SDK generation from OpenAPI spec
- [ ] Advanced search with Elasticsearch integration
- [ ] Bulk operations and batch processing
- [ ] Event sourcing for audit trails
- [ ] Multi-tenant support

---

This RESTful API implementation demonstrates enterprise-grade REST principles with HATEOAS, providing a foundation for scalable, maintainable, and discoverable web APIs.