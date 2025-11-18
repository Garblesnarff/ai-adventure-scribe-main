# Cairn RPG Rules Engine - Mechanics Reference

## Overview
This implementation provides a complete Cairn RPG rules engine that matches the interface of the D&D 5E rules engine, with full support for Cairn's unique mechanics.

## Key Differences from D&D 5E

| Mechanic | D&D 5E | Cairn |
|----------|--------|-------|
| **Abilities** | 6 (STR, DEX, CON, INT, WIS, CHA) | 3 (STR, DEX, WIL) |
| **Saves** | d20 + modifier ≥ DC | d20 ≤ ability score |
| **Auto Success/Fail** | Natural 20/1 on attacks | Natural 1 always succeeds, 20 always fails (saves) |
| **Proficiency** | Bonus from level (+2 to +6) | None |
| **HP Meaning** | Health/vitality | Hit Protection (luck/resilience) |
| **Armor** | AC (target number) | Damage reduction (1-3) |
| **Attack Resolution** | d20 + mods vs AC | All attacks hit, roll damage |
| **Critical Hits** | Natural 20, double dice | N/A (all attacks hit) |
| **Critical Damage** | N/A | When HP < 0: lose STR, save or die |
| **Death** | 3 failed death saves | STR = 0 (immediate) |
| **Spell Slots** | Limited by level | None (spellcasting adds fatigue) |
| **Inventory** | Weight-based (optional) | 10 slots (strict) |
| **Fatigue** | Exhaustion (6 levels) | Occupies inventory slots |

## Implemented Mechanics

### 1. Ability Scores (3 abilities)
- **STR (Strength)**: Physical power, melee damage resistance
- **DEX (Dexterity)**: Agility, reflexes, ranged attacks
- **WIL (Willpower)**: Mental fortitude, magic, persuasion

### 2. Saving Throws (Roll-Under)
- Roll d20 ≤ ability score
- Natural 1 = always success
- Natural 20 = always fail
- Advantage: roll 2d20, take lower (better for roll-under)
- Disadvantage: roll 2d20, take higher (worse for roll-under)

### 3. Combat System
- **All attacks hit** - no attack roll needed
- Roll weapon damage (e.g., 1d6, 1d8, 1d10)
- Subtract armor value from damage
- Apply remaining damage to HP
- **Impaired**: Roll damage twice, take lower
- **Enhanced**: Roll damage twice, take higher

### 4. Hit Protection (HP)
- Represents luck and resilience, NOT health
- When HP = 0: character is vulnerable but not injured
- When HP < 0: Critical Damage occurs

### 5. Critical Damage
Triggered when damage reduces HP below 0:
1. Excess damage is subtracted from STR
2. Must make STR save (d20 ≤ STR)
3. **If save fails**: Character dies
4. **If save succeeds**: Roll on Scar Table (d100)

### 6. Scars System
When critical damage save succeeds, roll d100 for permanent injury:
- 1-10: Lasting Scar (cosmetic)
- 11-20: Rattling Blow (deprived until rest)
- 21-30: Walloped (deprived until rest)
- 31-40: Broken Limb (can't use limb)
- 41-50: Diseased (deprived until cured)
- 51-60: Head Wound (deprived until rest)
- 61-70: Hamstrung (movement halved)
- 71-80: Deafened (can't hear)
- 81-90: Disarmed (weapon knocked away)
- 91-100: Knocked Out (unconscious 1d4 hours)

### 7. Death
Character dies when:
- STR reduced to 0
- Failed STR save during Critical Damage

### 8. Inventory System
- **10 slots** maximum (typically)
- Each item occupies 1+ slots
- Armor typically: 1-3 slots
- Weapons typically: 1-2 slots
- **Fatigue** occupies 1 slot per fatigue
- **Full inventory** = HP becomes 0

### 9. Fatigue
- Gained from:
  - Casting spells (after first casting per day)
  - Lack of food/water/rest (deprived)
  - Special abilities
- Each fatigue occupies 1 inventory slot
- If inventory full, HP becomes 0
- **Removed by**: Full rest (long rest)

### 10. Spellcasting
- No spell slots (unlimited casts)
- First casting of a spell per day: free
- Subsequent castings: gain 1 fatigue
- Spellbooks occupy inventory slots

### 11. Rest
- **Short Rest**: Restores HP to maximum
- **Long Rest (Full Rest)**: Restores HP + removes ALL fatigue

### 12. Initiative
- Roll d20 + small DEX tiebreaker
- Highest goes first
- (Can also be handled narratively)

## Action Types

The Cairn rules engine supports these action types:

1. **save** - Roll a saving throw (STR, DEX, or WIL)
2. **attack** - Resolve an attack (always hits, rolls damage)
3. **damage** - Apply damage to an actor (checks for critical damage)
4. **criticalDamage** - Resolve critical damage when HP < 0
5. **initiative** - Roll initiative for all actors
6. **rest** - Perform short or long rest
7. **castSpell** - Cast a spell (adds fatigue if needed)
8. **addFatigue** - Add fatigue to inventory
9. **death** - Handle character death

## Deterministic RNG

Like the D&D 5E engine, the Cairn engine uses:
- Mulberry32 PRNG for deterministic randomness
- Seed-based generation for reproducible results
- Same seed = same outcome (perfect for testing and replays)

## Usage Example

```typescript
import { resolveAction } from './rules-engine.js';

const warrior: CairnActor = {
  id: 'char-1',
  name: 'Bjorn',
  abilities: { str: 14, dex: 12, wil: 10 },
  maxHp: 6,
  currentHp: 6,
  armor: { name: 'Brigandine', value: 2, slots: 2 },
  // ... etc
};

// Resolve a STR save
const saveResult = resolveAction({
  seed: 'test-123',
  encounter: { id: 'enc-1', round: 1 },
  actors: { [warrior.id]: warrior },
  actorId: warrior.id,
  action: 'save',
  payload: { ability: 'str' }
});

// Result: { type: 'save', success: true/false, roll: 15, target: 14, ... }
```

## File Structure

```
server/src/rules/cairn/
├── state.ts          - Type definitions for Cairn actors, encounters, outcomes
├── dice.ts           - Dice rolling utilities (d20, damage, saves)
├── actions.ts        - Core rule implementations (saves, attacks, critical damage)
├── rules-engine.ts   - Main entry point with resolveAction()
├── index.ts          - Exports for external use
├── example.ts        - Usage examples
└── MECHANICS.md      - This file
```

## Comparison: D&D 5E vs Cairn Combat

### D&D 5E Combat Flow:
1. Roll initiative (d20 + DEX mod)
2. On your turn: Roll attack (d20 + mods vs AC)
3. If hit: Roll damage
4. If crit (nat 20): Double damage dice
5. Apply damage to HP
6. At 0 HP: Make death saves

### Cairn Combat Flow:
1. Roll initiative (d20 + DEX tiebreaker) [or narrative]
2. On your turn: Attacks always hit
3. Roll weapon damage (impaired/enhanced affects this)
4. Subtract armor from damage
5. Apply to HP
6. If HP < 0: Critical Damage (lose STR, save or die)
7. If STR = 0: Death

## Design Philosophy

Cairn emphasizes:
- **Simplicity**: Fewer stats, no proficiency bonus
- **Deadliness**: Combat is dangerous, death is quick
- **Resource management**: Inventory slots matter
- **Risk/reward**: HP is resilience, not health
- **Fiction-first**: Rules support narrative, not replace it

This implementation stays true to these principles while providing a robust, testable, deterministic rules engine.
