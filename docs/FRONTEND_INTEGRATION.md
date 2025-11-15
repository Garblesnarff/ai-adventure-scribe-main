# D&D 5E Mechanics API - Frontend Integration Guide

> **Complete guide for integrating with the AI Adventure Scribe D&D 5E mechanics API**

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Combat System](#combat-system)
- [Rest System](#rest-system)
- [Inventory System](#inventory-system)
- [Progression System](#progression-system)
- [Class Features](#class-features)
- [Spell Slots](#spell-slots)
- [Error Handling](#error-handling)
- [State Management](#state-management)
- [Type Definitions](#type-definitions)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)

---

## Quick Start

### Base Configuration

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Basic API client
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }

  return response.json();
}
```

### Installation

```bash
# Install dependencies
npm install axios # or use fetch
npm install @tanstack/react-query # recommended for data fetching
```

---

## Authentication

All API endpoints require authentication except public documentation. Include your JWT token in the `Authorization` header.

### Getting Started

```typescript
interface AuthToken {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro' | 'enterprise';
  };
}

// Login and store token
async function login(email: string, password: string): Promise<AuthToken> {
  const data = await apiRequest<AuthToken>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem('authToken', data.token);
  return data;
}

// Handle 401 responses
function handleUnauthorized() {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

---

## Combat System

The combat system handles D&D 5E combat encounters with initiative tracking, turn order, attacks, damage, healing, conditions, and death saves.

### Starting a Combat Encounter

**Endpoint:** `POST /v1/sessions/{sessionId}/combat/start`

```typescript
interface StartCombatRequest {
  participants: Array<{
    name: string;
    characterId?: string;
    npcId?: string;
    initiativeModifier: number;
    hpCurrent?: number;
    hpMax?: number;
  }>;
  surpriseRound?: boolean;
}

interface CombatState {
  encounter: {
    id: string;
    sessionId: string;
    currentRound: number;
    currentTurnOrder: number;
    status: 'active' | 'paused' | 'completed';
  };
  participants: CombatParticipant[];
  turnOrder: Array<{
    participant: CombatParticipant;
    isCurrent: boolean;
    hasGone: boolean;
  }>;
  currentParticipant: CombatParticipant | null;
}

// Example: Start combat with party and enemies
async function startCombat(sessionId: string): Promise<CombatState> {
  return apiRequest<CombatState>(`/v1/sessions/${sessionId}/combat/start`, {
    method: 'POST',
    body: JSON.stringify({
      participants: [
        {
          name: 'Aragorn',
          characterId: 'char-123',
          initiativeModifier: 2,
          hpCurrent: 45,
          hpMax: 45,
        },
        {
          name: 'Orc Warrior',
          npcId: 'npc-456',
          initiativeModifier: 0,
          hpCurrent: 30,
          hpMax: 30,
        },
      ],
      surpriseRound: false,
    }),
  });
}
```

### Getting Combat State

**Endpoint:** `GET /v1/combat/{encounterId}/status`

```typescript
// Poll combat state for real-time updates
async function getCombatState(encounterId: string): Promise<CombatState> {
  return apiRequest<CombatState>(`/v1/combat/${encounterId}/status`);
}

// React hook for polling
function useCombatState(encounterId: string, pollInterval = 2000) {
  const [state, setState] = useState<CombatState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getCombatState(encounterId);
        setState(data);
      } catch (err) {
        setError(err as Error);
      }
    };

    poll();
    const interval = setInterval(poll, pollInterval);
    return () => clearInterval(interval);
  }, [encounterId, pollInterval]);

  return { state, error };
}
```

### Rolling Initiative

**Endpoint:** `POST /v1/combat/{encounterId}/roll-initiative`

```typescript
async function rollInitiative(
  encounterId: string,
  participantId: string,
  roll?: number
): Promise<InitiativeResult> {
  return apiRequest(`/v1/combat/${encounterId}/roll-initiative`, {
    method: 'POST',
    body: JSON.stringify({
      participantId,
      roll, // Optional: if not provided, will auto-roll
    }),
  });
}
```

### Making an Attack

**Endpoint:** `POST /v1/combat/{encounterId}/attack`

```typescript
interface AttackRequest {
  attackerId: string;
  targetId: string;
  attackRoll: number;
  attackBonus?: number;
  weaponId?: string;
  attackType: 'melee' | 'ranged' | 'spell';
  isCritical?: boolean;
  damageRoll?: number;
}

interface AttackResult {
  hit: boolean;
  targetAC: number;
  totalAttackRoll: number;
  damage?: number;
  damageType?: string;
  finalDamage: number;
  targetNewHp?: number;
  targetIsConscious?: boolean;
  targetIsDead?: boolean;
  isCritical: boolean;
}

async function makeAttack(
  encounterId: string,
  attack: AttackRequest
): Promise<AttackResult> {
  return apiRequest<AttackResult>(`/v1/combat/${encounterId}/attack`, {
    method: 'POST',
    body: JSON.stringify(attack),
  });
}

// Example: Sword attack
const result = await makeAttack(encounterId, {
  attackerId: 'participant-123',
  targetId: 'participant-456',
  attackRoll: 18,
  attackBonus: 5,
  attackType: 'melee',
  isCritical: false,
});

if (result.hit) {
  console.log(`Hit! Dealt ${result.finalDamage} damage`);
  if (result.targetIsDead) {
    console.log('Target defeated!');
  }
}
```

### Applying Damage

**Endpoint:** `POST /v1/combat/{encounterId}/damage`

```typescript
interface DamageRequest {
  participantId: string;
  damageAmount: number;
  damageType?: string;
  sourceParticipantId?: string;
  sourceDescription?: string;
  ignoreResistances?: boolean;
  ignoreImmunities?: boolean;
}

interface DamageResult {
  participantId: string;
  originalDamage: number;
  modifiedDamage: number;
  tempHpLost: number;
  hpLost: number;
  newCurrentHp: number;
  newTempHp: number;
  isConscious: boolean;
  isDead: boolean;
  wasResisted: boolean;
  wasVulnerable: boolean;
  wasImmune: boolean;
  massiveDamage: boolean;
}

async function applyDamage(
  encounterId: string,
  damage: DamageRequest
): Promise<DamageResult> {
  return apiRequest<DamageResult>(`/v1/combat/${encounterId}/damage`, {
    method: 'POST',
    body: JSON.stringify(damage),
  });
}

// Example: Apply fire damage
const result = await applyDamage(encounterId, {
  participantId: 'participant-123',
  damageAmount: 28,
  damageType: 'fire',
  sourceDescription: 'Fireball',
});

if (result.wasResisted) {
  console.log('Target has fire resistance - half damage');
}
if (!result.isConscious) {
  console.log('Target is unconscious!');
}
```

### Healing

**Endpoint:** `POST /v1/combat/{encounterId}/heal`

```typescript
async function healParticipant(
  encounterId: string,
  participantId: string,
  healingAmount: number,
  sourceDescription?: string
): Promise<HealingResult> {
  return apiRequest(`/v1/combat/${encounterId}/heal`, {
    method: 'POST',
    body: JSON.stringify({
      participantId,
      healingAmount,
      sourceDescription,
    }),
  });
}
```

### Death Saves

**Endpoint:** `POST /v1/combat/{encounterId}/death-save`

```typescript
interface DeathSaveResult {
  participantId: string;
  roll: number;
  isSuccess: boolean;
  isCritical: boolean;
  successes: number;
  failures: number;
  isStabilized: boolean;
  isDead: boolean;
  wasRevived: boolean;
  newCurrentHp: number;
}

async function rollDeathSave(
  encounterId: string,
  participantId: string,
  roll: number
): Promise<DeathSaveResult> {
  return apiRequest<DeathSaveResult>(`/v1/combat/${encounterId}/death-save`, {
    method: 'POST',
    body: JSON.stringify({ participantId, roll }),
  });
}

// Example with d20 roll
const d20 = Math.floor(Math.random() * 20) + 1;
const result = await rollDeathSave(encounterId, participantId, d20);

if (result.isDead) {
  console.log('Character has died...');
} else if (result.isStabilized) {
  console.log('Character is stabilized!');
} else if (result.wasRevived) {
  console.log('Natural 20! Character regains 1 HP!');
}
```

### Conditions

**Endpoint:** `POST /v1/combat/{encounterId}/conditions/apply`

```typescript
interface ApplyConditionRequest {
  participantId: string;
  conditionName: string;
  durationType: 'rounds' | 'minutes' | 'hours' | 'until_save' | 'permanent';
  durationValue?: number;
  saveDc?: number;
  saveAbility?: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
  source?: string;
}

async function applyCondition(
  encounterId: string,
  condition: ApplyConditionRequest
): Promise<ConditionResult> {
  return apiRequest(`/v1/combat/${encounterId}/conditions/apply`, {
    method: 'POST',
    body: JSON.stringify(condition),
  });
}

// Example: Apply poisoned condition
await applyCondition(encounterId, {
  participantId: 'participant-123',
  conditionName: 'Poisoned',
  durationType: 'until_save',
  saveDc: 15,
  saveAbility: 'constitution',
  source: 'Giant Spider bite',
});
```

**Get Active Conditions:** `GET /v1/combat/{encounterId}/conditions/active`

**Remove Condition:** `DELETE /v1/combat/{encounterId}/conditions/{conditionId}`

**Attempt Save:** `POST /v1/combat/{encounterId}/conditions/{conditionId}/save`

### Advancing Turn Order

**Endpoint:** `POST /v1/combat/{encounterId}/next-turn`

```typescript
async function nextTurn(encounterId: string): Promise<AdvanceTurnResult> {
  return apiRequest(`/v1/combat/${encounterId}/next-turn`, {
    method: 'POST',
  });
}
```

### Complete Combat Workflow Example

```typescript
// 1. Start combat
const combat = await startCombat(sessionId);
const encounterId = combat.encounter.id;

// 2. Roll initiative for all participants
for (const participant of combat.participants) {
  const roll = Math.floor(Math.random() * 20) + 1;
  await rollInitiative(encounterId, participant.id, roll);
}

// 3. Get updated combat state
const state = await getCombatState(encounterId);

// 4. Current participant makes an attack
const attacker = state.currentParticipant;
const target = state.participants[1];

const attackRoll = Math.floor(Math.random() * 20) + 1;
const attackResult = await makeAttack(encounterId, {
  attackerId: attacker.id,
  targetId: target.id,
  attackRoll,
  attackBonus: 5,
  attackType: 'melee',
});

// 5. Move to next turn
await nextTurn(encounterId);
```

---

## Rest System

Manage short rests, long rests, and hit dice recovery following D&D 5E rules.

### Short Rest

**Endpoint:** `POST /v1/rest/characters/{characterId}/short`

```typescript
interface ShortRestRequest {
  hitDiceToSpend?: number;
  sessionId?: string;
  notes?: string;
}

interface ShortRestResult {
  hpRestored: number;
  hitDiceSpent: number;
  hitDiceRemaining: number;
  featuresRestored: string[];
}

async function takeShortRest(
  characterId: string,
  hitDiceCount: number = 0
): Promise<ShortRestResult> {
  return apiRequest<ShortRestResult>(
    `/v1/rest/characters/${characterId}/short`,
    {
      method: 'POST',
      body: JSON.stringify({
        hitDiceToSpend: hitDiceCount,
        notes: 'Rested after goblin encounter',
      }),
    }
  );
}

// Example: Spend 2 hit dice during short rest
const result = await takeShortRest(characterId, 2);
console.log(`Restored ${result.hpRestored} HP`);
console.log(`${result.hitDiceRemaining} hit dice remaining`);
```

### Long Rest

**Endpoint:** `POST /v1/rest/characters/{characterId}/long`

```typescript
interface LongRestResult {
  hpRestored: number;
  hitDiceRestored: number;
  spellSlotsRestored: boolean;
  featuresRestored: string[];
}

async function takeLongRest(characterId: string): Promise<LongRestResult> {
  return apiRequest<LongRestResult>(
    `/v1/rest/characters/${characterId}/long`,
    {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Long rest at the inn',
      }),
    }
  );
}

// Long rest restores all HP, half of hit dice, and all spell slots
const result = await takeLongRest(characterId);
console.log(`Fully healed! Restored ${result.hitDiceRestored} hit dice`);
```

### Spending Hit Dice

**Endpoint:** `POST /v1/rest/characters/{characterId}/hit-dice/spend`

```typescript
async function spendHitDice(
  characterId: string,
  count: number
): Promise<SpendHitDiceResult> {
  return apiRequest(`/v1/rest/characters/${characterId}/hit-dice/spend`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}
```

### Get Hit Dice

**Endpoint:** `GET /v1/rest/characters/{characterId}/hit-dice`

```typescript
interface HitDice {
  id: string;
  className: string;
  dieType: string;
  totalDice: number;
  usedDice: number;
}

async function getHitDice(characterId: string): Promise<HitDice[]> {
  const response = await apiRequest<{ hitDice: HitDice[] }>(
    `/v1/rest/characters/${characterId}/hit-dice`
  );
  return response.hitDice;
}
```

---

## Inventory System

Manage character inventory, equipment, consumables, ammunition, and attunement.

### Get Inventory

**Endpoint:** `GET /v1/characters/{characterId}/inventory`

```typescript
interface InventoryItem {
  id: string;
  name: string;
  itemType: 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure';
  quantity: number;
  weight: number;
  description?: string;
  properties?: Record<string, any>;
  isEquipped: boolean;
  isAttuned: boolean;
  requiresAttunement: boolean;
}

async function getInventory(
  characterId: string,
  filters?: {
    itemType?: string;
    equipped?: boolean;
  }
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (filters?.itemType) params.append('itemType', filters.itemType);
  if (filters?.equipped !== undefined) params.append('equipped', String(filters.equipped));

  const response = await apiRequest<{ items: InventoryItem[] }>(
    `/v1/characters/${characterId}/inventory?${params}`
  );
  return response.items;
}

// Get all equipped weapons
const weapons = await getInventory(characterId, {
  itemType: 'weapon',
  equipped: true,
});
```

### Add Item

**Endpoint:** `POST /v1/characters/{characterId}/inventory`

```typescript
interface CreateItemRequest {
  name: string;
  itemType: 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure';
  quantity?: number;
  weight?: number;
  description?: string;
  properties?: Record<string, any>;
  isEquipped?: boolean;
  requiresAttunement?: boolean;
}

async function addItem(
  characterId: string,
  item: CreateItemRequest
): Promise<InventoryItem> {
  const response = await apiRequest<{ item: InventoryItem }>(
    `/v1/characters/${characterId}/inventory`,
    {
      method: 'POST',
      body: JSON.stringify(item),
    }
  );
  return response.item;
}

// Add healing potion
const potion = await addItem(characterId, {
  name: 'Potion of Healing',
  itemType: 'consumable',
  quantity: 3,
  weight: 0.5,
  properties: {
    healingDice: '2d4+2',
    rarity: 'common',
  },
});
```

### Use Consumable

**Endpoint:** `POST /v1/characters/{characterId}/inventory/{itemId}/use`

```typescript
async function useConsumable(
  characterId: string,
  itemId: string,
  quantity: number = 1
): Promise<{ remainingQuantity: number; itemDeleted: boolean }> {
  return apiRequest(
    `/v1/characters/${characterId}/inventory/${itemId}/use`,
    {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }
  );
}

// Use a healing potion
const result = await useConsumable(characterId, potionId, 1);
if (result.itemDeleted) {
  console.log('Used last potion');
} else {
  console.log(`${result.remainingQuantity} potions remaining`);
}
```

### Equip/Unequip Item

**Endpoints:**
- `POST /v1/characters/{characterId}/inventory/{itemId}/equip`
- `POST /v1/characters/{characterId}/inventory/{itemId}/unequip`

```typescript
async function equipItem(characterId: string, itemId: string): Promise<void> {
  await apiRequest(
    `/v1/characters/${characterId}/inventory/${itemId}/equip`,
    { method: 'POST' }
  );
}

async function unequipItem(characterId: string, itemId: string): Promise<void> {
  await apiRequest(
    `/v1/characters/${characterId}/inventory/${itemId}/unequip`,
    { method: 'POST' }
  );
}
```

### Attunement

**Endpoints:**
- `POST /v1/characters/{characterId}/attune/{itemId}`
- `DELETE /v1/characters/{characterId}/attune/{itemId}`
- `GET /v1/characters/{characterId}/attuned`

```typescript
async function attuneItem(
  characterId: string,
  itemId: string
): Promise<AttunementResult> {
  return apiRequest(`/v1/characters/${characterId}/attune/${itemId}`, {
    method: 'POST',
  });
}

async function unattuneItem(characterId: string, itemId: string): Promise<void> {
  await apiRequest(`/v1/characters/${characterId}/attune/${itemId}`, {
    method: 'DELETE',
  });
}

// Attune to a magic item (max 3)
try {
  const result = await attuneItem(characterId, magicSwordId);
  console.log(`Attuned items: ${result.currentAttunedCount}/3`);
} catch (error) {
  if (error.code === 'MAX_ATTUNEMENT_REACHED') {
    console.log('Already attuned to 3 items. Unattune one first.');
  }
}
```

### Check Encumbrance

**Endpoint:** `GET /v1/characters/{characterId}/encumbrance`

```typescript
interface EncumbranceStatus {
  currentWeight: number;
  carryingCapacity: number;
  encumbranceLevel: 'normal' | 'encumbered' | 'heavily_encumbered';
  isEncumbered: boolean;
  speedPenalty: number;
  strengthScore: number;
}

async function checkEncumbrance(
  characterId: string
): Promise<EncumbranceStatus> {
  return apiRequest(`/v1/characters/${characterId}/encumbrance`);
}

// Check if character is over-encumbered
const status = await checkEncumbrance(characterId);
if (status.isEncumbered) {
  console.log(`Speed reduced by ${status.speedPenalty} feet`);
}
```

---

## Progression System

Handle experience points, leveling up, and character progression.

### Award XP

**Endpoint:** `POST /v1/progression/characters/{characterId}/experience/award`

```typescript
interface AwardXPRequest {
  xp: number;
  source: 'combat' | 'quest' | 'roleplay' | 'milestone' | 'other';
  description?: string;
  sessionId?: string;
}

interface AwardXPResult {
  totalXP: number;
  currentLevel: number;
  canLevelUp: boolean;
  xpForNextLevel: number;
}

async function awardXP(
  characterId: string,
  xp: number,
  source: string,
  description?: string
): Promise<AwardXPResult> {
  return apiRequest<AwardXPResult>(
    `/v1/progression/characters/${characterId}/experience/award`,
    {
      method: 'POST',
      body: JSON.stringify({ xp, source, description }),
    }
  );
}

// Award XP from combat
const result = await awardXP(
  characterId,
  450,
  'combat',
  'Defeated goblin war band'
);

if (result.canLevelUp) {
  console.log('Ready to level up!');
}
```

### Get Progression Status

**Endpoint:** `GET /v1/progression/characters/{characterId}/progression`

```typescript
interface ProgressionStatus {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  percentToNext: number;
  proficiencyBonus: number;
}

async function getProgression(characterId: string): Promise<ProgressionStatus> {
  return apiRequest(`/v1/progression/characters/${characterId}/progression`);
}

// Display progress bar
const progress = await getProgression(characterId);
console.log(`Level ${progress.level} - ${progress.percentToNext}% to next level`);
```

### Level Up

**Endpoint:** `POST /v1/progression/characters/{characterId}/level-up`

```typescript
interface LevelUpRequest {
  hpRoll?: number; // If not provided, uses average
  abilityScoreImprovements?: Array<{
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    increase: number;
  }>;
  featSelected?: string;
  spellsLearned?: string[];
}

interface LevelUpResult {
  characterId: string;
  oldLevel: number;
  newLevel: number;
  hpIncrease: {
    roll: number;
    conModifier: number;
    totalGained: number;
  };
  proficiencyBonus: number;
  newClassFeatures: Array<{
    name: string;
    description: string;
  }>;
}

async function levelUp(
  characterId: string,
  choices: LevelUpRequest
): Promise<LevelUpResult> {
  return apiRequest<LevelUpResult>(
    `/v1/progression/characters/${characterId}/level-up`,
    {
      method: 'POST',
      body: JSON.stringify(choices),
    }
  );
}

// Level up and increase Strength
const result = await levelUp(characterId, {
  hpRoll: 8, // Rolled for HP
  abilityScoreImprovements: [
    { ability: 'strength', increase: 2 },
  ],
});

console.log(`Now level ${result.newLevel}! Gained ${result.hpIncrease.totalGained} HP`);
```

### Get Level-Up Options

**Endpoint:** `GET /v1/progression/characters/{characterId}/level-up-options?newLevel=5`

```typescript
interface LevelUpOptions {
  newLevel: number;
  hpIncrease: {
    dieType: string;
    conModifier: number;
    averageRoll: number;
  };
  hasAbilityScoreImprovement: boolean;
  classFeatures: Array<{
    name: string;
    description: string;
  }>;
  proficiencyBonus: number;
}

async function getLevelUpOptions(
  characterId: string,
  newLevel: number
): Promise<LevelUpOptions> {
  return apiRequest(
    `/v1/progression/characters/${characterId}/level-up-options?newLevel=${newLevel}`
  );
}
```

---

## Class Features

Track and use class features, subclasses, and feature usage.

### Get Character Features

**Endpoint:** `GET /v1/characters/{characterId}/features`

```typescript
interface CharacterFeature {
  id: string;
  featureName: string;
  className: string;
  level: number;
  description: string;
  usesPerRest: number | null;
  currentUses: number;
  restType: 'short' | 'long' | null;
}

async function getCharacterFeatures(
  characterId: string
): Promise<CharacterFeature[]> {
  const response = await apiRequest<{ features: CharacterFeature[] }>(
    `/v1/characters/${characterId}/features`
  );
  return response.features;
}
```

### Use Feature

**Endpoint:** `POST /v1/characters/{characterId}/features/{featureId}/use`

```typescript
async function useFeature(
  characterId: string,
  featureId: string,
  context?: string
): Promise<{ success: boolean; usesRemaining: number }> {
  return apiRequest(
    `/v1/characters/${characterId}/features/${featureId}/use`,
    {
      method: 'POST',
      body: JSON.stringify({ context }),
    }
  );
}

// Use Action Surge
try {
  const result = await useFeature(characterId, actionSurgeId, 'Boss fight');
  console.log(`Action Surge used! ${result.usesRemaining} uses remaining`);
} catch (error) {
  console.log('No uses remaining');
}
```

### Restore Features After Rest

**Endpoint:** `POST /v1/characters/{characterId}/features/restore`

```typescript
async function restoreFeatures(
  characterId: string,
  restType: 'short' | 'long'
): Promise<{ featuresRestored: string[] }> {
  return apiRequest(`/v1/characters/${characterId}/features/restore`, {
    method: 'POST',
    body: JSON.stringify({ restType }),
  });
}
```

### Set Subclass

**Endpoint:** `POST /v1/characters/{characterId}/subclass`

```typescript
async function setSubclass(
  characterId: string,
  className: string,
  subclassName: string,
  level: number
): Promise<void> {
  await apiRequest(`/v1/characters/${characterId}/subclass`, {
    method: 'POST',
    body: JSON.stringify({ className, subclassName, level }),
  });
}
```

---

## Spell Slots

Manage spell slots for spellcasting classes, including upcasting and multiclass calculations.

### Get Spell Slots

**Endpoint:** `GET /v1/characters/{characterId}/spell-slots`

```typescript
interface SpellSlot {
  level: number; // 1-9
  current: number;
  max: number;
}

async function getSpellSlots(characterId: string): Promise<SpellSlot[]> {
  return apiRequest(`/v1/characters/${characterId}/spell-slots`);
}

// Display spell slots
const slots = await getSpellSlots(characterId);
slots.forEach(slot => {
  console.log(`Level ${slot.level}: ${slot.current}/${slot.max}`);
});
```

### Use Spell Slot

**Endpoint:** `POST /v1/characters/{characterId}/spell-slots/use`

```typescript
interface UseSpellSlotRequest {
  spellName: string;
  spellLevel: number; // Base spell level (0-9)
  slotLevelUsed: number; // Slot level consumed (1-9)
  sessionId?: string;
}

interface UseSpellSlotResult {
  success: boolean;
  message: string;
  slot: SpellSlot;
  wasUpcast: boolean;
}

async function useSpellSlot(
  characterId: string,
  spellName: string,
  spellLevel: number,
  slotLevel: number
): Promise<UseSpellSlotResult> {
  return apiRequest(`/v1/characters/${characterId}/spell-slots/use`, {
    method: 'POST',
    body: JSON.stringify({
      spellName,
      spellLevel,
      slotLevelUsed: slotLevel,
    }),
  });
}

// Cast Fireball (3rd level) using a 4th level slot (upcast)
try {
  const result = await useSpellSlot(characterId, 'Fireball', 3, 4);
  if (result.wasUpcast) {
    console.log('Spell was upcast for extra damage!');
  }
} catch (error) {
  console.log('No spell slots available');
}
```

### Restore Spell Slots

**Endpoint:** `POST /v1/characters/{characterId}/spell-slots/restore`

```typescript
async function restoreSpellSlots(
  characterId: string,
  level?: number // Restore specific level, or all if omitted
): Promise<{ totalRestored: number }> {
  return apiRequest(`/v1/characters/${characterId}/spell-slots/restore`, {
    method: 'POST',
    body: JSON.stringify({ level }),
  });
}

// Restore all spell slots (long rest)
await restoreSpellSlots(characterId);

// Restore only 1st level slots (Arcane Recovery)
await restoreSpellSlots(characterId, 1);
```

### Initialize Spell Slots

**Endpoint:** `POST /v1/characters/{characterId}/spell-slots/initialize`

```typescript
async function initializeSpellSlots(
  characterId: string,
  classes: Array<{ className: string; level: number }>
): Promise<SpellSlot[]> {
  return apiRequest(`/v1/characters/${characterId}/spell-slots/initialize`, {
    method: 'POST',
    body: JSON.stringify({ classes }),
  });
}

// Initialize for multiclass character
await initializeSpellSlots(characterId, [
  { className: 'Wizard', level: 5 },
  { className: 'Fighter', level: 2 },
]);
```

---

## Error Handling

All API errors follow a consistent format. See [ERROR_HANDLING.md](./ERROR_HANDLING.md) for complete documentation.

### Error Response Format

```typescript
interface ApiErrorResponse {
  error: {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  };
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BUSINESS_LOGIC_ERROR` | 422 | D&D rule violation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Handling Utility

```typescript
class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json();
    throw new ApiError(
      errorData.error.code,
      errorData.error.statusCode,
      errorData.error.message,
      errorData.error.details
    );
  }
  return response.json();
}

// Usage with error handling
try {
  const result = await makeAttack(encounterId, attackData);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NOT_FOUND':
        showNotification('Combat encounter not found');
        break;
      case 'BUSINESS_LOGIC_ERROR':
        showNotification(error.message);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        const retryAfter = error.details?.retryAfter || 60;
        showNotification(`Rate limited. Retry in ${retryAfter}s`);
        break;
      default:
        showNotification('An error occurred');
    }
  }
}
```

### Retry Logic for Rate Limits

See [RATE_LIMITS.md](./RATE_LIMITS.md) for complete documentation.

```typescript
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = error.details?.retryAfter || 60;
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## State Management

### React Query Integration

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query for combat state
function useCombat(encounterId: string) {
  return useQuery({
    queryKey: ['combat', encounterId],
    queryFn: () => getCombatState(encounterId),
    refetchInterval: 2000, // Poll every 2 seconds
  });
}

// Mutation for making attacks
function useAttack(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attack: AttackRequest) => makeAttack(encounterId, attack),
    onSuccess: () => {
      // Invalidate combat state to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['combat', encounterId] });
    },
  });
}

// Component usage
function CombatView({ encounterId }: { encounterId: string }) {
  const { data: combat, isLoading } = useCombat(encounterId);
  const attackMutation = useAttack(encounterId);

  const handleAttack = (targetId: string) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    attackMutation.mutate({
      attackerId: combat.currentParticipant.id,
      targetId,
      attackRoll: roll,
      attackBonus: 5,
      attackType: 'melee',
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Round {combat.encounter.currentRound}</h2>
      <CurrentTurn participant={combat.currentParticipant} />
      <button onClick={() => handleAttack(targetId)}>
        Attack
      </button>
    </div>
  );
}
```

### Optimistic Updates

```typescript
function useOptimisticAttack(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attack: AttackRequest) => makeAttack(encounterId, attack),
    onMutate: async (attack) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['combat', encounterId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['combat', encounterId]);

      // Optimistically update UI
      queryClient.setQueryData(['combat', encounterId], (old: CombatState) => {
        // Update HP optimistically
        return {
          ...old,
          participants: old.participants.map(p =>
            p.id === attack.targetId
              ? { ...p, hpCurrent: p.hpCurrent - 10 } // Estimated damage
              : p
          ),
        };
      });

      return { previous };
    },
    onError: (err, attack, context) => {
      // Rollback on error
      queryClient.setQueryData(['combat', encounterId], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['combat', encounterId] });
    },
  });
}
```

---

## Type Definitions

### Client Types Export

Create a `client-types.ts` file with all necessary types:

```typescript
// Combat Types
export interface CombatState {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  turnOrder: TurnOrderEntry[];
  currentParticipant: CombatParticipant | null;
}

export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  hpCurrent: number;
  hpMax: number;
  isActive: boolean;
  conditions: string[];
}

export interface AttackRequest {
  attackerId: string;
  targetId: string;
  attackRoll: number;
  attackBonus?: number;
  attackType: 'melee' | 'ranged' | 'spell';
  isCritical?: boolean;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  finalDamage: number;
  targetNewHp: number;
  targetIsConscious: boolean;
  isCritical: boolean;
}

// Spell Slot Types
export interface SpellSlot {
  level: number;
  current: number;
  max: number;
}

export interface UseSpellSlotRequest {
  spellName: string;
  spellLevel: number;
  slotLevelUsed: number;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  itemType: ItemType;
  quantity: number;
  weight: number;
  isEquipped: boolean;
  isAttuned: boolean;
  requiresAttunement: boolean;
}

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure';

// Progression Types
export interface ProgressionStatus {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  percentToNext: number;
  proficiencyBonus: number;
}

// Error Types
export interface ApiErrorResponse {
  error: {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  };
}
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
// Good
try {
  const result = await makeAttack(encounterId, attack);
  handleSuccess(result);
} catch (error) {
  handleError(error);
}

// Bad
const result = await makeAttack(encounterId, attack); // Unhandled rejection
```

### 2. Use Polling for Real-Time Updates

```typescript
// Combat state changes frequently - poll every 2-3 seconds
useQuery({
  queryKey: ['combat', encounterId],
  queryFn: () => getCombatState(encounterId),
  refetchInterval: 2000,
});

// Character data changes infrequently - poll less often or on-demand
useQuery({
  queryKey: ['character', characterId],
  queryFn: () => getCharacter(characterId),
  refetchInterval: false, // Only refetch manually
});
```

### 3. Implement Request Cancellation

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(handleResponse)
    .catch(handleError);

  return () => controller.abort();
}, [url]);
```

### 4. Cache API Responses

```typescript
// Use React Query's built-in caching
const { data } = useQuery({
  queryKey: ['spells'],
  queryFn: getSpells,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 5. Respect Rate Limits

See [RATE_LIMITS.md](./RATE_LIMITS.md) for detailed rate limiting information.

- Free tier: 60 requests/minute
- Pro tier: 600 requests/minute
- Enterprise tier: 2000 requests/minute

```typescript
// Implement exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6. Validate Input Before API Calls

```typescript
// Validate level before leveling up
async function safeLevelUp(characterId: string, choices: LevelUpRequest) {
  const progress = await getProgression(characterId);

  if (!progress.canLevelUp) {
    throw new Error('Insufficient XP to level up');
  }

  return levelUp(characterId, choices);
}
```

### 7. Provide User Feedback

```typescript
// Show loading states
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;

// Show optimistic updates
<button
  onClick={handleAttack}
  disabled={attackMutation.isPending}
>
  {attackMutation.isPending ? 'Attacking...' : 'Attack'}
</button>
```

---

## Complete Examples

### Combat Component

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function CombatManager({ sessionId }: { sessionId: string }) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Start combat
  const startCombatMutation = useMutation({
    mutationFn: () => startCombat(sessionId),
    onSuccess: (data) => {
      setEncounterId(data.encounter.id);
    },
  });

  // Get combat state
  const { data: combat } = useQuery({
    queryKey: ['combat', encounterId],
    queryFn: () => getCombatState(encounterId!),
    enabled: !!encounterId,
    refetchInterval: 2000,
  });

  // Make attack
  const attackMutation = useMutation({
    mutationFn: (attack: AttackRequest) =>
      makeAttack(encounterId!, attack),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['combat', encounterId]
      });
    },
  });

  // Next turn
  const nextTurnMutation = useMutation({
    mutationFn: () => nextTurn(encounterId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['combat', encounterId]
      });
    },
  });

  if (!encounterId) {
    return (
      <button onClick={() => startCombatMutation.mutate()}>
        Start Combat
      </button>
    );
  }

  if (!combat) return <div>Loading...</div>;

  return (
    <div className="combat-view">
      <h2>Round {combat.encounter.currentRound}</h2>

      <div className="current-turn">
        <h3>{combat.currentParticipant?.name}'s Turn</h3>
        <p>HP: {combat.currentParticipant?.hpCurrent}/{combat.currentParticipant?.hpMax}</p>
      </div>

      <div className="participants">
        {combat.participants.map(p => (
          <div key={p.id} className="participant">
            <span>{p.name}</span>
            <span>{p.hpCurrent}/{p.hpMax} HP</span>
            {p.id !== combat.currentParticipant?.id && (
              <button
                onClick={() => attackMutation.mutate({
                  attackerId: combat.currentParticipant!.id,
                  targetId: p.id,
                  attackRoll: Math.floor(Math.random() * 20) + 1,
                  attackBonus: 5,
                  attackType: 'melee',
                })}
              >
                Attack
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => nextTurnMutation.mutate()}>
        Next Turn
      </button>
    </div>
  );
}
```

### Character Sheet Component

```typescript
function CharacterSheet({ characterId }: { characterId: string }) {
  const queryClient = useQueryClient();

  // Get character data
  const { data: progression } = useQuery({
    queryKey: ['progression', characterId],
    queryFn: () => getProgression(characterId),
  });

  const { data: spellSlots } = useQuery({
    queryKey: ['spellSlots', characterId],
    queryFn: () => getSpellSlots(characterId),
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory', characterId],
    queryFn: () => getInventory(characterId),
  });

  // Cast spell mutation
  const castSpellMutation = useMutation({
    mutationFn: (spell: { name: string; level: number; slot: number }) =>
      useSpellSlot(characterId, spell.name, spell.level, spell.slot),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['spellSlots', characterId]
      });
    },
  });

  // Short rest mutation
  const shortRestMutation = useMutation({
    mutationFn: (hitDice: number) => takeShortRest(characterId, hitDice),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['progression', characterId]
      });
      queryClient.invalidateQueries({
        queryKey: ['spellSlots', characterId]
      });
    },
  });

  return (
    <div className="character-sheet">
      <h1>Level {progression?.level} Character</h1>

      <div className="xp-bar">
        <div
          className="xp-progress"
          style={{ width: `${progression?.percentToNext}%` }}
        />
        <span>{progression?.xp} / {progression?.xpToNext} XP</span>
      </div>

      <div className="spell-slots">
        <h3>Spell Slots</h3>
        {spellSlots?.map(slot => (
          <div key={slot.level}>
            Level {slot.level}: {slot.current}/{slot.max}
          </div>
        ))}
      </div>

      <div className="inventory">
        <h3>Inventory</h3>
        {inventory?.map(item => (
          <div key={item.id}>
            {item.name} x{item.quantity}
            {item.isEquipped && <span> (Equipped)</span>}
          </div>
        ))}
      </div>

      <button onClick={() => shortRestMutation.mutate(1)}>
        Short Rest (Spend 1 Hit Die)
      </button>
    </div>
  );
}
```

---

## Additional Resources

- **API Reference:** `/api-docs` (Swagger/OpenAPI documentation)
- **Error Handling Guide:** [ERROR_HANDLING.md](./ERROR_HANDLING.md)
- **Rate Limiting Guide:** [RATE_LIMITS.md](./RATE_LIMITS.md)
- **TypeScript Patterns:** [TYPESCRIPT_PATTERNS.md](./TYPESCRIPT_PATTERNS.md)

---

## Need Help?

- **Discord:** [Community Server](https://discord.gg/aiadventurescribe)
- **Email:** support@aiadventurescribe.com
- **GitHub Issues:** Report bugs or request features

---

*Last updated: 2025-11-14*
*Version: 2.0.0*
