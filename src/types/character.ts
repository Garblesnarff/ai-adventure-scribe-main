/**
 * @file src/types/character.ts
 * @description Defines the core data structures for characters in the game.
 * This file contains all TypeScript interfaces and types related to a character's
 * abilities, class, race, background, and combat-related stats.
 *
 * @author Jules
 * @see CODE_STANDARDS.md For style and documentation guidelines.
 */

export interface Ability {
  score: number;
  modifier: number;
  savingThrow: boolean;
}

export interface AbilityScores {
  strength: Ability;
  dexterity: Ability;
  constitution: Ability;
  intelligence: Ability;
  wisdom: Ability;
  charisma: Ability;
}

export interface CharacterRace {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: Partial<Record<keyof AbilityScores, number>>;
  speed: number;
  traits: string[];
  languages: string[];
  subraces?: Subrace[];
  backgroundImage?: string;
  heightRange?: [number, number];
  weightRange?: [number, number];
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range_text: string;
  components: string;
  // Detailed component breakdown
  components_verbal?: boolean;
  components_somatic?: boolean;
  components_material?: boolean;
  material_components?: string;
  material_cost_gp?: number;
  material_consumed?: boolean;
  duration: string;
  description: string;
  higher_level_text?: string;
  damage?: string;
  ritual?: boolean;
  concentration?: boolean;
  // Preparation requirements
  is_prepared?: boolean;
  alwaysPrepared?: boolean; // For certain class features
  preparationRequirement?: string; // Special preparation requirements
  source_feature?: string;
}

export interface Subrace {
  id: string;
  name: string;
  description: string;
  abilityScoreIncrease: Partial<Record<keyof AbilityScores, number>>;
  traits: string[];
  speed?: number;
  languages?: string[];
  cantrips?: string[];
  spells?: string[]; // Racial spells gained at higher levels
  // Optional background image for UI cards
  backgroundImage?: string;
  bonusCantrip?: {
    source: 'any' | 'wizard' | 'cleric' | 'druid' | 'bard' | 'sorcerer' | 'warlock';
    count: number;
  }; // For High Elf wizard cantrip, etc.
  weaponProficiencies?: string[];
  armorProficiencies?: string[];
}

