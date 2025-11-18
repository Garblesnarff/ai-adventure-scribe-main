# D&D 5E Rules Engine - Comprehensive Analysis

## Executive Summary

The D&D 5E Rules Engine is a **deterministic, server-authoritative combat resolution system** implemented in TypeScript. It provides a pure functional interface for resolving D&D 5th Edition SRD combat mechanics using seed-based random number generation. The engine is currently **built but not yet integrated** with the main combat API endpoints, which use separate service classes.

---

## 1. Architecture Overview

### 1.1 Core Design Principles

**Deterministic Execution**
- Uses **Mulberry32 PRNG** (Pseudo-Random Number Generator) with seed-based initialization
- Same seed + same input = same output (critical for replays, testing, and debugging)
- Seeds can be strings or numbers, hashed consistently using FNV-1a-inspired algorithm

**Pure Functional Design**
- No side effects - functions don't mutate input state
- All state changes returned as new objects
- Stateless resolver functions enable easy testing and composition

**Server-Authoritative**
- All dice rolling and rule resolution happens server-side
- Prevents client-side cheating
- Client sends action requests, server returns authoritative results

### 1.2 File Structure

```
/server/src/rules/
├── rules-engine.ts    # Main entry point - action dispatcher
├── actions.ts         # Core resolution functions (attack, checks, etc.)
├── state.ts           # Type definitions for actors, encounters, actions
└── dice.ts            # Deterministic RNG and dice rolling utilities
```

### 1.3 Supported Actions

The engine supports **10 distinct action types**:

| Action | Description | Use Case |
|--------|-------------|----------|
| `attack` | Weapon attack with d20 + modifiers vs AC | Melee/ranged combat |
| `abilityCheck` | Skill check or raw ability check | Investigation, Athletics, etc. |
| `savingThrow` | Constitution, Dexterity saves, etc. | Spell effects, traps |
| `contestedCheck` | Two actors competing (e.g., grapple) | Opposed rolls |
| `initiative` | Roll initiative for all combatants | Combat start |
| `opportunityAttack` | Triggered reaction attack | Movement provocation |
| `deathSave` | Roll to stabilize when at 0 HP | Death's door |
| `concentrationCheck` | Maintain spell concentration after damage | Spell concentration |
| `rest` | Short or long rest recovery | HP/spell slot recovery |
| `expendSpellSlot` | Use a spell slot of specified level | Spellcasting |

---

## 2. Core Components

### 2.1 Actor Interface

An `Actor` represents any combatant (PC, NPC, monster):

```typescript
type Actor = {
  // Identity
  id: string;
  name: string;
  class?: string;
  level: number;
  size: Size; // tiny|small|medium|large|huge|gargantuan

  // Core Stats
  abilities: AbilityScores; // str, dex, con, int, wis, cha (3-30)
  proficiencyBonus?: number; // default: derived from level

  // Combat Stats
  ac: ArmorClass; // base + shieldBonus + miscBonus
  maxHp: number;
  currentHp: number;
  tempHp?: number;
  speed: number; // walking speed in feet

  // Proficiencies
  savingThrowProficiencies?: Partial<Record<Ability, boolean>>;
  skillProficiencies?: Partial<Record<Skill, boolean>>;

  // Defenses
  resistances?: {
    immune?: DamageType[];
    resistant?: DamageType[]; // half damage
    vulnerable?: DamageType[]; // double damage
  };

  // Status Effects
  conditions?: {
    blinded?: boolean;
    invisible?: boolean;
    poisoned?: boolean;
    prone?: boolean;
    restrained?: boolean;
    stunned?: boolean;
    unconscious?: boolean;
    frightened?: boolean;
    grappled?: boolean;
    incapacitated?: boolean;
    concentrating?: boolean;
    deathSaves?: { successes: number; failures: number };
    exhaustion?: number; // 0-6
    inspiration?: boolean; // grants advantage when used
  };

  // Spellcasting
  spellSlots?: Partial<Record<1|2|3|4|5|6|7|8|9, {
    total: number;
    expended: number;
  }>>;

  // Equipment
  weapons?: Weapon[];
};
```

