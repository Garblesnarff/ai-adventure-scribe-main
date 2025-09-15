// SDK Imports
import { useState } from 'react';

// Project Imports
import { useToast } from '@/components/ui/use-toast'; // Assuming kebab-case
import { supabase } from '@/integrations/supabase/client';
import {
  transformAbilityScoresForStorage,
  transformEquipmentForStorage,
  transformMulticlassingForStorage
} from '@/utils/characterTransformations';

// Project Types
import { Character, transformCharacterForStorage } from '@/types/character';

// Services
import { characterBackgroundGenerator } from '@/services/character-background-generator';
import { useQueryClient } from '@tanstack/react-query';


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
  const queryClient = useQueryClient();

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
      const characterData = {
        ...transformCharacterForStorage({
          ...character,
          // Use authenticated user ID if available, otherwise use local UUID
          user_id: user?.id || LOCAL_USER_ID,
        }),
        ...transformMulticlassingForStorage(character)
      };

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
      const statsData = {
        ...transformAbilityScoresForStorage(
          character.abilityScores!,
          characterData.id
        )
      };

      const { error: statsError } = await supabase
        .from('character_stats')
        .upsert(statsData, {
          onConflict: 'character_id'
        });

      if (statsError) throw statsError;

      // Save equipment if present
      if (character.inventory && character.inventory.length > 0) {
        const equipmentData = transformEquipmentForStorage(
          character,
          characterData.id
        );

        const { error: equipmentError } = await supabase
          .from('character_equipment')
          .upsert(equipmentData, { 
            onConflict: 'character_id,item_name'
          });

        if (equipmentError) throw equipmentError;
      }

      // Create saved character object with ID
      const savedCharacter: Character = {
        ...character,
        id: characterData.id,
        user_id: characterData.user_id
      };

      // Generate background image asynchronously for new characters
      // Don't block character creation on image generation
      if (!character.id && characterData.id) {
        generateBackgroundImage(characterData.id, savedCharacter);
      }

      // Return the complete character data
      return savedCharacter;
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

  /**
   * Generate background image for the character
   * This runs asynchronously after character creation
   */
  const generateBackgroundImage = async (characterId: string, character: Character) => {
    try {
      console.log(`Generating background image for character ${characterId}`);

      // Generate the image with character portrait as reference if available
      const options: any = {};
      if (character.image_url) {
        options.referenceImageUrl = character.image_url;
        console.log(`Using character image as reference: ${character.image_url}`);
      }

      const imageUrl = await characterBackgroundGenerator.generateCharacterBackground(character, options);

      // Update the character with the generated image URL
      const { error } = await supabase
        .from('characters')
        .update({ background_image: imageUrl })
        .eq('id', characterId);

      if (error) {
        console.error('Error updating character with background image:', error);
        // Don't throw error - character creation should still succeed
      } else {
        console.log(`Successfully generated and saved background image for character ${characterId}`);

        // Invalidate characters query to refresh the list with the new image
        queryClient.invalidateQueries({ queryKey: ['characters'] });

        // Show success notification
        toast({
          title: "Character Background Generated",
          description: "Your character background image has been created successfully.",
        });
      }
    } catch (error) {
      console.error(`Failed to generate background image for character ${characterId}:`, error);

      // Show user-friendly error notification
      toast({
        title: "Background Image Generation Failed",
        description: "We couldn't generate a background image for your character, but your character was created successfully. You can add an image later.",
        variant: "destructive",
      });

      // Don't throw error - character creation should still succeed even if image generation fails
    }
  };

  return {
    saveCharacter,
    isSaving
  };
};
