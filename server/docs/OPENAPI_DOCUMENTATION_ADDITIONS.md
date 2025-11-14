# OpenAPI Documentation Additions

This document contains comprehensive OpenAPI documentation for all API endpoints that need to be added to the route files.

## Combat System Endpoints (Remaining)

### POST /v1/combat/{encounterId}/spell-attack
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/spell-attack:
 *   post:
 *     summary: Resolve a spell attack against targets
 *     description: Processes spell attacks against one or more targets with saving throws and damage
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - casterId
 *               - targetIds
 *               - spellName
 *             properties:
 *               casterId:
 *                 type: string
 *                 format: uuid
 *               targetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               spellName:
 *                 type: string
 *               spellLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 9
 *               saveDC:
 *                 type: integer
 *               saveAbility:
 *                 type: string
 *                 enum: [str, dex, con, int, wis, cha]
 *           example:
 *             casterId: "char-123"
 *             targetIds: ["npc-456", "npc-789"]
 *             spellName: "Fireball"
 *             spellLevel: 3
 *             saveDC: 15
 *             saveAbility: "dex"
 *     responses:
 *       200:
 *         description: Spell attack resolved successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### GET /v1/combat/characters/{characterId}/attacks
```typescript
/**
 * @openapi
 * /v1/combat/characters/{characterId}/attacks:
 *   get:
 *     summary: Get all weapon attacks for a character
 *     description: Retrieves the list of configured weapon attacks for combat use
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: characterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Character attacks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attacks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       attackBonus:
 *                         type: integer
 *                       damageDice:
 *                         type: string
 *                       damageType:
 *                         type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/characters/{characterId}/attacks
```typescript
/**
 * @openapi
 * /v1/combat/characters/{characterId}/attacks:
 *   post:
 *     summary: Create a new weapon attack for a character
 *     description: Adds a new weapon or attack option to the character's attack list
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: characterId
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
 *             required:
 *               - name
 *               - damageDice
 *               - damageType
 *               - attackBonus
 *             properties:
 *               name:
 *                 type: string
 *               damageDice:
 *                 type: string
 *               damageType:
 *                 type: string
 *                 enum: [slashing, piercing, bludgeoning, fire, cold, lightning, thunder, poison, acid, necrotic, radiant, psychic, force]
 *               attackBonus:
 *                 type: integer
 *               damageBonus:
 *                 type: integer
 *               range:
 *                 type: integer
 *               properties:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             name: "Longsword"
 *             damageDice: "1d8"
 *             damageType: "slashing"
 *             attackBonus: 5
 *             damageBonus: 3
 *     responses:
 *       201:
 *         description: Attack created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/damage
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/damage:
 *   post:
 *     summary: Apply damage to a participant
 *     description: Applies damage with resistance/immunity/vulnerability calculations
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - participantId
 *               - damageAmount
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: uuid
 *               damageAmount:
 *                 type: integer
 *                 minimum: 0
 *               damageType:
 *                 type: string
 *               sourceParticipantId:
 *                 type: string
 *                 format: uuid
 *               sourceDescription:
 *                 type: string
 *               ignoreResistances:
 *                 type: boolean
 *               ignoreImmunities:
 *                 type: boolean
 *           example:
 *             participantId: "participant-123"
 *             damageAmount: 15
 *             damageType: "fire"
 *             sourceDescription: "Fireball spell"
 *     responses:
 *       200:
 *         description: Damage applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 damageDealt:
 *                   type: integer
 *                 newHP:
 *                   type: integer
 *                 isDead:
 *                   type: boolean
 *                 isUnconscious:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/heal
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/heal:
 *   post:
 *     summary: Heal a participant
 *     description: Restores hit points to a combat participant
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - participantId
 *               - healingAmount
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: uuid
 *               healingAmount:
 *                 type: integer
 *                 minimum: 0
 *               sourceDescription:
 *                 type: string
 *           example:
 *             participantId: "participant-123"
 *             healingAmount: 10
 *             sourceDescription: "Cure Wounds spell"
 *     responses:
 *       200:
 *         description: Healing applied successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/temp-hp
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/temp-hp:
 *   post:
 *     summary: Set temporary HP for a participant
 *     description: Grants temporary hit points that absorb damage before real HP
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - participantId
 *               - tempHp
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: uuid
 *               tempHp:
 *                 type: integer
 *                 minimum: 0
 *           example:
 *             participantId: "participant-123"
 *             tempHp: 5
 *     responses:
 *       200:
 *         description: Temporary HP set successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/death-save
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/death-save:
 *   post:
 *     summary: Roll a death saving throw
 *     description: Processes a death saving throw for an unconscious character
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - participantId
 *               - roll
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: uuid
 *               roll:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *           example:
 *             participantId: "participant-123"
 *             roll: 12
 *     responses:
 *       200:
 *         description: Death save processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 successes:
 *                   type: integer
 *                 failures:
 *                   type: integer
 *                 isStabilized:
 *                   type: boolean
 *                 isDead:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### GET /v1/combat/{encounterId}/damage-log
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/damage-log:
 *   get:
 *     summary: Get damage log for an encounter
 *     description: Retrieves the history of damage events during combat
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: participantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by participant
 *       - in: query
 *         name: round
 *         schema:
 *           type: integer
 *         description: Filter by round number
 *     responses:
 *       200:
 *         description: Damage log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   round:
 *                     type: integer
 *                   participantId:
 *                     type: string
 *                   damageAmount:
 *                     type: integer
 *                   damageType:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/conditions/apply
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/conditions/apply:
 *   post:
 *     summary: Apply a condition to a participant
 *     description: Applies a D&D 5E condition (blinded, poisoned, etc.) with duration and effects
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
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
 *             required:
 *               - participantId
 *               - conditionName
 *               - durationType
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: uuid
 *               conditionName:
 *                 type: string
 *                 enum: [blinded, charmed, deafened, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious]
 *               durationType:
 *                 type: string
 *                 enum: [instant, rounds, minutes, hours, until_save, concentration, permanent]
 *               durationValue:
 *                 type: integer
 *               saveDc:
 *                 type: integer
 *               saveAbility:
 *                 type: string
 *                 enum: [str, dex, con, int, wis, cha]
 *               source:
 *                 type: string
 *           example:
 *             participantId: "participant-123"
 *             conditionName: "poisoned"
 *             durationType: "until_save"
 *             saveDc: 13
 *             saveAbility: "con"
 *             source: "Poison dart trap"
 *     responses:
 *       201:
 *         description: Condition applied successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### DELETE /v1/combat/{encounterId}/conditions/{conditionId}
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/conditions/{conditionId}:
 *   delete:
 *     summary: Remove a condition from a participant
 *     description: Removes an active condition effect
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conditionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Condition removed successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### POST /v1/combat/{encounterId}/conditions/{conditionId}/save
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/conditions/{conditionId}/save:
 *   post:
 *     summary: Attempt a saving throw against a condition
 *     description: Rolls a save to end or resist a condition effect
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conditionId
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
 *             required:
 *               - saveRoll
 *             properties:
 *               saveRoll:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *           example:
 *             saveRoll: 16
 *     responses:
 *       200:
 *         description: Save processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 saved:
 *                   type: boolean
 *                 conditionRemoved:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### GET /v1/combat/{encounterId}/conditions/active
```typescript
/**
 * @openapi
 * /v1/combat/{encounterId}/conditions/active:
 *   get:
 *     summary: Get all active conditions in an encounter
 *     description: Returns all conditions affecting participants with aggregated mechanical effects
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: encounterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Active conditions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 encounterId:
 *                   type: string
 *                 currentRound:
 *                   type: integer
 *                 participantConditions:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       participantName:
 *                         type: string
 *                       conditions:
 *                         type: array
 *                         items:
 *                           type: object
 *                       aggregatedEffects:
 *                         type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### GET /v1/combat/conditions/library
```typescript
/**
 * @openapi
 * /v1/combat/conditions/library:
 *   get:
 *     summary: Get all available conditions from the library
 *     description: Returns the complete D&D 5E conditions library with descriptions and mechanical effects
 *     tags:
 *       - Combat
 *     responses:
 *       200:
 *         description: Conditions library retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conditions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       mechanicalEffects:
 *                         type: object
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

### GET /v1/combat/participants/{participantId}/conditions
```typescript
/**
 * @openapi
 * /v1/combat/participants/{participantId}/conditions:
 *   get:
 *     summary: Get active conditions for a specific participant
 *     description: Returns conditions and their mechanical effects for one participant
 *     tags:
 *       - Combat
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Participant conditions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 participantId:
 *                   type: string
 *                 conditions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 aggregatedEffects:
 *                   type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

## Summary

This document provides comprehensive OpenAPI 3.0 documentation for:
- **Combat System**: All remaining endpoints for initiative, turns, attacks, damage, HP tracking, and conditions

These JSDoc comments should be inserted directly above the respective router endpoint definitions in the route files.