**Key Design Notes:**
- **Canonical Server State**: All values are authoritative from DB
- **Derived Values Optional**: Proficiency bonus can be calculated from level if omitted
- **Resistance System**: Supports immune (0%), resistant (50%), vulnerable (200%)
- **Inspiration**: Automatically applies advantage if available and no other advantage/disadvantage

### 2.2 Encounter State

```typescript
type Encounter = {
  id: string;
  round: number; // 1-based round counter
  initiative?: Array<{ actorId: string; value: number }>;
  cover?: Record<string, Cover>; // defenderId -> cover level
  threatenedBy?: Record<string, string[]>; // defenderId -> attackerIds[]
};
```

**Turn Economy** (separate from Encounter):
```typescript
type TurnEconomy = {
  actionAvailable: boolean;      // Attack, Cast Spell, Dash, etc.
  bonusActionAvailable: boolean; // Off-hand attack, certain spells
  reactionAvailable: boolean;    // Opportunity Attack, Shield spell
  movementRemaining: number;     // feet (resets each turn)
};
```

### 2.3 Action Request/Response Flow

**Input Format:**
```typescript
type RulesActionRequest = {
  seed?: string | number;           // RNG seed for determinism
  encounter: Encounter;              // Current encounter state
  actors: Record<string, Actor>;     // All involved actors by ID
  actorId?: string;                  // Primary actor performing action
  targetId?: string;                 // Optional target
  action: ActionType;                // Which action to resolve
  payload?: any;                     // Action-specific context
};
```

**Output Format:**
```typescript
type RulesActionResult =
  | AttackOutcome
  | CheckOutcome
  | InitiativeOutcome
  | OpportunityAttackOutcome
  | DeathSaveOutcome
  | ConcentrationOutcome
  | RestOutcome
  | SpellSlotOutcome;
```

Each outcome type includes:
- Deterministic results (rolls, totals, success/failure)
- Resource expenditure (action used, spell slots, inspiration)
- Detailed breakdown for narration

---

## 3. D&D 5E Specific Mechanics

### 3.1 Attack Resolution

**Formula:** `d20 + ability modifier + proficiency bonus + magical bonus >= target AC`

**Implementation Flow:**
```typescript
// 1. Determine attack ability (STR or DEX, can be overridden)
const ability = ctx.attackAbilityOverride ?? weapon.ability;

// 2. Calculate attack bonus
const attackBonus = abilityMod(attacker.abilities[ability])
                  + (proficient ? proficiencyBonus : 0)
                  + (weapon.magicalBonus ?? 0);

// 3. Roll d20 with advantage/disadvantage
const roll = rollD20(rng, { advantage, disadvantage });

// 4. Check for critical hit (natural 20, or criticalOn threshold)
const isCrit = roll.roll >= (ctx.criticalOn ?? 20);

// 5. Apply cover bonuses to AC
const targetAC = defender.ac.base + coverBonus;

// 6. Determine hit
const hit = isCrit || (roll.roll + attackBonus >= targetAC);

// 7. Roll damage if hit (double dice on crit)
if (hit) {
  const dice = isCrit ? doubleDice(weapon.damageDice) : weapon.damageDice;
  const damage = rollDice(rng, dice);
  applyResistances(damage, defender.resistances);
}
```

**Cover System:**
- **Half Cover:** +2 AC, +2 DEX saves
- **Three-Quarters Cover:** +5 AC, +5 DEX saves
- **Full Cover:** Cannot be targeted (AC +999 sentinel value, blocks attack entirely)

**Critical Hit Mechanics:**
- Natural 20 = automatic hit + critical
- Double damage dice (not modifiers)
- Bonus damage dice also doubled (e.g., Hex, Divine Smite)

### 3.2 Advantage/Disadvantage System

**Rules:**
- **Advantage:** Roll 2d20, take higher
- **Disadvantage:** Roll 2d20, take lower
- **Both:** Cancel out, roll 1d20 normally