export interface ClassFeature {
  id: string;
  name: string;
  description: string;
  choices?: {
    name: string;
    options: string[];
    description?: string;
  };
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primaryAbility: keyof AbilityScores;
  savingThrowProficiencies: (keyof AbilityScores)[];
  skillChoices: string[];
  numSkillChoices: number;
  // Optional background image for class selection cards
  backgroundImage?: string;
  spellcasting?: {
    ability: keyof AbilityScores;
    cantripsKnown: number;
    spellsKnown?: number;
    ritualCasting?: boolean;
    spellbook?: boolean;
    pactMagic?: boolean;
  };
  classFeatures: ClassFeature[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies?: string[];
}

export interface CharacterBackground {
  id: string;
  name: string;
  description: string;
  skillProficiencies: string[];
  toolProficiencies: string[];
  languages: number;
  equipment: string[];
  feature: {
    name: string;
    description: string;
  };
  suggestedPersonalityTraits?: string[];
  suggestedIdeals?: string[];
  suggestedBonds?: string[];
  suggestedFlaws?: string[];
}

export type Condition =
  | 'Blinded'
  | 'Charmed'
  | 'Deafened'
  | 'Frightened'
  | 'Grappled'
  | 'Incapacitated'
  | 'Invisible'
  | 'Paralyzed'
  | 'Petrified'
  | 'Poisoned'
  | 'Prone'
  | 'Restrained'
  | 'Stunned'
  | 'Unconscious';

export interface Character {
  id?: string;
  user_id?: string;
  campaign_id?: string | null;
  name?: string;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  weight?: number;
  eyes?: string;
  skin?: string;
  hair?: string;
  description?: string;
  race?: CharacterRace | null;
  subrace?: Subrace | null;
  class?: CharacterClass | null;
  level?: number;
  background?: CharacterBackground | null;
  abilityScores?: AbilityScores;
  // Racial ability choices (e.g., Half-Elf chooses 2 abilities for +1)
  racialAbilityChoices?: {
    halfElf?: [string, string]; // Two abilities chosen for +1 bonus
    variantHuman?: [string, string]; // Two abilities chosen for +1 bonus
  };
  experience?: number;
  alignment?: string;
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  // Enhancement system integration
  enhancementSelections?: import('./enhancement-options').OptionSelection[];
  enhancementEffects?: {
    traits?: string[];
    skillBonus?: string[];
    abilityBonus?: Record<string, number>;
    languages?: string[];
    equipment?: string[];
    resistances?: string[];
    expertise?: string[];
  };
  // Inspiration System
  inspiration?: boolean;
  personalityNotes?: string;
  // Enhanced personality integration
  personalityIntegration?: {
    activeTraits: string[];
    inspirationTriggers: string[];
    lastInspiration?: string;
    inspirationHistory: Array<{
      date: string;
      trigger: string;
      source: 'trait' | 'ideal' | 'bond' | 'flaw' | 'dm';
      description: string;
    }>;
  };
  equipment?: string[];
  selectedEquipmentOptionIndex?: number; // Tracks which equipment option was selected (for UI feedback)
  skillProficiencies?: string[];
  toolProficiencies?: string[];
  savingThrowProficiencies?: (keyof AbilityScores)[];
  languages?: string[];
  remainingAbilityPoints?: number;
  // Spellcasting
  cantrips?: string[];
  knownSpells?: string[];
  preparedSpells?: string[];
  // Advanced Spellcasting Features
  metamagicOptions?: string[];
  sorceryPoints?: {
    maximum: number;
    current: number;
  };
  pactMagicSpells?: string[];
  pactSlots?: {
    maximum: number;
    current: number;
    level: number;
  };
  ritualSpells?: string[];
  // New: Spell slot management
  spellSlots?: Record<number, { max: number; current: number }>; // Levels 1-9
  activeConcentration?: string | null; // Currently concentrated spell name
  // Class Features
  classFeatures?: Record<string, any>;
  // Fighting Styles
  fightingStyles?: string[];
  // Feats
  feats?: string[];
  // Hit Points & Hit Dice
  hitPoints?: {
    maximum: number;
    current: number;
    temporary: number;
  };
  hitDice?: {
    total: number;
    remaining: number;
    type: string; // e.g., "d8", "d10"
  };
  // Death and Conditions
  // These fields are essential for implementing the core combat mechanics of D&D 5E.
  // The logic for managing these states will be handled by the RulesInterpreterAgent.
  deathSaves?: {
    successes: number;
    failures: number;
  };
  isDead?: boolean;
  activeConditions?: Condition[];
  exhaustionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  // Equipment & Inventory
  inventory?: Array<{
    itemId: string;
    quantity: number;
    equipped: boolean;
    // Magic item properties
    isMagic?: boolean;
    magicBonus?: number;
    magicProperties?: string[];
    requiresAttunement?: boolean;
    isAttuned?: boolean;
    attunementRequirements?: string;
    magicItemType?: 'weapon' | 'armor' | 'ring' | 'rod' | 'staff' | 'wand' | 'wondrous';
    magicItemRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
    magicEffects?: {
      // Combat bonuses
      attackBonus?: number;
      damageBonus?: number;
      acBonus?: number;
      saveBonus?: number;
      // Ability score bonuses
      abilityScoreBonus?: {
        ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
        bonus: number;
      };
      // Special effects
      specialProperties?: string[];
      // Spellcasting properties
      spellEffects?: {
        spellName: string;
        spellLevel?: number;
        charges?: number;
        maxCharges?: number;
        rechargeRate?: 'daily' | 'dawn' | 'dusk' | 'weekly' | 'monthly';
      }[];
    };
  }>;
  currency?: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
  armorClass?: number;
  equippedArmor?: string;
  equippedShield?: string;
  equippedWeapons?: string[];
  // Character Advancement & Multiclassing
  classLevels?: Array<{
    classId: string;
    className: string;
    level: number;
    hitDie: number;
    features: string[];
  }>;
  levelHistory?: Array<{
    level: number;
    classId: string;
    hitPointsGained: number;
    featuresGained: string[];
    date: string;
  }>;
  // Experience and Level
  totalLevel?: number;
  // Damage Resistances, Immunities, and Vulnerabilities
  damageResistances?: DamageType[];
  damageImmunities?: DamageType[];
  damageVulnerabilities?: DamageType[];
  // Vision and Stealth
  visionTypes?: VisionInfo[];
  obscurement?: ObscurementLevel;
  isHidden?: boolean;
  stealthCheckBonus?: number;
  // New AI-generated fields
  avatar_url?: string;
  image_url?: string;
  background_image?: string;
  theme?: string;
  appearance?: string;
  personality_traits?: string;
  personality_notes?: string;
  backstory_elements?: string;
  sessionNotes?: string;
  created_at?: string;
  updated_at?: string;
  // Character stats from character_stats table
  character_stats?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    max_hit_points?: number;
    current_hit_points?: number;
    armor_class?: number;
  };
}

