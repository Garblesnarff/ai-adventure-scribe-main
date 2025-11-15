/**
 * useCharacterData Hook
 *
 * This hook is responsible for fetching and managing detailed character data
 * from Supabase, including basic info, stats, and equipment. It also handles
 * validation of the character ID and navigation in case of errors or if the
 * character is not found.
 *
 * Main Hook:
 * - useCharacterData: Fetches and provides character data.
 *
 * Helper Functions (internal):
 * - transformAbilityScores: Formats raw stat data.
 * - transformCharacterData: Consolidates various DB records into a Character object.
 *
 * Key Dependencies:
 * - React (useState, useEffect)
 * - React Router (useNavigate)
 * - Supabase client (`@/integrations/supabase/client`)
 * - useToast hook (`@/hooks/use-toast`)
 * - Character type (`@/types/character`)
 * - isValidUUID utility (`@/utils/validation`)
 *
 * @author AI Dungeon Master Team
 */

// SDK Imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Project Imports
import { logger } from '../lib/logger';

import type { Character, AbilityScores } from '@/types/character';

import { useToast } from '@/hooks/use-toast'; // Assuming kebab-case from previous steps
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/utils/validation'; // Assuming kebab-case

// Project Types

// Helper Functions (defined in-file)
interface CharacterStatsRow {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface CharacterEquipmentRow {
  id: string;
  item_name: string;
  quantity?: number;
  equipped?: boolean;
  is_magic?: boolean;
  magic_bonus?: number;
  magic_properties?: string | null;
  requires_attunement?: boolean;
  is_attuned?: boolean;
  attunement_requirements?: string | null;
  magic_item_type?: string;
  magic_item_rarity?: string;
  magic_effects?: string | null;
}

interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  race: string;
  class: string;
  level: number;
  background?: string | null;
  experience_points?: number | null;
  alignment?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
  background_image?: string | null;
  appearance?: string | null;
  personality_traits?: string | null;
  backstory_elements?: string | null;
  vision_types?: string | null;
  obscurement?: string | null;
  is_hidden?: boolean | null;
  stealth_check_bonus?: number | null;
  cantrips?: string | null;
  known_spells?: string | null;
  prepared_spells?: string | null;
  ritual_spells?: string | null;
}
/**
 * Transforms database stats into Character ability scores format
 * @param statsData - Raw stats data from database
 * @returns Formatted ability scores object
 */
const transformAbilityScores = (
  statsData: CharacterStatsRow | null | undefined,
): AbilityScores | null => {
  if (!statsData) return null;

  return {
    strength: {
      score: statsData.strength,
      modifier: Math.floor((statsData.strength - 10) / 2),
      savingThrow: false,
    },
    dexterity: {
      score: statsData.dexterity,
      modifier: Math.floor((statsData.dexterity - 10) / 2),
      savingThrow: false,
    },
    constitution: {
      score: statsData.constitution,
      modifier: Math.floor((statsData.constitution - 10) / 2),
      savingThrow: false,
    },
    intelligence: {
      score: statsData.intelligence,
      modifier: Math.floor((statsData.intelligence - 10) / 2),
      savingThrow: false,
    },
    wisdom: {
      score: statsData.wisdom,
      modifier: Math.floor((statsData.wisdom - 10) / 2),
      savingThrow: false,
    },
    charisma: {
      score: statsData.charisma,
      modifier: Math.floor((statsData.charisma - 10) / 2),
      savingThrow: false,
    },
  };
};

/**
 * Transforms database character data into Character type
 * @param characterData - Raw character data from database
 * @param statsData - Raw stats data from database
 * @param equipmentData - Raw equipment data from database
 * @returns Transformed Character object
 */