**Inspiration Integration:**
```typescript
// Automatically uses inspiration if:
// 1. Actor has inspiration condition
// 2. No advantage/disadvantage already specified
const useInspiration = !ctx.advantage && !ctx.disadvantage && actor.conditions?.inspiration;
const roll = rollD20(rng, { advantage: ctx.advantage || useInspiration, ... });
```

**Sources in Code:**
- Explicit advantage/disadvantage flags in context
- Inspiration consumption tracked in outcome
- Conditions (invisible, prone, etc.) not auto-applied (DM decides)

### 3.3 Death Saves

**D&D 5E Rules:**
- When at 0 HP, roll d20 each turn
- **DC 10:** Success if 10+, failure if 9 or less
- **Natural 20:** Regain 1 HP immediately (critical success)
- **Natural 1:** Count as 2 failures (critical failure)
- **3 Successes:** Stabilize at 0 HP
- **3 Failures:** Dead

**Implementation:**
```typescript
function resolveDeathSave(rng: RNG, actor: Actor): DeathSaveOutcome {
  const current = actor.conditions?.deathSaves ?? { successes: 0, failures: 0 };
  const { roll } = rollD20(rng);

  if (roll === 1) {
    return { failures: current.failures + 2, criticalFailure: true };
  } else if (roll === 20) {
    return { successes: current.successes + 1, criticalSuccess: true };
  } else if (roll >= 10) {
    return { successes: current.successes + 1, success: true };
  } else {
    return { failures: current.failures + 1, success: false };
  }
}
```

### 3.4 Concentration Checks

**Triggered when:** Concentrating caster takes damage

**DC Calculation:** `max(10, floor(damageTaken / 2))`

**Resolution:**
```typescript
function resolveConcentrationCheck(rng: RNG, actor: Actor, ctx: { damageTaken: number }) {
  const dc = Math.max(10, Math.floor(ctx.damageTaken / 2));
  const conMod = abilityMod(actor.abilities.con);
  const { roll } = rollD20(rng);
  const total = roll + conMod;
  const maintained = total >= dc;
  return { maintained, dc, roll, total };
}
```

**Notes:**
- No proficiency bonus unless explicitly War Caster feat (not modeled)
- Advantage from Resilient (CON) must be passed in context
- Multiple hits = multiple checks

### 3.5 Spell Slots

**Tracking:**
```typescript
type SpellSlots = Partial<Record<1|2|3|4|5|6|7|8|9, {
  total: number;
  expended: number;
}>>;
```

**Expending a Slot:**
```typescript
function expendSpellSlot(actor: Actor, level: 1|2|3|4|5|6|7|8|9) {
  const slots = actor.spellSlots?.[level];
  if (!slots || slots.expended >= slots.total) {
    return { success: false };
  }
  return { success: true, remaining: slots.total - (slots.expended + 1) };
}
```

**Recovery:**
- **Long Rest:** All slots restored
- **Short Rest:** No slot recovery (except Warlock pact slots - not modeled)

### 3.6 Rests

**Short Rest (1 hour):**
- Regain some Hit Dice (not tracked by engine)
- Warlock slots recover (not modeled)

**Long Rest (8 hours):**
- Restore HP to maximum
- Restore all spell slots
- Regain half spent Hit Dice (not tracked)

**Implementation:**
```typescript
function resolveRest(actor: Actor, restType: 'short' | 'long'): RestOutcome {
  const effects: string[] = [];
  if (restType === 'long') {
    effects.push('restore hit points to max');
    effects.push('restore all spell slots');
  } else {
    effects.push('regain some hit dice (not tracked)');
  }
  return { type: 'rest', rest: restType, effects };
}
```

### 3.7 Opportunity Attacks

**Trigger Conditions:**
- Enemy leaves your reach without Disengage action
- You have a reaction available

