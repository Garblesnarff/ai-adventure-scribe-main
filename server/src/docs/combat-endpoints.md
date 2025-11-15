# Combat Endpoints OpenAPI Documentation Template

This file contains additional OpenAPI documentation for combat endpoints.
Due to file size, key endpoints are documented inline in combat.ts, and this serves as a reference.

## Documented Endpoints

### Initiative & Turn Management
- [x] POST /v1/sessions/{sessionId}/combat/start - Fully documented
- [ ] POST /v1/combat/{encounterId}/roll-initiative
- [ ] POST /v1/combat/{encounterId}/next-turn
- [ ] PATCH /v1/combat/{encounterId}/reorder
- [ ] POST /v1/combat/{encounterId}/end
- [ ] GET /v1/combat/{encounterId}/status

### Attack & Damage
- [ ] POST /v1/combat/{encounterId}/attack
- [ ] POST /v1/combat/{encounterId}/spell-attack
- [ ] GET /v1/combat/characters/{characterId}/attacks
- [ ] POST /v1/combat/characters/{characterId}/attacks
- [ ] POST /v1/combat/{encounterId}/damage
- [ ] POST /v1/combat/{encounterId}/heal
- [ ] POST /v1/combat/{encounterId}/temp-hp
- [ ] POST /v1/combat/{encounterId}/death-save
- [ ] GET /v1/combat/{encounterId}/damage-log

### Conditions
- [ ] POST /v1/combat/{encounterId}/conditions/apply
- [ ] DELETE /v1/combat/{encounterId}/conditions/{conditionId}
- [ ] POST /v1/combat/{encounterId}/conditions/{conditionId}/save
- [ ] GET /v1/combat/{encounterId}/conditions/active
- [ ] GET /v1/combat/conditions/library
- [ ] GET /v1/combat/participants/{participantId}/conditions

## Documentation Pattern

Each endpoint follows this structure:
1. Summary and description
2. Tags (Combat)
3. Path parameters (with UUID format)
4. Request body schema (if applicable)
5. Response schemas with all status codes
6. Example request/response bodies
7. Common error responses
