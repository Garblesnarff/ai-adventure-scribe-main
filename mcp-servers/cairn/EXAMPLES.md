# Cairn MCP Server Examples

This document provides example usage scenarios for the Cairn MCP server.

## Example 1: Complete Combat Encounter

### Scenario
A character (STR 10, DEX 12, WIL 8, HP 4, Armor 1) is attacked by a bandit with a sword (1d8).

### Step 1: Resolve Attack

```json
{
  "tool": "resolve_attack",
  "arguments": {
    "weaponDice": "1d8",
    "impaired": false,
    "enhanced": false
  }
}
```

**Result:** Rolled 6 damage

### Step 2: Apply Damage

```json
{
  "tool": "apply_damage",
  "arguments": {
    "damage": 6,
    "armorValue": 1,
    "currentHp": 4
  }
}
```

**Result:**
- Raw damage: 6
- Armor reduction: 1
- Final damage: 5
- New HP: 0 (was 4)
- Critical damage triggered!
- Excess damage: 1

### Step 3: Resolve Critical Damage

```json
{
  "tool": "resolve_critical_damage",
  "arguments": {
    "excessDamage": 1,
    "currentStr": 10
  }
}
```

**Result:**
- STR: 10 → 9
- Save roll: 7 ≤ 9 (Success!)
- Scar roll: 23
- Scar: "Walloped" - Deprived until rest

**Outcome:** Character survives with 1 STR loss and a scar!

---

## Example 2: Saving Throw with Advantage

### Scenario
Character (DEX 14) tries to dodge a falling boulder with advantage.

```json
{
  "tool": "resolve_save",
  "arguments": {
    "ability": "dex",
    "abilityScore": 14,
    "advantage": true
  }
}
```

**Possible Results:**

**Success:**
```json
{
  "ability": "dex",
  "targetScore": 14,
  "roll": 8,
  "secondRoll": 15,
  "success": true,
  "message": "Success! Rolled 8 ≤ 14"
}
```

Character takes the lower roll (8) thanks to advantage!

---

## Example 3: Fatigue Management

### Scenario
Wizard casts multiple spells and gains fatigue (currently 7/10 slots used).

### Cast First Spell - Gains Fatigue

```json
{
  "tool": "add_fatigue",
  "arguments": {
    "currentSlots": 7,
    "maxSlots": 10
  }
}
```

**Result:**
- Fatigue added successfully
- Inventory: 8/10 slots

### Cast Second Spell - Gains Fatigue

```json
{
  "tool": "add_fatigue",
  "arguments": {
    "currentSlots": 8,
    "maxSlots": 10
  }
}
```

**Result:**
- Fatigue added successfully
- Inventory: 9/10 slots

### Cast Third Spell - Gains Fatigue

```json
{
  "tool": "add_fatigue",
  "arguments": {
    "currentSlots": 9,
    "maxSlots": 10
  }
}
```

**Result:**
- Fatigue added successfully
- Inventory: 10/10 slots (FULL!)

### Cast Fourth Spell - Inventory Full!

```json
{
  "tool": "add_fatigue",
  "arguments": {
    "currentSlots": 10,
    "maxSlots": 10
  }
}
```

**Result:**
```json
{
  "fatigueAdded": false,
  "inventorySlots": "10/10",
  "inventoryFull": true,
  "message": "Inventory is full! Cannot add fatigue. HP becomes 0!",
  "warning": "HP becomes 0 when fatigue cannot be added!"
}
```

**Outcome:** Character collapses from exhaustion!

---

## Example 4: Rest and Recovery

### Scenario
Character rests after combat (Current HP: 2, Max HP: 6, Fatigue: 3).

### Short Rest

```json
{
  "tool": "resolve_rest",
  "arguments": {
    "type": "short",
    "currentHp": 2,
    "maxHp": 6,
    "fatigueCount": 3
  }
}
```

**Result:**
```json
{
  "restType": "short",
  "hpRestored": 4,
  "newHp": 6,
  "fatigueRemoved": 0,
  "effects": ["HP restored to maximum"],
  "message": "Short rest complete. HP restored: 2 → 6"
}
```

**Note:** Fatigue remains! Need a long rest.

### Long Rest

```json
{
  "tool": "resolve_rest",
  "arguments": {
    "type": "long",
    "currentHp": 6,
    "maxHp": 6,
    "fatigueCount": 3
  }
}
```

