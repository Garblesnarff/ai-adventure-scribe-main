# D&D 5E Mechanics API Documentation

Welcome to the AI Adventure Scribe API documentation! This API provides complete D&D 5th Edition game mechanics including combat, spells, inventory, and character progression.

## Quick Start

### Accessing Documentation

#### Swagger UI (Recommended)
Visit the interactive API documentation:
- **Development**: http://localhost:8888/api-docs
- **Production**: https://api.aiadventurescribe.com/api-docs

#### OpenAPI Spec (JSON)
Download the machine-readable specification:
- **Location**: `/docs/openapi.json`
- **Generate**: `npm run docs:generate`

### Authentication

All endpoints require JWT authentication:

```bash
Authorization: Bearer <your_jwt_token>
```

Get your token by logging in through the `/v1/auth/login` endpoint.

## API Modules

### 1. Combat System (21+ endpoints)

Manage D&D 5E combat encounters with full rules support.

**Key Features**:
- Initiative rolls and turn order
- Attack resolution with AC checks
- Damage application with resistances/vulnerabilities
- Conditions (blinded, stunned, poisoned, etc.)
- Death saving throws
- HP and temporary HP tracking

**Example: Start Combat**
```bash
POST /v1/sessions/{sessionId}/combat/start
Content-Type: application/json

{
  "participants": [
    {
      "name": "Gandalf",
      "characterId": "char-123",
      "initiativeModifier": 2,
      "hpCurrent": 45,
      "hpMax": 45
    }
  ],
  "surpriseRound": false
}
```

### 2. Spell Slots System (8 endpoints)

Track and manage spell slots for spellcasting classes.

**Key Features**:
- Spell slot tracking (levels 1-9)
- Multiclass spell slot calculation
- Upcasting validation
- Usage history
- Long rest restoration

**Example: Use Spell Slot**
```bash
POST /v1/characters/{characterId}/spell-slots/use

{
  "spellName": "Fireball",
  "spellLevel": 3,
  "slotLevelUsed": 4,
  "sessionId": "session-123"
}
```

### 3. Rest System (6 endpoints)

Handle short rests and long rests with proper resource recovery.

**Key Features**:
- Short rest (hit dice recovery)
- Long rest (HP, spell slots, features)
- Hit dice management
- Rest history tracking

**Example: Take Short Rest**
```bash
POST /v1/rest/characters/{characterId}/short

{
  "hitDiceToSpend": 2,
  "sessionId": "session-123"
}
```

### 4. Inventory Management (11 endpoints)

Complete inventory system with weight, attunement, and equipment.

**Key Features**:
- Item CRUD operations
- Equipment management
- Consumable usage
- Encumbrance calculation
- Attunement (max 3 items)
- Usage history

**Example: Add Item**
```bash
POST /v1/characters/{characterId}/inventory

{
  "name": "Healing Potion",
  "itemType": "consumable",
  "quantity": 3,
  "weight": 0.5
}
```

### 5. Progression System (7 endpoints)

Character advancement with XP and leveling.

**Key Features**:
- XP award tracking
- Level-up mechanics
- XP threshold table (levels 1-20)
- Milestone leveling
- Progression history

**Example: Award XP**
```bash
POST /v1/progression/characters/{characterId}/experience/award

{
  "xp": 450,
  "source": "combat",
  "description": "Defeated goblin war band"
}
```

### 6. Class Features (10 endpoints)

Manage class features, subclasses, and feature usage.

**Key Features**:
- Feature library (all D&D 5E classes)
- Subclass management
- Feature usage tracking
- Short/long rest recovery
- Usage history

**Example: Use Feature**
```bash
POST /v1/characters/{characterId}/features/{featureId}/use

{
  "context": "Action Surge in combat",
  "sessionId": "session-123"
}
```

## Common Patterns

### Path Parameters
Most endpoints use these parameter patterns:
- `{characterId}` - UUID of the character
- `{sessionId}` - UUID of the game session
- `{encounterId}` - UUID of the combat encounter
- `{itemId}` - UUID of the inventory item
- `{featureId}` - UUID of the class feature

### Response Format
All successful responses return JSON:
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Format
All errors follow this structure:
```json
{
  "error": "Error message",
  "details": { }
}
```

### HTTP Status Codes
- `200 OK` - Successful GET/PATCH/DELETE
- `201 Created` - Successful POST (resource created)
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `500 Server Error` - Internal server error

## Advanced Usage

### Filtering & Pagination

Some endpoints support query parameters:

```bash
# Get spell slot history with limit
GET /v1/characters/{characterId}/spell-slots/history?limit=20&offset=0

# Get inventory by type
GET /v1/characters/{characterId}/inventory?itemType=weapon&equipped=true

# Get XP history for session
GET /v1/progression/characters/{characterId}/experience-history?sessionId={id}
```

### Try It Out

The Swagger UI provides an interactive "Try it out" button for each endpoint:

1. Visit http://localhost:8888/api-docs
2. Click "Authorize" and enter your JWT token
3. Expand any endpoint
4. Click "Try it out"
5. Fill in parameters
6. Click "Execute"
7. View the response

## Developer Tools

### Generate OpenAPI Spec

```bash
npm run docs:generate
```

Outputs to: `docs/openapi.json`

### Start Development Server

```bash
npm run docs:serve
```

Access Swagger UI at: http://localhost:8888/api-docs

### Import to Postman

1. Generate the OpenAPI spec: `npm run docs:generate`
2. In Postman: File > Import
3. Select `docs/openapi.json`
4. All endpoints will be imported with examples

### Import to Insomnia

1. Generate spec
2. In Insomnia: Create > Import
3. Select OpenAPI/Swagger format
4. Choose `docs/openapi.json`

## API Versioning

Current version: **v1**

All endpoints are prefixed with `/v1/`:
- `/v1/combat/...`
- `/v1/rest/...`
- `/v1/spell-slots/...`
- etc.

Future versions will use `/v2/`, `/v3/`, etc.

## Rate Limiting

API endpoints are rate-limited per user:
- **Default**: 100 requests per minute
- **Free tier**: 50 requests per minute
- **Pro tier**: 200 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999
```

## Support

### Issues
Report bugs or request features:
- GitHub Issues: [github.com/your-repo/issues]
- Email: support@aiadventurescribe.com

### Contributing
Want to improve the documentation?
1. Fork the repository
2. Add JSDoc comments to endpoints
3. Run `npm run docs:generate`
4. Submit a pull request

### Documentation Pattern

Each endpoint should follow this JSDoc pattern:

```typescript
/**
 * @openapi
 * /v1/module/{id}:
 *   post:
 *     summary: Brief description
 *     description: Detailed explanation
 *     tags:
 *       - Module Name
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchemaName'
 */
```

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [D&D 5E Basic Rules](https://www.dndbeyond.com/sources/basic-rules)
- [D&D 5E SRD](https://www.5esrd.com/)

## Changelog

### v1.0.0 (2025-11-14)
- Initial OpenAPI documentation
- 63+ endpoints documented
- Combat, spell slots, rest, inventory, progression, class features
- Swagger UI integration
- Interactive try-it-out functionality
- Complete schema definitions

---

**Happy Adventuring! 🎲⚔️🐉**