**Implementation:**
```typescript
function resolveOpportunityAttack(
  mover: Actor,
  reactor: Actor,
  ctx: { inReachBefore: boolean; inReachAfter: boolean },
  reactorTurnEconomy?: { reactionAvailable: boolean }
) {
  const triggered = ctx.inReachBefore
                 && !ctx.inReachAfter
                 && (reactorTurnEconomy?.reactionAvailable ?? true);
  return { triggered, reactorId: reactor.id, moverId: mover.id };
}
```

**Notes:**
- Engine only determines IF triggered, not resolution
- Actual attack would be separate `attack` action
- No reach calculation (5ft, 10ft weapons) - caller provides

---

## 4. Integration Points

### 4.1 How AI DM Would Call the Engine

**Current Status:** The rules engine is **NOT YET INTEGRATED** with the combat API.

**Current Implementation:**
- Combat routes (`/server/src/routes/v1/combat.ts`) use service classes:
  - `CombatInitiativeService` - Initiative rolling
  - `CombatAttackService` - Attack resolution
  - `CombatHPService` - Damage tracking
  - `ConditionsService` - Status effects
- These services interact directly with Supabase database
- Rules engine exists in parallel, unused

**Proposed Integration Pattern:**

```typescript
// AI DM decides action based on player narration
const aiDecision = {
  action: 'attack',
  actorId: 'player-wizard-123',
  targetId: 'goblin-456',
  weaponName: 'Staff',
};

// Fetch current game state from database
const encounter = await db.getEncounter(encounterId);
const actors = await db.getActorsInEncounter(encounterId);
const playerActor = actors['player-wizard-123'];
const weapon = playerActor.weapons.find(w => w.name === 'Staff');

// Call rules engine
const result = resolveAction({
  seed: `${encounter.id}-${encounter.round}-${Date.now()}`, // unique per action
  encounter,
  actors,
  actorId: 'player-wizard-123',
  targetId: 'goblin-456',
  action: 'attack',
  payload: {
    weapon,
    targetAC: actors['goblin-456'].ac.base,
    advantage: false, // AI determines from context
    disadvantage: false,
  },
});

// Update database with results
if (result.type === 'attack' && result.hit.kind === 'hit') {
  await db.applyDamage(
    'goblin-456',
    result.damage.totalAfterReduction
  );
}

// AI narrates outcome
const narration = generateNarration(result);
// "You swing your staff at the goblin. The attack hits for 5 damage!"
```

### 4.2 Input/Output Formats

**Example Attack Request:**
```json
{
  "seed": "encounter-123-round-2-action-1",
  "encounter": {
    "id": "enc-123",
    "round": 2
  },
  "actors": {
    "pc-1": {
      "id": "pc-1",
      "name": "Thorin",
      "level": 5,
      "abilities": { "str": 16, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 10 },
      "ac": { "base": 16 },
      "maxHp": 40,
      "currentHp": 40,
      "speed": 30,
      "size": "medium",
      "weapons": [{
        "name": "Longsword",
        "ability": "str",
        "proficient": true,
        "damageDice": "1d8",
        "damageType": "slashing"
      }]
    },
    "goblin-1": {
      "id": "goblin-1",
      "name": "Goblin",
      "level": 1,
      "abilities": { "str": 8, "dex": 14, "con": 10, "int": 10, "wis": 8, "cha": 8 },
      "ac": { "base": 15 },
      "maxHp": 7,
      "currentHp": 7,
      "speed": 30,
      "size": "small"
    }
  },
  "actorId": "pc-1",
  "targetId": "goblin-1",
  "action": "attack",
  "payload": {
    "weapon": {
      "name": "Longsword",
      "ability": "str",
      "proficient": true,
      "damageDice": "1d8",
      "damageType": "slashing"
    },
    "targetAC": 15,
    "advantage": false
  }
}
```

**Example Attack Response:**
```json
{
  "type": "attack",
  "hit": {
    "kind": "hit",
    "critical": false,
    "roll": 14,
    "total": 19,
    "targetAC": 15,
    "details": ["proficient"]
  },
  "damage": {
    "input": [
      { "amount": 5, "type": "slashing", "critical": false }
    ],
    "totalBeforeReduction": 5,
    "totalAfterReduction": 5,
    "breakdown": [
      { "type": "slashing", "amount": 5, "adjusted": 5 }
    ]
  },
  "expended": {
    "actionAvailable": false
  },
  "usedInspiration": false
}
```

