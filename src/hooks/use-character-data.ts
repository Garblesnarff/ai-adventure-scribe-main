import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Character } from '@/types/character';
import { isValidUUID } from '@/utils/validation';

/**
 * Transforms database stats into Character ability scores format
 * @param statsData - Raw stats data from database
 * @returns Formatted ability scores object
 */
const transformAbilityScores = (statsData: any) => {
  if (!statsData) return null;
  
  return {
    strength: { 
      score: statsData.strength, 
      modifier: Math.floor((statsData.strength - 10) / 2), 
      savingThrow: false 
    },
    dexterity: { 
      score: statsData.dexterity, 
      modifier: Math.floor((statsData.dexterity - 10) / 2), 
      savingThrow: false 
    },
    constitution: { 
      score: statsData.constitution, 
      modifier: Math.floor((statsData.constitution - 10) / 2), 
      savingThrow: false 
    },
    intelligence: { 
      score: statsData.intelligence, 
      modifier: Math.floor((statsData.intelligence - 10) / 2), 
      savingThrow: false 
    },
    wisdom: { 
      score: statsData.wisdom, 
      modifier: Math.floor((statsData.wisdom - 10) / 2), 
      savingThrow: false 
    },
    charisma: { 
      score: statsData.charisma, 
      modifier: Math.floor((statsData.charisma - 10) / 2), 
      savingThrow: false 
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
  characterData: any, 
  statsData: any, 
  equipmentData: any
): Character => ({
  id: characterData.id,
  user_id: characterData.user_id,
  name: characterData.name,
  race: {
    id: 'stored',
    name: characterData.race,
    description: '',
    abilityScoreIncrease: {},
    speed: 30,
    traits: [],
    languages: []
  },
  class: {
    id: 'stored',
    name: characterData.class,
    description: '',
    hitDie: 8,
    primaryAbility: 'strength',
    savingThrowProficiencies: [],
    skillChoices: [],
    numSkillChoices: 2
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
      description: ''
    }
  },
  abilityScores: transformAbilityScores(statsData) || {
    strength: { score: 10, modifier: 0, savingThrow: false },
    dexterity: { score: 10, modifier: 0, savingThrow: false },
    constitution: { score: 10, modifier: 0, savingThrow: false },
    intelligence: { score: 10, modifier: 0, savingThrow: false },
    wisdom: { score: 10, modifier: 0, savingThrow: false },
    charisma: { score: 10, modifier: 0, savingThrow: false },
  },
  equipment: equipmentData?.map((item: any) => item.item_name) || [],
  experience: characterData.experience_points || 0,
  alignment: characterData.alignment || '',
  personalityTraits: [],
  ideals: [],
  bonds: [],
  flaws: []
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
        title: "Invalid Character",
        description: "The character ID is invalid. Redirecting to characters page.",
        variant: "destructive",
      });
      navigate('/characters');
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
      
      // Fetch basic character info
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .maybeSingle();

      if (characterError) throw characterError;
      
      if (!characterData) {
        toast({
          title: "Character Not Found",
          description: "The requested character could not be found. Redirecting to characters page.",
          variant: "destructive",
        });
        navigate('/characters');
        return;
      }

      // Fetch character stats
      const { data: statsData, error: statsError } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_id', characterId)
        .maybeSingle();

      if (statsError) throw statsError;

      // Fetch character equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('character_equipment')
        .select('*')
        .eq('character_id', characterId);

      if (equipmentError) throw equipmentError;

      // Transform and set character data
      const transformedCharacter = transformCharacterData(
        characterData,
        statsData,
        equipmentData
      );
      
      setCharacter(transformedCharacter);
    } catch (error) {
      console.error('Error fetching character:', error);
      toast({
        title: "Error",
        description: "Failed to load character data. Please try again.",
        variant: "destructive",
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