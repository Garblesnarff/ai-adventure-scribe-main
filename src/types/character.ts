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
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  damage?: string;
  ritual?: boolean;
  concentration?: boolean;
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
  spellcasting?: {
    ability: keyof AbilityScores;
    cantripsKnown: number;
    spellsKnown?: number;
    ritualCasting?: boolean;
    spellbook?: boolean;
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

export interface Character {
  id?: string;
  user_id?: string;
  name?: string;
  description?: string;
  race?: CharacterRace | null;
  subrace?: Subrace | null;
  class?: CharacterClass | null;
  level?: number;
  background?: CharacterBackground | null;
  abilityScores?: AbilityScores;
  experience?: number;
  alignment?: string;
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
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
  // Class Features
  classFeatures?: Record<string, any>;
  // New AI-generated fields
  image_url?: string;
  appearance?: string;
  personality_traits?: string;
  personality_notes?: string;
  backstory_elements?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to transform Character object for Supabase
export function transformCharacterForStorage(character: Character) {
  return {
    id: character.id,
    user_id: character.user_id || '',
    name: character.name || '',
    description: character.description || '',
    race: character.race?.name || '',
    subrace: character.subrace?.name || null,
    class: character.class?.name || '',
    level: character.level || 1,
    background: character.background?.name || null,
    alignment: character.alignment || '',
    experience_points: character.experience || 0,
    image_url: character.image_url || '',
    appearance: character.appearance || '',
    personality_traits: character.personality_traits || '',
    personality_notes: character.personality_notes || '',
    backstory_elements: character.backstory_elements || '',
    skill_proficiencies: (character.skillProficiencies || []).join(','),
    tool_proficiencies: (character.toolProficiencies || []).join(','),
    saving_throw_proficiencies: (character.savingThrowProficiencies || []).join(','),
    languages: (character.languages || []).join(','),
    cantrips: (character.cantrips || []).join(','),
    known_spells: (character.knownSpells || []).join(','),
    class_features: JSON.stringify(character.classFeatures || {}),
    updated_at: new Date().toISOString(),
  };
}