### 4.3 Seed-Based Determinism

**Why Seeds Matter:**
1. **Replay Attacks:** Reproduce exact combat sequences for debugging
2. **Testing:** Validate mechanics with known outcomes
3. **Auditing:** Verify fair play in competitive scenarios
4. **Synchronization:** Multiple clients can verify results

**Seed Generation Strategies:**

```typescript
// Unique per action (recommended)
const seed = `${encounterId}-round${round}-turn${turnIndex}-action${actionCount}`;

// Time-based (less reproducible)
const seed = `${encounterId}-${Date.now()}`;

// User-provided (for replays)
const seed = 12345; // numeric seed

// No seed (random, non-reproducible)
const result = resolveAction({ seed: undefined, ... });
```

**Hashing Algorithm:**
```typescript
function hashSeed(input: string | number | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0xABCDEF01; // default seed

  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}
```

---

## 5. Multi-System Support Recommendations

### 5.1 Current State

The engine is **tightly coupled to D&D 5E**:
- D&D-specific types (ability scores, AC, HP)
- D&D mechanics (advantage/disadvantage, death saves)
- D&D proficiency bonus scaling

### 5.2 Abstraction Strategy

**Option A: Polymorphic Engine Pattern**

```typescript
interface RulesEngine {
  resolveAction(request: RulesActionRequest): RulesActionResult;
  getSupportedActions(): ActionType[];
}

class DnD5EEngine implements RulesEngine { ... }
class OSEEngine implements RulesEngine { ... }
class CairnEngine implements RulesEngine { ... }
class KnaveEngine implements RulesEngine { ... }

// Router
function getEngine(gameSystem: string): RulesEngine {
  switch (gameSystem) {
    case 'dnd5e': return new DnD5EEngine();
    case 'ose': return new OSEEngine();
    case 'cairn': return new CairnEngine();
    case 'knave': return new KnaveEngine();
    default: throw new Error('Unsupported system');
  }
}
```

**Option B: Shared Core + System Modules**

```
/rules/
  core/
    dice.ts           # Shared RNG
    types.ts          # Universal types
  systems/
    dnd5e/
      engine.ts
      types.ts
      actions.ts
    ose/
      engine.ts
      types.ts
      actions.ts
    cairn/
      engine.ts
      types.ts
      actions.ts
```

### 5.3 System Differences Analysis

| Mechanic | D&D 5E | OSE | Cairn | Knave |
|----------|--------|-----|-------|-------|
| **Core Roll** | d20 + mods vs DC | d20 roll-under ability | d20 roll-under ability | d20 + mods vs DC |
| **Attack Roll** | d20 + bonus vs AC | THAC0 or d20 under | d20 under STR/DEX | d20 + bonus vs AC |
| **Saving Throws** | d20 + mod vs DC | Roll under category save | d20 under ability | d20 + ability vs DC |
| **Advantage/Disadvantage** | 2d20 take high/low | Not in system | Not in system | Not in system |
| **AC Calculation** | 10 + DEX + armor | Descending AC 9-2 | No AC (damage reduction) | Ascending AC 11+ |
| **Death** | 3 saves | 0 HP = dead or roll | 0 STR = dead | 0 HP = scars/death |
| **Proficiency** | +2 to +6 by level | No proficiency bonus | No proficiency | +1 to +10 by level |
| **Spell Slots** | Vancian per level | Vancian per level | Inventory-based | Inventory-based |

### 5.4 Abstracted Actor Model

