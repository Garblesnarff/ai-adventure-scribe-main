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
  skillProficiencies?: string[];
  toolProficiencies?: string[];
  savingThrowProficiencies?: (keyof AbilityScores)[];
  languages?: string[];
  remainingAbilityPoints?: number;
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
    updated_at: new Date().toISOString(),
  };
}
