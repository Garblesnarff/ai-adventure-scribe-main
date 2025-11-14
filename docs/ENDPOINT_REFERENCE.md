# API Endpoint Quick Reference

Complete list of all 63+ D&D 5E Mechanics API endpoints.

## Authentication

All endpoints require JWT Bearer token:
```
Authorization: Bearer <token>
```

---

## Combat System (21 endpoints)

### Initiative & Turn Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/sessions/{sessionId}/combat/start` | Start new combat encounter ✅ |
| POST | `/v1/combat/{encounterId}/roll-initiative` | Roll initiative for participant |
| POST | `/v1/combat/{encounterId}/next-turn` | Advance to next turn |
| PATCH | `/v1/combat/{encounterId}/reorder` | Manually adjust initiative order |
| POST | `/v1/combat/{encounterId}/end` | End combat encounter |
| GET | `/v1/combat/{encounterId}/status` | Get current combat state ✅ |

### Attack & Damage

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/combat/{encounterId}/attack` | Resolve attack against target ✅ |
| POST | `/v1/combat/{encounterId}/spell-attack` | Resolve spell attack |
| GET | `/v1/combat/characters/{characterId}/attacks` | Get character weapons |
| POST | `/v1/combat/characters/{characterId}/attacks` | Create weapon attack |
| POST | `/v1/combat/{encounterId}/damage` | Apply damage to participant |
| POST | `/v1/combat/{encounterId}/heal` | Heal participant |
| POST | `/v1/combat/{encounterId}/temp-hp` | Set temporary HP |
| POST | `/v1/combat/{encounterId}/death-save` | Roll death saving throw |
| GET | `/v1/combat/{encounterId}/damage-log` | Get damage history |

### Conditions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/combat/{encounterId}/conditions/apply` | Apply condition to participant |
| DELETE | `/v1/combat/{encounterId}/conditions/{conditionId}` | Remove condition |
| POST | `/v1/combat/{encounterId}/conditions/{conditionId}/save` | Attempt saving throw |
| GET | `/v1/combat/{encounterId}/conditions/active` | Get all active conditions |
| GET | `/v1/combat/conditions/library` | Get conditions library |
| GET | `/v1/combat/participants/{participantId}/conditions` | Get participant conditions |

---

## Spell Slots System (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/characters/{characterId}/spell-slots` | Get all spell slots ✅ |
| POST | `/v1/characters/{characterId}/spell-slots/use` | Use spell slot |
| POST | `/v1/characters/{characterId}/spell-slots/restore` | Restore spell slots |
| GET | `/v1/characters/{characterId}/spell-slots/history` | Get usage history |
| GET | `/v1/spell-slots/calculate` | Calculate slots (preview) |
| POST | `/v1/spell-slots/calculate-multiclass` | Calculate multiclass slots |
| POST | `/v1/characters/{characterId}/spell-slots/initialize` | Initialize spell slots |
| GET | `/v1/spell-slots/can-upcast` | Check upcast validity |

---

## Rest System (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/rest/characters/{characterId}/short` | Take short rest ✅ |
| POST | `/v1/rest/characters/{characterId}/long` | Take long rest |
| GET | `/v1/rest/characters/{characterId}/hit-dice` | Get hit dice |
| POST | `/v1/rest/characters/{characterId}/hit-dice/spend` | Spend hit dice |
| GET | `/v1/rest/characters/{characterId}/rest-history` | Get rest history |
| POST | `/v1/rest/characters/{characterId}/hit-dice/initialize` | Initialize hit dice |

---

## Inventory Management (11 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/characters/{characterId}/inventory` | Get inventory |
| POST | `/v1/characters/{characterId}/inventory` | Add item |
| PATCH | `/v1/characters/{characterId}/inventory/{itemId}` | Update item |
| DELETE | `/v1/characters/{characterId}/inventory/{itemId}` | Remove item |
| POST | `/v1/characters/{characterId}/inventory/{itemId}/use` | Use consumable/ammo |
| GET | `/v1/characters/{characterId}/encumbrance` | Check encumbrance |
| POST | `/v1/characters/{characterId}/attune/{itemId}` | Attune to magic item |
| DELETE | `/v1/characters/{characterId}/attune/{itemId}` | Break attunement |
| GET | `/v1/characters/{characterId}/attuned` | Get attuned items |
| POST | `/v1/characters/{characterId}/inventory/{itemId}/equip` | Equip item |
| POST | `/v1/characters/{characterId}/inventory/{itemId}/unequip` | Unequip item |
| GET | `/v1/characters/{characterId}/usage-history` | Get usage history |