**Universal Actor Interface:**
```typescript
type UniversalActor = {
  id: string;
  name: string;
  system: 'dnd5e' | 'ose' | 'cairn' | 'knave';
  level: number;
  attributes: Record<string, number>; // flexible attribute names
  derivedStats: Record<string, number>; // AC, HP, etc.
  inventory?: Item[];
  conditions?: string[];
  metadata?: Record<string, any>; // system-specific data
};

// System-specific mappers
function toDnD5EActor(universal: UniversalActor): DnD5EActor { ... }
function toOSEActor(universal: UniversalActor): OSEActor { ... }
```

### 5.5 Action Type Mapping

**D&D 5E Actions:**
- `attack`, `abilityCheck`, `savingThrow`, `deathSave`, `concentrationCheck`

**OSE Actions:**
- `attack` (THAC0), `savingThrow` (death/wands/paralysis/breath/spells), `turnUndead`, `listen`, `openDoors`

**Cairn Actions:**
- `savingThrow` (STR/DEX/WIL), `damageReduction`, `criticalDamage`, `scars`

**Knave Actions:**
- `attack`, `savingThrow`, `inventorySlots`, `itemQuality`

**Unified Dispatcher:**
```typescript
function resolveAction(request: UniversalActionRequest): UniversalActionResult {
  const engine = getEngine(request.system);
  return engine.resolveAction(request);
}
```

### 5.6 Database Schema Changes

**Current Schema (D&D 5E specific):**
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  name TEXT,
  class TEXT,
  level INTEGER,
  str INTEGER,
  dex INTEGER,
  con INTEGER,
  int INTEGER,
  wis INTEGER,
  cha INTEGER,
  ...
);
```

**Proposed Multi-System Schema:**
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  name TEXT,
  game_system TEXT NOT NULL, -- 'dnd5e', 'ose', 'cairn', 'knave'
  level INTEGER,
  attributes JSONB, -- { "str": 14, "dex": 12, ... } or { "STR": 10, "DEX": 8 }
  derived_stats JSONB, -- { "ac": 15, "hp": 24, "saves": {...} }
  inventory JSONB,
  conditions JSONB,
  metadata JSONB, -- system-specific overrides
  ...
);
```

### 5.7 Implementation Roadmap

**Phase 1: Extract Core (2-3 days)**
- Move `dice.ts` to shared core
- Create `UniversalActor` and `UniversalActionRequest` types
- Implement system router

**Phase 2: Refactor D&D 5E (1-2 days)**
- Move current engine to `/systems/dnd5e/`
- Implement `DnD5EEngine` class
- Ensure backward compatibility

**Phase 3: Implement OSE (3-5 days)**
- Create `/systems/ose/` with engine
- Implement THAC0 attack resolution
- Implement classic saving throws (death, wands, paralysis, breath, spells)
- Test parity with OSE SRD

**Phase 4: Implement Cairn (2-3 days)**
- Create `/systems/cairn/` with engine
- Implement roll-under mechanics
- Implement critical damage and scars system
- Implement inventory-based spellcasting

**Phase 5: Implement Knave (2-3 days)**
- Create `/systems/knave/` with engine
- Implement d20 + ability vs DC
- Implement item slot system
- Implement item quality rolls

**Phase 6: Integration (3-5 days)**
- Update combat services to use rules engine
- Add system detection from character data
- Update AI prompts for multi-system narration

---

## 6. Testing & Validation

### 6.1 Current Test Coverage

**Test Files:**
- `/server/tests/rules/attack.spec.ts` - Attack resolution, cover, resistances
- `/server/tests/rules/checks.spec.ts` - Ability checks, saves, contested rolls
- `/server/tests/rules/death-concentration-rest-slots.spec.ts` - Death saves, concentration, rests
- `/server/tests/rules/determinism.spec.ts` - Seed-based reproducibility
- `/server/tests/rules/initiative.spec.ts` - Initiative rolling and tiebreakers
- `/server/tests/rules/opportunity-attack.spec.ts` - OA triggering logic

**Coverage Focus:**
- ✅ Deterministic outcomes with same seed
- ✅ Critical hits (double dice)
- ✅ Cover bonuses
- ✅ Resistance/vulnerability/immunity
- ✅ Advantage/disadvantage
- ✅ Death save tracking
- ✅ Initiative tiebreakers
- ✅ Spell slot expenditure