**Result:**
```json
{
  "restType": "long",
  "hpRestored": 0,
  "newHp": 6,
  "fatigueRemoved": 3,
  "effects": [
    "HP restored to maximum",
    "All fatigue removed"
  ],
  "message": "Long rest complete. HP restored: 6 → 6. Removed 3 fatigue."
}
```

**Outcome:** Fully recovered!

---

## Example 5: Enhanced Attack (Advantage)

### Scenario
Rogue attacks from hiding with enhanced damage.

```json
{
  "tool": "resolve_attack",
  "arguments": {
    "weaponDice": "1d6",
    "enhanced": true
  }
}
```

**Result:**
```json
{
  "weaponDice": "1d6",
  "damage": 5,
  "rolls": [2, 5],
  "enhanced": true,
  "message": "Attack hits! Rolled 2, 5 = 5 damage"
}
```

Character takes the higher roll (5) thanks to enhanced condition!

---

## Example 6: Impaired Attack (Disadvantage)

### Scenario
Fighter attacks while blinded (impaired).

```json
{
  "tool": "resolve_attack",
  "arguments": {
    "weaponDice": "1d8",
    "impaired": true
  }
}
```

**Result:**
```json
{
  "weaponDice": "1d8",
  "damage": 3,
  "rolls": [3, 7],
  "impaired": true,
  "message": "Attack hits! Rolled 3, 7 = 3 damage"
}
```

Character must take the lower roll (3) due to impaired condition.

---

## Example 7: Using Resources

### Get All Weapons

```json
{
  "resource": "cairn://equipment/weapons"
}
```

**Returns:** Complete list of Cairn weapons with damage dice and properties.

### Get Scar Table

```json
{
  "resource": "cairn://scars"
}
```

**Returns:** d100 scar table with ranges, descriptions, and effects.

---

## Example 8: Using Prompts

### Combat Guide

```json
{
  "prompt": "cairn_combat",
  "arguments": {
    "situation": "Party ambushed by goblins in narrow corridor"
  }
}
```

**Returns:** Complete combat resolution guide with the specific situation context.

### Critical Damage Guide

```json
{
  "prompt": "critical_damage",
  "arguments": {
    "excess_damage": "5"
  }
}
```

**Returns:** Step-by-step critical damage resolution guide with the specific excess damage amount.

---

## Common Patterns

### Pattern 1: Full Attack Sequence

1. `resolve_attack` → get damage
2. `apply_damage` → check for critical
3. If critical: `resolve_critical_damage`
4. If survived: `roll_scar`

### Pattern 2: Spellcasting Consequences

1. Cast spell (narrative)
2. `add_fatigue` → track inventory
3. Repeat until inventory full or rest
4. `resolve_rest` (long) → clear fatigue

### Pattern 3: Challenging Obstacle

1. `resolve_save` → check success
2. If failed: `apply_damage` or narrative consequence
3. If critical: full combat sequence

---

## Tips for Using the MCP Server

1. **Always check for critical damage** after applying damage
2. **Track fatigue carefully** - it can quickly become deadly
3. **Use advantage/disadvantage** to reflect fictional positioning
4. **Natural 1 and 20** are automatic success/failure on saves
5. **Armor always reduces damage** before HP loss
6. **Long rests** are essential for removing fatigue
7. **Scars are permanent** - they accumulate over a campaign

---

## Integration Example

Here's how you might use the MCP server in a game flow:

```typescript
// 1. Player declares attack
const attack = await callTool("resolve_attack", {
  weaponDice: "1d8",
  enhanced: player.hasAdvantage
});

// 2. Apply to target
const damage = await callTool("apply_damage", {
  damage: attack.damage,
  armorValue: target.armor,
  currentHp: target.hp
});

// 3. Check for critical
if (damage.criticalDamage) {
  const critical = await callTool("resolve_critical_damage", {
    excessDamage: damage.excessDamage,
    currentStr: target.str
  });

  if (critical.dead) {
    // Handle death
  } else {
    // Apply scar
    target.scars.push(critical.scar);
  }
}

// 4. Update character state
target.hp = damage.newHp;
if (critical) target.str = critical.newStr;
```

This pattern ensures consistent rule application across your application!
