export interface SpellValidationError {
  type:
    | 'INVALID_SPELL'
    | 'COUNT_MISMATCH'
    | 'ABILITY_REQUIREMENT'
    | 'RACIAL_RESTRICTION'
    | 'LEVEL_REQUIREMENT';
  message: string;
  spellId?: string;
  expected?: number;
  actual?: number;
}

export interface SpellValidationResult {
  valid: boolean;
  errors: SpellValidationError[];
  warnings: string[];
}

export interface SpellcastingInfo {
  cantripsKnown: number;
  spellsKnown?: number;
  spellsPrepared?: number;
  hasSpellbook?: boolean;
  isPactMagic?: boolean;
  ritualCasting?: boolean;
  spellcastingAbility: 'intelligence' | 'wisdom' | 'charisma';
}