### 6.2 Validation Against SRD

**Verified Mechanics:**
- Attack rolls: `1d20 + proficiency + ability mod`
- Critical hits on natural 20 (configurable threshold)
- Cover: +2 (half), +5 (3/4), immune (full)
- Damage resistance: `floor(damage / 2)`
- Proficiency bonus: +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20)
- Death saves: 10+ success, nat 20 = +1 HP, nat 1 = 2 failures
- Concentration DC: `max(10, floor(damage / 2))`

**Not Yet Modeled:**
- Spell effects (AI narrates, engine doesn't enforce)
- Class features (Sneak Attack, Rage, etc.)
- Feats (Great Weapon Master, Sharpshooter)
- Multiclassing
- Environmental hazards beyond cover

---

## 7. Strengths & Limitations

### 7.1 Strengths

✅ **Pure Functional Design**
- Easy to test (no side effects)
- Easy to reason about (input → output)
- Easy to extend (add new actions)

✅ **Deterministic Execution**
- Reproducible results for debugging
- Enables replay functionality
- Audit trail for fairness

✅ **Type-Safe**
- TypeScript prevents runtime errors
- Clear contracts between components
- IntelliSense support for developers

✅ **Modular Architecture**
- Clear separation: dice.ts, state.ts, actions.ts, rules-engine.ts
- Easy to swap RNG implementation
- Testable in isolation

### 7.2 Limitations

❌ **Not Yet Integrated**
- Rules engine exists but isn't called by combat API
- Parallel implementations in service classes
- Duplication of logic

❌ **Limited Scope**
- Only models core combat mechanics
- No spell effect resolution (fireball area, etc.)
- No class features (Action Surge, Divine Smite)
- No environmental effects (difficult terrain, etc.)

❌ **D&D 5E Only**
- Tightly coupled to D&D 5E types
- Would require significant refactor for other systems
- No abstraction layer for game system switching

❌ **No State Management**
- Engine is stateless (by design)
- Caller must manage encounter state updates
- No built-in persistence

---

## 8. Next Steps

### 8.1 Immediate Actions

1. **Integrate with Combat API** (High Priority)
   - Replace `CombatAttackService` logic with rules engine
   - Update attack endpoints to call `resolveAction`
   - Maintain database state after each action

2. **Add AI DM Integration** (High Priority)
   - Create helper functions for AI to construct requests
   - Add narration templates based on outcomes
   - Implement action suggestion system

3. **Expand Test Coverage** (Medium Priority)
   - Add tests for edge cases (0 HP, negative modifiers)
   - Add property-based testing (QuickCheck style)
   - Benchmark performance

### 8.2 Future Enhancements

1. **Multi-System Support** (Follows roadmap in 5.7)
2. **Class Features Module**
   - Sneak Attack, Rage, Divine Smite
   - Action economy modifiers (Action Surge)
   - Bonus action spells
3. **Spell Effects Engine**
   - Area of effect calculations
   - Saving throw mass resolution
   - Duration tracking
4. **Tactical AI**
   - Use rules engine for NPC decision-making
   - Evaluate optimal actions based on probabilities
   - Adaptive difficulty

---

## 9. Conclusion

The D&D 5E Rules Engine is a **well-architected, deterministic combat resolution system** that accurately implements core D&D 5th Edition SRD mechanics. Its **pure functional design** and **seed-based RNG** make it ideal for server-authoritative gameplay with replay capabilities.

**Current State:** Production-ready but **not yet integrated** with the main combat API.

**Recommended Priority:** Integrate with existing combat routes first, then expand to multi-system support following the roadmap in section 5.7.

**Key Files:**
- `/home/user/ai-adventure-scribe-main/server/src/rules/rules-engine.ts`
- `/home/user/ai-adventure-scribe-main/server/src/rules/actions.ts`
- `/home/user/ai-adventure-scribe-main/server/src/rules/state.ts`
- `/home/user/ai-adventure-scribe-main/server/src/rules/dice.ts`

---

## Appendix: Code Examples

### A. Attack Resolution Example

```typescript
import { resolveAction } from '@/rules/rules-engine';

const result = resolveAction({
  seed: 'combat-123-round-1-action-1',
  encounter: { id: 'enc-1', round: 1 },
  actors: {
    'fighter': {
      id: 'fighter',
      name: 'Thorin',
      level: 5,
      abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
      ac: { base: 16 },
      maxHp: 40,
      currentHp: 40,
      speed: 30,
      size: 'medium',
      weapons: [{
        name: 'Longsword',
        ability: 'str',
        proficient: true,
        damageDice: '1d8',
        damageType: 'slashing',
        magicalBonus: 1 // +1 Longsword
      }]
    },
    'goblin': {
      id: 'goblin',
      name: 'Goblin Scout',
      level: 1,
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      ac: { base: 15 },
      maxHp: 7,
      currentHp: 7,
      speed: 30,
      size: 'small',
      resistances: { resistant: ['poison'] }
    }
  },
  actorId: 'fighter',
  targetId: 'goblin',
  action: 'attack',
  payload: {
    weapon: {
      name: 'Longsword',
      ability: 'str',
      proficient: true,
      damageDice: '1d8',
      damageType: 'slashing',
      magicalBonus: 1
    },
    targetAC: 15,
    advantage: true, // DM granted advantage (high ground)
    cover: 'half' // Goblin behind barrel (+2 AC)
  }
});

// Result:
// {
//   type: 'attack',
//   hit: {
//     kind: 'hit',
//     critical: false,
//     roll: 18,
//     total: 24, // 18 + 3 (STR) + 3 (prof) + 1 (magic)
//     targetAC: 17, // 15 + 2 (half cover)
//     details: ['advantage', 'proficient']
//   },
//   damage: {
//     totalBeforeReduction: 6,
//     totalAfterReduction: 6,
//     breakdown: [{ type: 'slashing', amount: 6, adjusted: 6 }]
//   },
//   expended: { actionAvailable: false },
//   usedInspiration: false
// }
```

### B. Death Save Example

```typescript
const deathSaveResult = resolveAction({
  seed: 'combat-123-round-3-deathsave',
  encounter: { id: 'enc-1', round: 3 },
  actors: {
    'wizard': {
      id: 'wizard',
      name: 'Gandalf',
      level: 5,
      abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
      ac: { base: 12 },
      maxHp: 20,
      currentHp: 0,
      speed: 30,
      size: 'medium',
      conditions: {
        unconscious: true,
        deathSaves: { successes: 1, failures: 1 }
      }
    }
  },
  actorId: 'wizard',
  action: 'deathSave',
});

// Possible results:
// Natural 20: { successes: 2, stabilized: false, criticalSuccess: true }
// Natural 1: { failures: 3, dead: true, criticalFailure: true }
// 10-19: { successes: 2, failures: 1 }
// 2-9: { successes: 1, failures: 2 }
```

### C. Initiative Example

```typescript
const initiativeResult = resolveAction({
  seed: 'combat-456-init',
  encounter: { id: 'enc-456', round: 0 },
  actors: {
    'rogue': {
      id: 'rogue',
      name: 'Robin',
      level: 5,
      abilities: { str: 10, dex: 18, con: 12, int: 12, wis: 13, cha: 10 },
      ac: { base: 15 },
      maxHp: 30,
      currentHp: 30,
      speed: 30,
      size: 'medium'
    },
    'orc': {
      id: 'orc',
      name: 'Orc Warrior',
      level: 3,
      abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
      ac: { base: 13 },
      maxHp: 25,
      currentHp: 25,
      speed: 30,
      size: 'medium'
    }
  },
  action: 'initiative'
});

// Result:
// {
//   type: 'initiative',
//   order: [
//     { actorId: 'rogue', value: 22 }, // rolled 18, +4 DEX
//     { actorId: 'orc', value: 14 }    // rolled 13, +1 DEX
//   ]
// }
```