const transformCharacterData = (
  characterData: CharacterRow,
  statsData: CharacterStatsRow | null,
  equipmentData: CharacterEquipmentRow[] | null,
): Character => ({
  id: characterData.id,
  user_id: characterData.user_id,
  name: characterData.name,
  description: characterData.description,
  race: {
    id: 'stored',
    name: characterData.race,
    description: '',
    abilityScoreIncrease: {},
    speed: 30,
    traits: [],
    languages: [],
  },
  class: {
    id: 'stored',
    name: characterData.class,
    description: '',
    hitDie: 8,
    primaryAbility: 'strength',
    savingThrowProficiencies: [],
    skillChoices: [],
    numSkillChoices: 2,
    classFeatures: [],
    armorProficiencies: [],
    weaponProficiencies: [],
  },
  level: characterData.level,
  background: {
    id: 'stored',
    name: characterData.background || '',
    description: '',
    skillProficiencies: [],
    toolProficiencies: [],
    languages: 0,
    equipment: [],
    feature: {
      name: '',
      description: '',
    },
  },
  abilityScores: transformAbilityScores(statsData) || {
    strength: { score: 10, modifier: 0, savingThrow: false },
    dexterity: { score: 10, modifier: 0, savingThrow: false },
    constitution: { score: 10, modifier: 0, savingThrow: false },
    intelligence: { score: 10, modifier: 0, savingThrow: false },
    wisdom: { score: 10, modifier: 0, savingThrow: false },
    charisma: { score: 10, modifier: 0, savingThrow: false },
  },
  equipment: equipmentData?.map((item) => item.item_name) || [],
  experience: characterData.experience_points || 0,
  alignment: characterData.alignment || '',
  // Vision and Stealth
  visionTypes: characterData.vision_types ? JSON.parse(characterData.vision_types) : [],
  obscurement: characterData.obscurement || 'clear',
  isHidden: characterData.is_hidden || false,
  stealthCheckBonus: characterData.stealth_check_bonus || 0,
  // Magic Items
  inventory:
    equipmentData?.map((item) => ({
      itemId: item.id,
      quantity: item.quantity || 1,
      equipped: item.equipped || false,
      // Magic item properties
      isMagic: item.is_magic || false,
      magicBonus: item.magic_bonus || 0,
      magicProperties: item.magic_properties ? JSON.parse(item.magic_properties) : [],
      requiresAttunement: item.requires_attunement || false,
      isAttuned: item.is_attuned || false,
      attunementRequirements: item.attunement_requirements || '',
      magicItemType: item.magic_item_type || '',
      magicItemRarity: item.magic_item_rarity || 'common',
      magicEffects: item.magic_effects ? JSON.parse(item.magic_effects) : {},
    })) || [],
  // AI-generated fields
  avatar_url: characterData.avatar_url,
  image_url: characterData.image_url,
  appearance: characterData.appearance,
  personality_traits: characterData.personality_traits,
  backstory_elements: characterData.backstory_elements,
  background_image: characterData.background_image || undefined,
  // Legacy fields
  personalityTraits: [],
  ideals: [],
  bonds: [],
  flaws: [],
  // Spell data - this was missing!
  cantrips: characterData.cantrips
    ? characterData.cantrips
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    : [],
  knownSpells: characterData.known_spells
    ? characterData.known_spells
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    : [],
  preparedSpells: characterData.prepared_spells
    ? characterData.prepared_spells
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    : [],
  ritualSpells: characterData.ritual_spells
    ? characterData.ritual_spells
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    : [],
});

/**
 * Custom hook for fetching and managing character data
 * Handles data fetching, error states, and loading states
 * @param characterId - UUID of the character to fetch
 * @returns Object containing character data, loading state, and refetch function
 */
export const useCharacterData = (characterId: string | undefined) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Validates character ID and handles invalid cases
   * @param id - Character ID to validate
   * @returns Boolean indicating if ID is valid
   */
  const validateCharacterId = (id: string | undefined): boolean => {
    if (!id || !isValidUUID(id)) {
      toast({
        title: 'Invalid Character',
        description: 'The character ID is invalid. Redirecting to characters page.',
        variant: 'destructive',
      });
      navigate('/app/characters');
      return false;
    }
    return true;
  };

  /**
   * Fetches character data from Supabase
   * Includes basic info, stats, and equipment
   */
  const fetchCharacter = async () => {
    if (!validateCharacterId(characterId)) return;

    try {
      setLoading(true);

      // Get the current user session for ownership check
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not Authenticated',
          description: 'Please log in to view your characters.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      // Fetch basic character info WITH ownership check
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select(
          `
          *,
          character_stats(*)
        `,
        )
        .eq('id', characterId!)
        .eq('user_id', session.user.id) // CRITICAL: Add ownership check
        .maybeSingle();

      if (characterError) throw characterError;

      if (!characterData) {
        toast({
          title: 'Character Not Found',
          description:
            'The requested character could not be found. Redirecting to characters page.',
          variant: 'destructive',
        });
        navigate('/app/characters');
        return;
      }

      // Extract character data and stats
      const characterRecord = Array.isArray(characterData) ? characterData[0] : characterData;
      const statsData = Array.isArray(characterRecord.character_stats)
        ? characterRecord.character_stats[0]
        : characterRecord.character_stats;

      // Fetch character equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('character_equipment')
        .select('*')
        .eq('character_id', characterId!);

      if (equipmentError) throw equipmentError;

      // Transform and set character data
      const transformedCharacter = transformCharacterData(
        characterRecord as CharacterRow,
        statsData as CharacterStatsRow | null,
        equipmentData as CharacterEquipmentRow[] | null,
      );

      setCharacter(transformedCharacter);
    } catch (error) {
      logger.error('Error fetching character:', error);
      toast({
        title: 'Error',
        description: 'Failed to load character data. Please try again.',
        variant: 'destructive',
      });
      navigate('/characters');
    } finally {
      setLoading(false);
    }
  };

  // Fetch character data on mount or when characterId changes
  useEffect(() => {
    fetchCharacter();
  }, [characterId, navigate, toast]);

  return { character, loading, refetch: fetchCharacter };
};
