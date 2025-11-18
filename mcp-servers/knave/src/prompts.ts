/**
 * MCP Prompts for Knave RPG
 * Provides templates and guidance for common scenarios
 */

export interface MCPPrompt {
  name: string;
  description: string;
  content: string;
}

/**
 * Knave combat template prompt
 * Guides the user through a combat sequence
 */
export const KNAVE_COMBAT_PROMPT: MCPPrompt = {
  name: 'knave_combat',
  description: 'Template for running Knave combat encounters',
  content: `# Knave Combat Resolution

## Combat Flow
1. **Initiative**: Roll d20 + DEX modifier for all combatants
2. **Turn Order**: Highest initiative goes first
3. **Per Turn**: Each combatant takes 1 action and 1 movement
4. **Attacks**: Roll d20 + Level + Ability Modifier vs Target AC
5. **Damage**: Roll weapon damage dice on hit
6. **Repeat**: Continue until combat ends

## Attack Mechanics
- **Attack Roll**: d20 + Level + Ability Modifier (STR or DEX based on weapon)
- **Compare to AC**: 11 + Armor Bonus + DEX Modifier
- **Hit**: Roll damage using weapon's damage dice
- **Miss**: No damage dealt, action expended

## Saving Throws
- **Roll**: d20 + Level + Ability Modifier (determined by effect type)
- **Compare to DC**: Set by spell or ability
- **Success**: Reduce effect or avoid it
- **Failure**: Full effect applies

## Knave Rules References
- **AC Base**: 11 (no armor, average DEX)
- **HP**: 8 per level + (CON modifier × level), minimum 1 HP per level
- **Movement**: 30 feet per turn (typically)
- **Proficiency Bonus**: Equals character level
- **Ability Modifiers**: (Ability Score - 10) ÷ 2, rounded down

## Example Turn
1. Player A rolls initiative: d20 + 2 (DEX) = 14
2. Player B rolls initiative: d20 - 1 (DEX) = 10
3. Monster rolls initiative: d20 + 1 (DEX) = 12
4. Order: Player A → Monster → Player B

Player A attacks monster with longsword (d8):
- Roll: 15 + 3 (Level) + 2 (STR) = 20
- Monster AC: 11 + 2 (Armor) + 1 (DEX) = 14
- Hit! (20 ≥ 14)
- Damage: Roll 1d8 = 5

## Available Tools
- \`resolve_attack\`: Roll an attack and damage
- \`resolve_save\`: Roll a saving throw
- \`resolve_ability_check\`: Roll an ability check
- \`resolve_initiative\`: Determine turn order
- \`calculate_ac\`: Determine armor class
- \`calculate_hp\`: Determine maximum hit points
`,
};

/**
 * Equipment-based resolution prompt
 * Guides resolution of equipment-dependent checks
 */
export const EQUIPMENT_CHECK_PROMPT: MCPPrompt = {
  name: 'equipment_check',
  description: 'Guide for resolving equipment-based ability checks',
  content: `# Equipment-Based Ability Checks in Knave

## Knave Equipment Philosophy
In Knave, equipment directly affects character capabilities. Gear isn't just descriptive—it determines what your character can do.

## Equipment Categories

### Armor
- **Leather**: +1 AC, light and flexible
- **Studded Leather**: +2 AC, balanced protection
- **Chainmail**: +3 AC, heavy but durable
- **Plate**: +4 AC, maximum protection

### Weapons
Each weapon has:
- **Ability**: STR or DEX requirement
- **Damage Dice**: 1d4 (dagger), 1d6 (mace/spear), 1d8 (longsword), 1d12 (greatsword)
- **Properties**: light, two-handed, thrown, ranged, versatile

### Specialized Gear
- **Lockpicks**: Required for most lock-picking attempts
- **Rope**: Essential for climbing, securing, and rigging
- **Lantern**: Provides reliable light source
- **Tinderbox**: Needed to start fires in wet conditions

## Check Types

### Attack Checks
- **Attack Roll**: d20 + Level + (STR or DEX modifier based on weapon)
- **Compare to Target AC**
- **Hit**: Roll weapon damage
- **Equipment Impact**: Weapon choice determines damage dice

### Ability Checks
- **Basic Roll**: d20 + Ability Modifier
- **Equipment Advantage**: Some gear provides advantage or automatic success
  - Lockpicks: Allows lock-picking
  - Rope: Enables climbing
  - Torch/Lantern: Light source for dark areas

### Armor Class Calculation
- **Base**: 11 (unarmored)
- **Armor Bonus**: +1 to +4 depending on armor type
- **DEX Modifier**: (DEX - 10) ÷ 2
- **Example**: Studded leather + DEX 14 = 11 + 2 + 2 = 15

## Equipment Weight Considerations
- Each item has weight in pounds
- **Carrying Capacity**: Typically 10 + STR modifier × 5 pounds
- **Encumbrance**: Heavy loads may impose penalties

## Using Tools for Equipment
1. Use \`calculate_ac\` with armor and DEX for armor class
2. Use \`resolve_ability_check\` for equipment-dependent checks
3. Use \`resolve_attack\` when using weapons
4. Reference equipment tables for items and their properties

## Example Scenario: Picking a Lock
Player has lockpicks and wants to open a chest.
- Lockpicks present: Attempt possible
- Roll ability check: d20 + INT modifier
- DC depends on lock quality (8-15 typically)
- With equipment and proficiency: More likely to succeed

## Example Scenario: Climbing with Rope
Player wants to climb a wall with rope secured.
- Rope available: Attempt possible
- Roll ability check: d20 + STR modifier
- DC depends on difficulty (8-15 typically)
- Rope significantly improves chances vs. no rope
`,
};

/**
 * Get all available prompts
 */
export function getAllPrompts(): MCPPrompt[] {
  return [KNAVE_COMBAT_PROMPT, EQUIPMENT_CHECK_PROMPT];
}

/**
 * Get a prompt by name
 */
export function getPromptByName(name: string): MCPPrompt | undefined {
  const prompts = getAllPrompts();
  return prompts.find((p) => p.name === name);
}