// Helper function to transform Character object for Supabase
export function transformCharacterForStorage(character: Character) {
  return {
    id: character.id,
    user_id: character.user_id || '',
    campaign_id: character.campaign_id || null,
    name: character.name || '',
    description: character.description || '',
    race: character.race?.name || '',
    subrace: character.subrace?.name || null,
    class: character.class?.name || '',
    level: character.level || 1,
    background: character.background?.name || null,
    alignment: character.alignment || '',
    experience_points: character.experience || 0,
    avatar_url: character.avatar_url || '',
    image_url: character.image_url || '',
    background_image: character.background_image || '',
    theme: character.theme || '',
    appearance: character.appearance || '',
    personality_traits: character.personality_traits || '',
    personality_notes: character.personality_notes || '',
    backstory_elements: character.backstory_elements || '',
    session_notes: character.sessionNotes || '',
    skill_proficiencies: (character.skillProficiencies || []).join(','),
    tool_proficiencies: (character.toolProficiencies || []).join(','),
    saving_throw_proficiencies: (character.savingThrowProficiencies || []).join(','),
    languages: character.languages || [],
    cantrips: (character.cantrips || []).join(','),
    known_spells: (character.knownSpells || []).join(','),
    prepared_spells: (character.preparedSpells || []).join(','),
    ritual_spells: (character.ritualSpells || []).join(','),
    // New: Persist spell slots and concentration
    spell_slots: JSON.stringify(character.spellSlots || {}),
    active_concentration: character.activeConcentration || null,
    class_features: JSON.stringify(character.classFeatures || {}),
    // Fighting Styles
    fighting_styles: JSON.stringify(character.fightingStyles || []),
    copper_pieces: character.currency?.cp || 0,
    silver_pieces: character.currency?.sp || 0,
    electrum_pieces: character.currency?.ep || 0,
    gold_pieces: character.currency?.gp || 0,
    platinum_pieces: character.currency?.pp || 0,
    // Damage Resistances, Immunities, and Vulnerabilities
    damage_resistances: JSON.stringify(character.damageResistances || []),
    damage_immunities: JSON.stringify(character.damageImmunities || []),
    damage_vulnerabilities: JSON.stringify(character.damageVulnerabilities || []),
    // Death and Conditions
    death_saves: JSON.stringify(character.deathSaves || { successes: 0, failures: 0 }),
    active_conditions: JSON.stringify(character.activeConditions || []),
    exhaustion_level: character.exhaustionLevel || 0,
    // Vision and Stealth
    vision_types: JSON.stringify(character.visionTypes || []),
    obscurement: character.obscurement || 'clear',
    is_hidden: character.isHidden || false,
    stealth_check_bonus: character.stealthCheckBonus || 0,
    updated_at: new Date().toISOString(),
  };
}
