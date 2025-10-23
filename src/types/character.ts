/**
 * Represents a single ability score for a character (e.g., Strength, Dexterity).
 *
 * @property score - The base value of the ability, typically from 3 to 20.
 * @property modifier - The calculated modifier, derived from the score ((score - 10) / 2).
 * @property savingThrow - Whether the character is proficient in this ability's saving throw.
 */
export interface Ability {
  score: number;
  modifier: number;
  savingThrow: boolean;
}

/**
 * ABILITY_SCORES - The 6 core abilities in D&D
 *
 * WHY THESE EXIST:
 * - Determine what character is good at (Strength = melee, Intelligence = spells)
 * - Range 3-20 in D&D 5e (lower is worse, higher is better)
 * - Create character variety (barbarian high Strength, wizard high Intelligence)
 *
 * HOW CALCULATED:
 * - Players roll 4d6, drop lowest (standard method) - implemented in character creation
 * - Or use standard array: [15, 14, 13, 12, 10, 8]
 * - Race can modify scores (human +1 to all, half-elf +2 to two chosen)
 *
 * MODIFIERS:
 * - Modifier = (score - 10) / 2, rounded down
 * - Score 16 = modifier +3
 * - Score 8 = modifier -1
 * - Used in combat/skill checks (attach Modifier to each ability)
 *
 * STORAGE:
 * - Store base score (before race modifiers)
 * - Calculate final score = base + race modifier
 * - Store modifier separately for quick lookup in combat
 *
 * TODO: Currently not persisted to database
 * After v1 launch, add ability_scores table join
 */
export interface AbilityScores {
  strength: Ability;
  dexterity: Ability;
  constitution: Ability;
  intelligence: Ability;
  wisdom: Ability;
  charisma: Ability;
}

/**
 * CHARACTER_RACE - Available races player can choose
 *
 * BUSINESS LOGIC:
 * - Defines core character traits (speed, languages, abilities)
 * - D&D 5e official races + some homebrew (Dragonborn, Tiefling, etc)
 *
 * FIELDS:
 * - id: Used in database and character sheet lookups (string key)
 * - name: Displayed to player (Human, Elf, Dwarf, etc)
 * - traits: Special abilities (Extra Attack, Darkvision, etc) - FOR FUTURE
 * - subraces: Optional variants (e.g., High Elf vs Wood Elf)
 * - heightRange: [min, max] in inches - used to clamp physical step sliders
 * - weightRange: [min, max] in pounds - used to validate and suggest reasonable weight
 *
 * IF ADDING A NEW RACE:
 * 1. Add to src/data/races/newrace.ts
 * 2. Import in src/data/races/index.ts
 * 3. Add heightRange and weightRange (required)
 * 4. Test: Physical step slider should clamp to new range
 * 5. Test: Character save should work with new race
 *
 * NEVER:
 * - Remove race from list (existing characters reference it)
 * - Change race.id (it's a foreign key to character records)
 * - Change abilityScoreIncrease without updating game calculations
 */
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

/**
 * Represents a single spell that a character can learn or cast.
 *
 * BUSINESS LOGIC:
 * - Spells are a core mechanic for many classes, defining their power and utility.
 * - The availability and effects of spells are based on D&D 5e rules.
 */
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

/**
 * Represents a sub-race, a variation of a primary character race.
 *
 * BUSINESS LOGIC:
 * - Subraces provide additional customization and flavor, offering unique traits and abilities.
 * - For example, an Elf can be a High Elf or a Wood Elf, each with different bonuses.
 */
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

/**
 * Represents a specific feature or ability granted by a character's class.
 *
 * BUSINESS LOGIC:
 * - Class features are the primary way characters gain new abilities as they level up.
 * - Some features offer choices, allowing for further character customization.
 */
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

/**
 * Represents a character's chosen class (e.g., Fighter, Wizard).
 *
 * BUSINESS LOGIC:
 * - The class is the most significant choice a player makes, defining the character's role and abilities.
 * - It determines hit points, proficiencies, and access to features like spellcasting.
 */
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

/**
 * Represents a character's background, detailing their life before adventuring.
 *
 * BUSINESS LOGIC:
 * - Backgrounds provide skill proficiencies and roleplaying hooks.
 * - They help to flesh out a character's story and personality.
 */
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

/**
 * GENDER - Character presentation/pronouns
 *
 * VALUES:
 * - "male": For roleplay and character sheet presentation
 * - "female": For roleplay and character sheet presentation
 *
 * NOTES:
 * - Cosmetic only (no gameplay impact)
 * - Players choose for immersion/roleplay
 * - Used in flavor text if AI narrator implemented
 * - D&D 5e rules ignore gender (no mechanical difference)
 *
 * FUTURE: Consider non-binary option if players request
 */
export type Gender = 'male' | 'female';


/**
 * CHARACTER - Represents a player character in any state
 *
 * LIFECYCLE:
 * 1. Created: User enters name, race, class (minimal fields)
 * 2. Developed: User adds abilities, skills, equipment (optional fields)
 * 3. Saved: All fields persisted to database with user_id and timestamp
 * 4. Loaded: Retrieved from database when user plays or edits
 * 5. Deleted: Soft-deleted (record stays, is_deleted flag set)
 *
 * REQUIRED FIELDS (cannot save without):
 * - name: 1-50 characters, shown in character list
 * - race: CharacterRace object, determines traits and languages
 * - class: CharacterClass object, determines abilities and spells
 *
 * OPTIONAL FIELDS (nice to have):
 * - background: influences roleplay and skills
 * - physical attributes: cosmetic only, no game impact
 * - spells: depends on class (clerics can have spells, barbarians cannot)
 *
 * MONETIZATION:
 * - campaign_id: if set, character visible to campaign members
 * - if null, character private to owner
 * - Free tier: max 1 campaign per user
 * - Pro tier: unlimited campaigns
 *
 * DATABASE MAPPING:
 * - Stored in Supabase 'characters' table
 * - user_id: References auth.users (RLS enforces ownership)
 * - campaign_id: Nullable reference to campaigns table
 * - created_at: Auto-set by Supabase
 * - updated_at: Auto-updated by Supabase
 *
 * SECURITY:
 * - RLS policy: Users can only see their own characters
 * - RLS policy: Campaign members can see campaign's characters
 * - Never send user_id to frontend (derived from auth context)
 * - Never send JWT in character object
 */
export interface Character {
  id?: string;
  user_id?: string;
  campaign_id?: string | null;
  name?: string;
  gender?: Gender;
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
    // Vision and Stealth
    vision_types: JSON.stringify(character.visionTypes || []),
    obscurement: character.obscurement || 'clear',
    is_hidden: character.isHidden || false,
    stealth_check_bonus: character.stealthCheckBonus || 0,
    updated_at: new Date().toISOString(),
  };
}
