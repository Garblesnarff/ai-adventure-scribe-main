# Dice Services

## Purpose
Dice rolling engine for D&D 5e mechanics including standard dice (d4, d6, d8, d10, d12, d20, d100), modifiers, advantage/disadvantage, and complex roll formulas. Provides deterministic, testable random number generation with audit trails.

## Key Files
- `DiceEngine.ts` - Core dice rolling engine with formula parsing and execution

## How It Works
The DiceEngine provides a comprehensive dice rolling system that follows D&D 5e rules:

**Formula Parsing**: Accepts standard dice notation (e.g., "2d6+3", "1d20", "4d8-2") and parses it into structured roll instructions. Supports complex formulas with multiple dice types, modifiers, and mathematical operations.

**Advantage/Disadvantage**: Implements D&D 5e advantage (roll twice, take higher) and disadvantage (roll twice, take lower) mechanics for d20 rolls. These are critical for skill checks, attack rolls, and saving throws.

**Roll Execution**: Generates cryptographically random results (or seeded results for testing) and maintains detailed roll history including individual die results, modifiers applied, and final totals. This transparency helps players understand outcomes and prevents disputes about rolls.

**Validation**: Validates roll formulas before execution to prevent invalid syntax or unsupported operations. Provides clear error messages for malformed formulas.

## Usage Examples
```typescript
// Roll a standard ability check
import { DiceEngine } from '@/services/dice/DiceEngine';

const engine = new DiceEngine();
const result = engine.roll('1d20+5');
console.log(result); // { total: 18, rolls: [13], modifier: 5, formula: '1d20+5' }

// Roll with advantage
const advantageRoll = engine.rollWithAdvantage('1d20+3');
console.log(advantageRoll); // { total: 21, rolls: [18, 12], modifier: 3, type: 'advantage' }

// Complex damage roll
const damageRoll = engine.roll('2d6+1d4+3');
console.log(damageRoll); // { total: 15, rolls: [4, 6, 2], modifier: 3 }

// Batch rolling (multiple attacks)
const attacks = engine.rollBatch([
  { formula: '1d20+7', purpose: 'Attack 1' },
  { formula: '1d20+7', purpose: 'Attack 2' }
]);
```

## Dependencies
- **crypto** - Secure random number generation
- **Dice formula parser** - Parses dice notation strings

## Related Documentation
- [Game Session](../../features/game-session/README.md)
- [Combat Services](../combat/README.md)
- [D&D 5e System Reference Document](https://dnd.wizards.com/resources/systems-reference-document)

## Maintenance Notes
- RNG uses crypto.randomInt for fairness and security
- Roll results are immutable once generated
- Seeded mode available for testing and replays
- All rolls should be validated server-side to prevent client manipulation
