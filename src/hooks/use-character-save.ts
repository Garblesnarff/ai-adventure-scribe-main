import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/character';
import { transformCharacterForStorage } from '@/types/character';
import { transformAbilityScoresForStorage, transformEquipmentForStorage } from '@/utils/characterTransformations';
import { useToast } from '@/components/ui/use-toast';

/**
 * Constant UUID for local users when no authentication is present
 * This follows the UUID v4 format required by Supabase
 */
const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Custom hook for handling character data persistence
 * Provides methods and state for saving character data to Supabase
 */
export const useCharacterSave = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  /**
   * Saves character data to Supabase
   * Handles both creation and updates of character data
   * @param character - The character data to save
   * @returns Promise<Character | null> The saved character data or null if save failed
   */
  const saveCharacter = async (character: Character): Promise<Character | null> => {
    if (!character) return null;

    try {
      setIsSaving(true);
      
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // Transform and save character data
      const characterData = transformCharacterForStorage({
        ...character,
        // Use authenticated user ID if available, otherwise use local UUID
        user_id: user?.id || LOCAL_USER_ID,
      });

      // For new characters, we need to insert first to get an ID
      if (!characterData.id) {
        const { data: newCharacter, error: insertError } = await supabase
          .from('characters')
          .insert(characterData)
          .select()
          .single();

        if (insertError) throw insertError;
        characterData.id = newCharacter.id;
      } else {
        // For existing characters, we can update
        const { error: updateError } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', characterData.id);

        if (updateError) throw updateError;
      }

      // Transform and save character stats
      const statsData = transformAbilityScoresForStorage(
        character.abilityScores,
        characterData.id
      );

      const { error: statsError } = await supabase
        .from('character_stats')
        .upsert(statsData, { 
          onConflict: 'character_id'
        });

      if (statsError) throw statsError;

      // Save equipment if present
      if (character.equipment.length > 0) {
        const equipmentData = transformEquipmentForStorage(
          character.equipment,
          characterData.id
        );

        const { error: equipmentError } = await supabase
          .from('character_equipment')
          .upsert(equipmentData, { 
            onConflict: 'character_id,item_name'
          });

        if (equipmentError) throw equipmentError;
      }

      // Return the complete character data
      return {
        ...character,
        id: characterData.id,
        user_id: characterData.user_id
      };
    } catch (error) {
      console.error('Error saving character:', error);
      toast({
        title: "Error",
        description: "Failed to save character. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveCharacter,
    isSaving
  };
};