---

## Progression System (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/progression/characters/{characterId}/experience/award` | Award XP ✅ |
| GET | `/v1/progression/characters/{characterId}/progression` | Get progression status |
| POST | `/v1/progression/characters/{characterId}/level-up` | Perform level-up |
| GET | `/v1/progression/characters/{characterId}/level-up-options` | Get level-up options |
| GET | `/v1/progression/characters/{characterId}/experience-history` | Get XP history |
| POST | `/v1/progression/characters/{characterId}/milestone-level` | Set level (milestone) |
| GET | `/v1/progression/xp-table` | Get XP threshold table |

---

## Class Features (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/class-features` | Get features library |
| GET | `/v1/class-features/{featureId}` | Get feature by ID |
| GET | `/v1/class-features/subclasses/{className}` | Get available subclasses |
| GET | `/v1/class-features/characters/{characterId}/features` | Get character features |
| POST | `/v1/class-features/characters/{characterId}/features/{featureId}/grant` | Grant feature |
| POST | `/v1/class-features/characters/{characterId}/features/{featureId}/use` | Use feature |
| POST | `/v1/class-features/characters/{characterId}/features/restore` | Restore after rest |
| POST | `/v1/class-features/characters/{characterId}/subclass` | Set character subclass |
| GET | `/v1/class-features/characters/{characterId}/subclass/{className}` | Get character subclass |
| GET | `/v1/class-features/characters/{characterId}/features/history` | Get usage history |

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

---

## Common Query Parameters

### Filtering
```
?itemType=weapon
?equipped=true
?source=combat
```

### Pagination
```
?limit=20
?offset=0
```

### Session Filtering
```
?sessionId={uuid}
```

---

## Common Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `{characterId}` | UUID | Character unique identifier |
| `{sessionId}` | UUID | Game session unique identifier |
| `{encounterId}` | UUID | Combat encounter unique identifier |
| `{participantId}` | UUID | Combat participant unique identifier |
| `{itemId}` | UUID | Inventory item unique identifier |
| `{featureId}` | UUID | Class feature unique identifier |
| `{conditionId}` | UUID | Condition instance unique identifier |
| `{weaponId}` | UUID | Weapon attack unique identifier |

---

## Request Headers

### Required
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Optional
```
X-Session-ID: <session_uuid>  # For tracking
```

---

## Response Headers

### Standard
```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999
```

### On Rate Limit
```
Retry-After: 60
```

---

## Enum Values

### Combat Status
- `active`
- `paused`
- `completed`

### Attack Type
- `melee`
- `ranged`
- `spell`

### Damage Type
- `acid`
- `bludgeoning`
- `cold`
- `fire`
- `force`
- `lightning`
- `necrotic`
- `piercing`
- `poison`
- `psychic`
- `radiant`
- `slashing`
- `thunder`

### XP Source
- `combat`
- `quest`
- `roleplay`
- `milestone`
- `other`

### Item Type
- `weapon`
- `armor`
- `consumable`
- `ammunition`
- `tool`
- `magic_item`
- `treasure`
- `other`

### Condition Duration Type
- `rounds`
- `minutes`
- `hours`
- `until_save`
- `permanent`

### Save Ability
- `strength`
- `dexterity`
- `constitution`
- `intelligence`
- `wisdom`
- `charisma`

### Rest Type
- `short`
- `long`

---

## Documentation Resources

- **Swagger UI**: http://localhost:8888/api-docs
- **OpenAPI Spec**: `/docs/openapi.json`
- **API README**: `/docs/API_DOCUMENTATION_README.md`
- **Full Report**: `/docs/WORK_UNIT_3.2_FINAL_REPORT.md`

---

## Quick Links

- [D&D 5E Basic Rules](https://www.dndbeyond.com/sources/basic-rules)
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)
- [Swagger UI Docs](https://swagger.io/tools/swagger-ui/)

---

**Legend**: ✅ = Fully documented with examples

**Total Endpoints**: 63
**Last Updated**: 2025-11-14
**API Version**: v1
